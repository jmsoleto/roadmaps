/**
 * One document kept in a folder: what every folder backend does, whatever the
 * application (carpeta-api-hub, D2).
 *
 * Written first for Roadmaps (`store/folder-backend.ts`, carpeta-roadmaps D6),
 * and moved here when API Hub needed it three times over. What is generic:
 *
 * - **Only what changed is written.** The bytes last read or written for each
 *   file are kept, the whole state is serialized on each save, and only the
 *   files that differ are written. That keeps a commit down to what was edited,
 *   and leaves alone a file that changed on disk without the app knowing.
 * - **Only what was read as its own is deleted**, and only if the format says
 *   it may be. A file that appeared since, or belongs to someone else, stays.
 * - **Saves queue, keeping the last state.** A save that arrives while another
 *   is writing replaces whatever was queued before it.
 * - **Errors become causes**, not sentences: the application words them.
 *
 * What a document is (which files are its, how a state becomes files and back)
 * is the `FileFormat` the caller passes. Several `FileSync` over the same folder
 * do not see each other's files, as long as their formats do not claim the
 * same names.
 *
 * Knows no application.
 */

import { readAll, removeFile, writeText, type FolderDir } from './fs';

/** Files by name. */
export type FileMap = Map<string, string>;

/**
 * Why a folder's data cannot be read, as a closed value rather than a
 * sentence: the hub card decides from it whether to offer «Conceder acceso».
 */
export type Unavailability =
  | { cause: 'permiso' }
  | { cause: 'carpeta-ausente' }
  | { cause: 'fichero-ilegible'; file: string }
  | { cause: 'error'; detail: string };

export type FormatParse<T> = { kind: 'ok'; data: T } | { kind: 'unreadable'; file: string };

export interface FileFormat<T> {
  /** Whether a file of the folder belongs to this document. */
  owns(name: string): boolean;
  /** Every file the state is made of. Deterministic: equal states, equal bytes. */
  serialize(data: T): FileMap;
  /** The files this document owns, back to a state, or the file that could not be read. */
  parse(files: FileMap): FormatParse<T>;
  /** A state with nothing in it, which loads as `empty`. */
  isEmpty(data: T): boolean;
  /** Whether a file of this document may be removed when the state no longer has it. */
  deletable(name: string): boolean;
}

export type SyncLoad<T> =
  { kind: 'loaded'; data: T } | { kind: 'empty' } | { kind: 'unavailable'; why: Unavailability };

/** What a failed folder operation means to the user. */
export function causeOf(e: unknown): Unavailability {
  const name = e instanceof Error ? e.name : '';
  if (name === 'NotFoundError') return { cause: 'carpeta-ausente' };
  if (name === 'NotAllowedError' || name === 'SecurityError') return { cause: 'permiso' };
  return { cause: 'error', detail: e instanceof Error ? e.message : String(e) };
}

export class FileSync<T> {
  /** Bytes last read or written, by file name. Only this document's files are ever in here. */
  private known: FileMap = new Map();
  /** The newest state waiting to be written, if any. */
  private next: T | null = null;
  private draining: Promise<void> | null = null;

  constructor(
    readonly dir: FolderDir,
    private format: FileFormat<T>,
  ) {}

  /** True while a write is running or queued. */
  get pending(): boolean {
    return this.draining !== null;
  }

  /** Resolve once nothing is pending. */
  settled(): Promise<void> {
    return this.draining ?? Promise.resolve();
  }

  async load(): Promise<SyncLoad<T>> {
    let all: FileMap;
    try {
      all = await readAll(this.dir);
    } catch (e) {
      return { kind: 'unavailable', why: causeOf(e) };
    }
    const files: FileMap = new Map([...all].filter(([name]) => this.format.owns(name)));
    const parsed = this.format.parse(files);
    if (parsed.kind === 'unreadable') {
      return { kind: 'unavailable', why: { cause: 'fichero-ilegible', file: parsed.file } };
    }
    this.known = files;
    return this.format.isEmpty(parsed.data)
      ? { kind: 'empty' }
      : { kind: 'loaded', data: parsed.data };
  }

  /** Queue the state to be written. Resolves once the queue has drained; rejects if a write failed. */
  save(data: T): Promise<void> {
    this.next = data;
    if (!this.draining) {
      this.draining = this.drain().finally(() => {
        this.draining = null;
      });
    }
    return this.draining;
  }

  private async drain(): Promise<void> {
    while (this.next !== null) {
      const data = this.next;
      this.next = null;
      await this.write(data);
    }
  }

  private async write(data: T): Promise<void> {
    const files = this.format.serialize(data);
    for (const [name, text] of files) {
      if (this.known.get(name) === text) continue;
      await writeText(this.dir, name, text);
      // Only after the write is confirmed: a failed write must be retried.
      this.known.set(name, text);
    }
    for (const name of [...this.known.keys()]) {
      if (!files.has(name) && this.format.deletable(name)) {
        await removeFile(this.dir, name);
        this.known.delete(name);
      }
    }
  }
}
