/**
 * Storage seam for Decisions (design decision D1).
 *
 * Its own object store, in IndexedDB, and Roadmaps does not move. The argument
 * is not capacity — decisions in plain text would fit in `localStorage` many
 * times over — it is **quota isolation**. `LocalStorageBackend.save` swallows a
 * `QuotaExceededError` into a `console.error`, so filling that quota would stop
 * Roadmaps autosaving with no visible sign. IndexedDB has its own quota, so no
 * amount of decisions can reach Roadmaps' data.
 *
 * IndexedDB from the start, even though the first version stored no images yet:
 * if decisions began in `localStorage`, the attachments change would have to
 * migrate real decisions the user had already created — precisely the
 * irreversible migration this project keeps refusing to take on. The store is
 * chosen for where it ends up, not where it starts.
 *
 * The connection, the open timeout and `LoadOutcome` live in
 * `store/indexeddb.ts`: API Hub is the second application to need them, and two
 * copies of a timeout is two timeouts that drift apart. What stays here is what
 * belongs to Decisions — its object stores and its document.
 *
 * The outcome type deliberately does **not** reuse `store/storage.ts`: that
 * seam returns `T | null`, where `null` means "empty", and here empty and
 * *unavailable* have to be different answers.
 */

import { Connection, openDatabase, request, settled, type LoadOutcome } from '../store/indexeddb';
import type { DecisionsData } from './model/types';

/** Re-exported for the tests, which drive the connection directly. */
export { openDatabase };

export type { LoadOutcome };

export interface DecisionsBackend {
  load(): Promise<LoadOutcome<DecisionsData>>;
  save(data: DecisionsData): Promise<void>;
  /** Store one attachment's bytes under its own key. */
  putBlob(id: string, blob: Blob): Promise<void>;
  getBlob(id: string): Promise<Blob | null>;
  deleteBlobs(ids: string[]): Promise<void>;
  /** Every attachment key currently held, for the orphan sweep. */
  blobKeys(): Promise<string[]>;
}

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

/** The Decisions store: one IndexedDB record with the whole document. */
export class IndexedDbBackend implements DecisionsBackend {
  private readonly conn: Connection;

  constructor(open: () => Promise<IDBDatabase> = openDatabase) {
    this.conn = new Connection(open);
  }

  private db_(): Promise<IDBDatabase> {
    return this.conn.get();
  }

  async load(): Promise<LoadOutcome<DecisionsData>> {
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
    await settled(tx, 'no se pudo guardar el adjunto');
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
    await settled(tx, 'no se pudieron borrar los adjuntos');
  }

  async blobKeys(): Promise<string[]> {
    const db = await this.db_();
    const tx = db.transaction(BLOBS, 'readonly');
    const keys = await request(tx.objectStore(BLOBS).getAllKeys());
    return keys.map(String);
  }
}

export function createDecisionsBackend(): DecisionsBackend {
  return new IndexedDbBackend();
}
