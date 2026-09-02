/**
 * Storage seam for API Hub.
 *
 * Its own object store, for the reason `local-persistence` gives: a contract
 * with a large pasted response in it must never be able to exhaust the quota
 * Roadmaps saves into, because that failure is invisible — Roadmaps swallows a
 * `QuotaExceededError` into a `console.error`.
 *
 * The connection, the open timeout and `LoadOutcome` are shared, in
 * `store/indexeddb.ts`. What belongs here is what belongs to this application:
 * its object store and its document.
 *
 * The library got its own object store here before there was anything to put in
 * it — creating it later would have meant a database upgrade over contracts the
 * user had already written. It now holds the saved models, and the reason it is
 * separate is the one that made it worth doing early: the contracts document is
 * rewritten whole on every save.
 */

import { Connection, openDatabase, request, settled, type LoadOutcome } from '../store/indexeddb';
import type { ApiData } from './model/types';
import type { LibraryData } from './library/types';

export type { LoadOutcome };

export interface ApiBackend {
  load(): Promise<LoadOutcome<ApiData>>;
  save(data: ApiData): Promise<void>;
}

export interface LibraryBackend {
  load(): Promise<LoadOutcome<LibraryData>>;
  save(data: LibraryData): Promise<void>;
}

const STORE = 'apiContracts';
const LIBRARY_STORE = 'apiLibrary';
/** Single record holding the whole document, as the other two stores do. */
const DOC_KEY = 'doc:v1';

export class IndexedDbApiBackend implements ApiBackend {
  private readonly conn: Connection;

  /**
   * `open` is injectable so the failure path can be exercised without breaking
   * a real database — the one path that must never be discovered in production.
   */
  constructor(open: () => Promise<IDBDatabase> = openDatabase) {
    this.conn = new Connection(open);
  }

  async load(): Promise<LoadOutcome<ApiData>> {
    let raw: unknown;
    try {
      const db = await this.conn.get();
      const tx = db.transaction(STORE, 'readonly');
      raw = await request(tx.objectStore(STORE).get(DOC_KEY));
    } catch (e) {
      return { kind: 'unavailable', reason: e instanceof Error ? e.message : String(e) };
    }

    if (raw === undefined || raw === null) return { kind: 'empty' };
    // A record that is there but unreadable is *not* unavailable: the store
    // opened fine. Treating it as empty matches what the other two do with a
    // malformed document, and keeps the app usable. The shape check is left to
    // the normaliser, which is the one that knows what a document looks like.
    return { kind: 'loaded', data: raw as ApiData };
  }

  async save(data: ApiData): Promise<void> {
    const db = await this.conn.get();
    const tx = db.transaction(STORE, 'readwrite');
    // One record with the whole document, so a save is all or nothing: a later
    // read sees the previous state or the new one, never a mix.
    //
    // The clone detaches the record from anything the app edits between here
    // and the transaction completing. What it does **not** do is rescue a
    // reactive object: `structuredClone` rejects a proxy outright rather than
    // unwrapping one, so the store snapshots before it gets here, and this line
    // throws the day it stops — which is the behaviour `storage.test.ts` pins,
    // so the reason survives the next person to read it (D6).
    tx.objectStore(STORE).put(structuredClone(data), DOC_KEY);
    await settled(tx, 'no se pudieron guardar los contratos');
  }
}

export function createApiBackend(): ApiBackend {
  return new IndexedDbApiBackend();
}

/**
 * The model library, in the object store created for it back when there was
 * nothing to put in it.
 *
 * Its own store, and not a corner of the contracts document, for the reason
 * `local-persistence` gives: the document is rewritten whole on every save, so
 * with the library inside it, typing a letter in a field would rewrite every
 * saved model.
 */
export class IndexedDbLibraryBackend implements LibraryBackend {
  private readonly conn: Connection;

  constructor(open: () => Promise<IDBDatabase> = openDatabase) {
    this.conn = new Connection(open);
  }

  async load(): Promise<LoadOutcome<LibraryData>> {
    let raw: unknown;
    try {
      const db = await this.conn.get();
      const tx = db.transaction(LIBRARY_STORE, 'readonly');
      raw = await request(tx.objectStore(LIBRARY_STORE).get(DOC_KEY));
    } catch (e) {
      return { kind: 'unavailable', reason: e instanceof Error ? e.message : String(e) };
    }
    if (raw === undefined || raw === null) return { kind: 'empty' };
    return { kind: 'loaded', data: raw as LibraryData };
  }

  async save(data: LibraryData): Promise<void> {
    const db = await this.conn.get();
    const tx = db.transaction(LIBRARY_STORE, 'readwrite');
    tx.objectStore(LIBRARY_STORE).put(structuredClone(data), DOC_KEY);
    await settled(tx, 'no se pudo guardar la biblioteca');
  }
}

export function createLibraryBackend(): LibraryBackend {
  return new IndexedDbLibraryBackend();
}
