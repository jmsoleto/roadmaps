/**
 * Which folder each application is connected to, remembered between sessions
 * (carpeta-roadmaps, D5).
 *
 * Two records, for two different questions:
 *
 * - **The handle**, in IndexedDB, because a folder handle survives only by
 *   structured clone and cannot be written as text. It lives in a database of
 *   its own, `tech-lead-hub-folders`, and not in the shared `tech-lead-hub`:
 *   Roadmaps has never depended on that database, and bringing it into its boot
 *   would bring along its failure modes (blocked by a tab on an older version,
 *   no answer at all) and force a version bump just to hold a few handles.
 * - **That there is one**, in `localStorage`, with the folder's name. The boot
 *   needs this answer before mounting anything, and `localStorage` is the one
 *   store that answers synchronously. Without it, deciding whether to wait for
 *   an application would mean waiting for IndexedDB first, which is exactly
 *   what must not hold up the boot.
 *
 * Knows no application: everything is keyed by the id the caller passes.
 */

import type { FolderDir } from './fs';

const DB_NAME = 'tech-lead-hub-folders';
const DB_VERSION = 1;
const STORE = 'handles';
const OPEN_TIMEOUT_MS = 5000;

const FLAG = (appId: string) => `tech-lead-hub:folder:${appId}`;

/**
 * How the connected folder is named to the user (`repo/roadmaps`), or `null`
 * when the application is not connected. Synchronous.
 */
export function connectedName(appId: string): string | null {
  try {
    return localStorage.getItem(FLAG(appId));
  } catch {
    return null;
  }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('este navegador no ofrece IndexedDB'));
      return;
    }
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new Error('el registro de carpetas no responde'))),
      OPEN_TIMEOUT_MS,
    );
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => finish(() => resolve(req.result));
    req.onerror = () => finish(() => reject(req.error ?? new Error('no se pudo abrir')));
    req.onblocked = () => finish(() => reject(new Error('el registro de carpetas está bloqueado')));
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error ?? new Error('registro de carpetas'));
      tx.onabort = () => reject(tx.error ?? new Error('registro de carpetas'));
    });
  } finally {
    db.close();
  }
}

/** The handle an application was connected to, or `null`. */
export async function loadHandle(appId: string): Promise<FolderDir | null> {
  return ((await run('readonly', (s) => s.get(appId))) as FolderDir | undefined) ?? null;
}

/**
 * Remember the folder an application is connected to.
 *
 * The handle first and the flag after: a flag without a handle would make the
 * boot wait for a connection it cannot restore, while a handle without a flag
 * is merely ignored.
 */
export async function saveHandle(appId: string, dir: FolderDir, label = dir.name): Promise<void> {
  await run('readwrite', (s) => s.put(dir, appId));
  localStorage.setItem(FLAG(appId), label);
}

/** Forget the connection. The flag first, so a failure halfway leaves the application disconnected. */
export async function forgetHandle(appId: string): Promise<void> {
  try {
    localStorage.removeItem(FLAG(appId));
  } catch {
    // Nothing to forget.
  }
  await run('readwrite', (s) => s.delete(appId));
}
