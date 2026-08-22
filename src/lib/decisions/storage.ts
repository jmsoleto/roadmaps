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
  /** Store one attachment's bytes under its own key. */
  putBlob(id: string, blob: Blob): Promise<void>;
  getBlob(id: string): Promise<Blob | null>;
  deleteBlobs(ids: string[]): Promise<void>;
  /** Every attachment key currently held, for the orphan sweep. */
  blobKeys(): Promise<string[]>;
}

const DB_NAME = 'tech-lead-hub';
/** v2 added the attachment store. */
const DB_VERSION = 2;
const STORE = 'decisions';
/**
 * Attachment bytes, one record per attachment, apart from the document.
 *
 * The document is rewritten whole on every save, so bytes living inside it
 * would mean re-serialising every image on every keystroke (D1). Here each blob
 * is written once and never touched again.
 */
const BLOBS = 'attachments';
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
 * How long to wait for the open request to say anything at all.
 *
 * `onblocked` covers the case IndexedDB reports — another connection holding an
 * older version. It does **not** cover the one where the request simply never
 * fires any event, which a wedged database really does: no success, no error,
 * no blocked, forever.
 *
 * Without a bound there, `bootstrap` never resolves and **nothing mounts** —
 * the hub and Roadmaps included, even though neither has anything to do with
 * this store. `local-persistence` promises the opposite, so the wait has an end.
 */
const OPEN_TIMEOUT_MS = 5000;

/**
 * Open the database, creating its object stores on first run or version bump.
 *
 * Every failure resolves to a rejection rather than a wait: a tab that never
 * closes, or a database that never answers, would otherwise hang the whole
 * application, and saying so is more useful than a spinner.
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('este navegador no ofrece IndexedDB'));
      return;
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(
      () =>
        finish(() =>
          reject(
            new Error(
              'la base de datos no responde; puede haber otra pestaña con una versión anterior abierta',
            ),
          ),
        ),
      OPEN_TIMEOUT_MS,
    );

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
    };
    req.onsuccess = () => finish(() => resolve(req.result));
    req.onerror = () =>
      finish(() => reject(req.error ?? new Error('no se pudo abrir la base de datos')));
    req.onblocked = () =>
      finish(() =>
        reject(new Error('otra pestaña tiene abierta una versión anterior de los datos')),
      );
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

  async putBlob(id: string, blob: Blob): Promise<void> {
    const db = await this.db_();
    const tx = db.transaction(BLOBS, 'readwrite');
    tx.objectStore(BLOBS).put(blob, id);
    await this.settled(tx, 'no se pudo guardar el adjunto');
  }

  async getBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.db_();
      const tx = db.transaction(BLOBS, 'readonly');
      const out = await request(tx.objectStore(BLOBS).get(id));
      return out instanceof Blob ? out : null;
    } catch {
      // A missing blob is a declared absence, not a failure of the app: an
      // imported decision has fiches whose bytes live on another machine.
      return null;
    }
  }

  async deleteBlobs(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await this.db_();
    const tx = db.transaction(BLOBS, 'readwrite');
    for (const id of ids) tx.objectStore(BLOBS).delete(id);
    await this.settled(tx, 'no se pudieron borrar los adjuntos');
  }

  async blobKeys(): Promise<string[]> {
    const db = await this.db_();
    const tx = db.transaction(BLOBS, 'readonly');
    const keys = await request(tx.objectStore(BLOBS).getAllKeys());
    return keys.map(String);
  }

  /** Resolve when a transaction finishes, reject when it does not. */
  private settled(tx: IDBTransaction, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error(message));
      tx.onabort = () => reject(tx.error ?? new Error(message));
    });
  }
}

export function createDecisionsBackend(): DecisionsBackend {
  return new IndexedDbBackend();
}
