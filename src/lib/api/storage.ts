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
 * The library store exists from this change and nothing writes to it yet (D9).
 * Creating it later would mean a database upgrade over contracts the user had
 * already written; creating it now costs an empty object store.
 */

import { Connection, openDatabase, request, settled, type LoadOutcome } from '../store/indexeddb';
import type { ApiData } from './model/types';

export type { LoadOutcome };

export interface ApiBackend {
  load(): Promise<LoadOutcome<ApiData>>;
  save(data: ApiData): Promise<void>;
}

const STORE = 'apiContracts';
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
