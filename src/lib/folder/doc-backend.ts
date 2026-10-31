/**
 * One document of an application, wherever it lives (carpeta-api-hub, moved
 * here in carpeta-links D2).
 *
 * The browser backends of each application implement `DocBackend` as they
 * always did; a folder is `FolderDocBackend` over `FileSync` with the
 * document's format; and a folder that cannot be used yet is
 * `UnavailableDocBackend`, so every way of not being able to read ends on the
 * same screen.
 *
 * Knows no application.
 */

import { FileSync, type FileFormat, type Unavailability } from './file-sync';
import type { FolderDir } from './fs';

/** Where an application's data lives right now. */
export type DataSource = 'browser' | 'folder';

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
