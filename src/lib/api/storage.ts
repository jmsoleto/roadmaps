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
import type { ValueSourcesData } from './sources/types';
import { FileSync, type FileFormat, type Unavailability } from '../folder/file-sync';
import type { FolderDir } from '../folder/fs';
import type { DataSource } from '../store/storage';

export type { LoadOutcome };
export type { Unavailability };

/**
 * How a load ends: `LoadOutcome` with the cause added when it is a folder
 * that cannot be read, so the screen and the hub card can say why and offer
 * the right way out (carpeta-api-hub).
 */
export type DocLoad<T> =
  | { kind: 'loaded'; data: T }
  | { kind: 'empty' }
  | { kind: 'unavailable'; reason: string; why?: Unavailability };

/**
 * One of API Hub's three documents, wherever it lives.
 *
 * `source`, `pending` and `settled` are optional: a backend without them is the
 * browser's, whose write is done when `save` resolves. Only a folder needs to
 * say otherwise.
 */
export interface DocBackend<T> {
  load(): Promise<DocLoad<T>>;
  save(data: T): Promise<void>;
  readonly source?: DataSource;
  readonly pending?: boolean;
  settled?(): Promise<void>;
}

export type ApiBackend = DocBackend<ApiData>;
export type LibraryBackend = DocBackend<LibraryData>;
export type ValueSourcesBackend = DocBackend<ValueSourcesData>;

/**
 * A document in a connected folder: `FileSync` with that document's format,
 * and its causes worded for the person reading the screen.
 */
export class FolderDocBackend<T> implements DocBackend<T> {
  readonly source = 'folder';
  private sync: FileSync<T>;

  constructor(
    readonly dir: FolderDir,
    format: FileFormat<T>,
    /** What the document is called in a sentence, e.g. «los contratos». */
    private noun: string,
  ) {
    this.sync = new FileSync(dir, format);
  }

  get pending(): boolean {
    return this.sync.pending;
  }

  settled(): Promise<void> {
    return this.sync.settled();
  }

  save(data: T): Promise<void> {
    return this.sync.save(data);
  }

  async load(): Promise<DocLoad<T>> {
    const out = await this.sync.load();
    if (out.kind !== 'unavailable') return out;
    const folder = this.dir.name;
    const why = out.why;
    const reason =
      why.cause === 'fichero-ilegible'
        ? `No se puede leer «${folder}/${why.file}»: no es un fichero válido de ${this.noun}. Si viene de un merge, puede tener un conflicto de git sin resolver.`
        : why.cause === 'carpeta-ausente'
          ? `No se encuentra la carpeta «${folder}»: puede que se haya movido o borrado.`
          : why.cause === 'permiso'
            ? `Falta el permiso para leer la carpeta «${folder}».`
            : `No se pudo leer la carpeta «${folder}»: ${why.detail}`;
    return { kind: 'unavailable', reason, why };
  }
}

/** A folder that cannot be used yet. Loads as unavailable, with its cause, and never writes. */
export class UnavailableDocBackend<T> implements DocBackend<T> {
  readonly source = 'folder';
  readonly pending = false;
  constructor(
    private reason: string,
    private why: Unavailability,
  ) {}
  async load(): Promise<DocLoad<T>> {
    return { kind: 'unavailable', reason: this.reason, why: this.why };
  }
  async save(): Promise<void> {}
  async settled(): Promise<void> {}
}

const STORE = 'apiContracts';
const LIBRARY_STORE = 'apiLibrary';
const SOURCES_STORE = 'apiValueSources';
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

/**
 * The mock's value sources, in the store `DB_VERSION` 4 created for them.
 *
 * Their own store and not a second record inside the library's, for the reason
 * that separated the library from the contracts in the first place: a document
 * rewritten whole on every save must not drag another one with it. Editing a
 * saved model and editing the list of order states are two things somebody does
 * at different moments, thinking about different problems.
 */
export class IndexedDbValueSourcesBackend implements ValueSourcesBackend {
  private readonly conn: Connection;

  constructor(open: () => Promise<IDBDatabase> = openDatabase) {
    this.conn = new Connection(open);
  }

  async load(): Promise<LoadOutcome<ValueSourcesData>> {
    let raw: unknown;
    try {
      const db = await this.conn.get();
      const tx = db.transaction(SOURCES_STORE, 'readonly');
      raw = await request(tx.objectStore(SOURCES_STORE).get(DOC_KEY));
    } catch (e) {
      // Not `empty`: arriving on an empty list over a store that actually holds
      // somebody's vocabulary invites writing over it, and there is no server to
      // recover from. `local-persistence` requires the distinction.
      return { kind: 'unavailable', reason: e instanceof Error ? e.message : String(e) };
    }
    if (raw === undefined || raw === null) return { kind: 'empty' };
    return { kind: 'loaded', data: raw as ValueSourcesData };
  }

  async save(data: ValueSourcesData): Promise<void> {
    const db = await this.conn.get();
    const tx = db.transaction(SOURCES_STORE, 'readwrite');
    tx.objectStore(SOURCES_STORE).put(structuredClone(data), DOC_KEY);
    await settled(tx, 'no se pudieron guardar las fuentes de valores');
  }
}

export function createValueSourcesBackend(): ValueSourcesBackend {
  return new IndexedDbValueSourcesBackend();
}
