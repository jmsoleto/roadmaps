/**
 * Storage seam for Decisions (design decision D1).
 *
 * Its own store, in IndexedDB, and Roadmaps does not move. The argument is not
 * capacity — decisions in plain text would fit in `localStorage` many times
 * over — it is **quota isolation**. `LocalStorageBackend.save` swallows a
 * `QuotaExceededError` into a `console.error`, so filling that quota would stop
 * Roadmaps autosaving with no visible sign. IndexedDB has its own quota, so no
 * amount of decisions can reach Roadmaps' data.
 *
 * IndexedDB from the start, even though this change stores no images yet: if
 * decisions began in `localStorage`, the attachments change would have to
 * migrate real decisions the user had already created — precisely the
 * irreversible migration this project keeps refusing to take on. The store is
 * chosen for where it ends up, not where it starts.
 *
 * The interface deliberately does **not** reuse `store/storage.ts`: that seam
 * returns `T | null`, where `null` means "empty", and here empty and
 * *unavailable* have to be different answers.
 */

import type { DecisionsData } from './model/types';

/**
 * The three ways a load can end.
 *
 * `unavailable` exists because arriving on an empty list over a store that
 * actually holds data invites writing over it, and there is no server to
 * recover from. See `local-persistence`.
 */
export type LoadOutcome =
  | { kind: 'loaded'; data: DecisionsData }
  | { kind: 'empty' }
  | { kind: 'unavailable'; reason: string };

export interface DecisionsBackend {
  load(): Promise<LoadOutcome>;
  save(data: DecisionsData): Promise<void>;
}

const DB_NAME = 'tech-lead-hub';
const DB_VERSION = 1;
const STORE = 'decisions';
/** Single record holding the whole app state, as Roadmaps does with its key. */
const DOC_KEY = 'doc:v1';

/** Promisify one IndexedDB request. */
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

/**
 * Open the database, creating its object store on first run or version bump.
 *
 * `onblocked` fires when another tab holds an older version open. It is
 * reported rather than waited out: a tab that never closes would hang the app
 * forever, and saying so is more useful than a spinner.
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('este navegador no ofrece IndexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('no se pudo abrir la base de datos'));
    req.onblocked = () =>
      reject(new Error('otra pestaña tiene abierta una versión anterior de los datos'));
  });
}

/** The Decisions store: one IndexedDB record with the whole document. */
export class IndexedDbBackend implements DecisionsBackend {
  private db: IDBDatabase | null = null;

  /**
   * `open` is injectable so the failure path can be exercised without breaking
   * a real database — the one path that must never be discovered in production.
   */
  constructor(private readonly open: () => Promise<IDBDatabase> = openDatabase) {}

  private async db_(): Promise<IDBDatabase> {
    if (this.db === null) this.db = await this.open();
    return this.db;
  }

  async load(): Promise<LoadOutcome> {
    let raw: unknown;
    try {
      const db = await this.db_();
      const tx = db.transaction(STORE, 'readonly');
      raw = await request(tx.objectStore(STORE).get(DOC_KEY));
    } catch (e) {
      return { kind: 'unavailable', reason: e instanceof Error ? e.message : String(e) };
    }

    if (raw === undefined || raw === null) return { kind: 'empty' };
    // A record that is there but unreadable is *not* unavailable: the store
    // opened fine. Treating it as empty matches what Roadmaps does with a
    // malformed document, and keeps the app usable.
    if (typeof raw !== 'object' || !Array.isArray((raw as DecisionsData).decisions)) {
      return { kind: 'empty' };
    }
    return { kind: 'loaded', data: raw as DecisionsData };
  }

  async save(data: DecisionsData): Promise<void> {
    const db = await this.db_();
    const tx = db.transaction(STORE, 'readwrite');
    // One record with the whole document, so a save is all or nothing: a later
    // read sees the previous state or the new one, never a mix.
    const put = request(tx.objectStore(STORE).put(structuredClone(data), DOC_KEY));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('no se pudieron guardar las decisiones'));
      tx.onabort = () => reject(tx.error ?? new Error('el guardado se canceló'));
    });
    await put;
  }
}

export function createDecisionsBackend(): DecisionsBackend {
  return new IndexedDbBackend();
}
