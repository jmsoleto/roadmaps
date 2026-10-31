/**
 * Roadmaps' data in a connected folder (carpeta-roadmaps, D4, D6 and D8).
 *
 * The reading, the writing of only what changed, the queue and the deleting of
 * only its own files are `FileSync`'s, shared with every application that keeps
 * a folder (carpeta-api-hub, D2). What is Roadmaps' here is which files are
 * its, how a plan becomes files and back (`folder-format.ts`), and how a cause
 * is worded for the person reading the screen.
 */

import { FileSync, type FileFormat } from '../folder/file-sync';
import type { FolderDir } from '../folder/fs';
import {
  isRoadmapFile,
  parse,
  serialize,
  ASSIGNEES_FILE,
  BLOCKERS_FILE,
  MARKER_FILE,
  ORDER_FILE,
} from './folder-format';
import type { AppData } from '../model/types';
import type { RoadmapsBackend, RoadmapsLoad } from './storage';

const OWN_FILES = new Set([MARKER_FILE, ORDER_FILE, ASSIGNEES_FILE, BLOCKERS_FILE]);

export const ROADMAPS_FORMAT: FileFormat<AppData> = {
  owns: (name) => OWN_FILES.has(name) || isRoadmapFile(name),
  serialize,
  parse,
  isEmpty: (d) => d.roadmaps.length === 0 && d.assignees.length === 0 && d.blockers.length === 0,
  // Only a roadmap disappears from the state; the catalogs, the order and the
  // marker are always written.
  deletable: isRoadmapFile,
};

export class FolderBackend implements RoadmapsBackend {
  readonly source = 'folder';
  private sync: FileSync<AppData>;

  constructor(readonly dir: FolderDir) {
    this.sync = new FileSync(dir, ROADMAPS_FORMAT);
  }

  get pending(): boolean {
    return this.sync.pending;
  }

  settled(): Promise<void> {
    return this.sync.settled();
  }

  save(data: AppData): Promise<void> {
    return this.sync.save(data);
  }

  async load(): Promise<RoadmapsLoad> {
    const out = await this.sync.load();
    if (out.kind !== 'unavailable') return out;
    const folder = this.dir.name;
    const why = out.why;
    const reason =
      why.cause === 'fichero-ilegible'
        ? `No se puede leer «${folder}/${why.file}»: no es un fichero de roadmaps válido. Si viene de un merge, puede tener un conflicto de git sin resolver.`
        : why.cause === 'carpeta-ausente'
          ? `No se encuentra la carpeta «${folder}»: puede que se haya movido o borrado.`
          : why.cause === 'permiso'
            ? `Falta el permiso para leer la carpeta «${folder}».`
            : `No se pudo leer la carpeta «${folder}»: ${why.detail}`;
    return { kind: 'unavailable', reason, why };
  }
}
