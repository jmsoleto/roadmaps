/**
 * Roadmaps' data in a connected folder (carpeta-roadmaps, D4, D6 and D8).
 *
 * Built over the subfolder Roadmaps owns, already validated and with
 * permission: `../folder/connect.ts` decides what a folder is, and this only
 * reads and writes it.
 *
 * Writing touches only what changed. The backend keeps the bytes it last read
 * or wrote for each of its files, serializes the whole state on each save
 * (a few files of a few KB), and writes only the ones that differ. That is what
 * keeps a commit down to the roadmap that was edited, and what leaves alone a
 * file that changed on disk without the app knowing.
 */

import {
  isRoadmapFile,
  parse,
  serialize,
  ASSIGNEES_FILE,
  BLOCKERS_FILE,
  MARKER_FILE,
  ORDER_FILE,
  type FileMap,
} from './folder-format';
import { readAll, removeFile, writeText, type FolderDir } from '../folder/fs';
import type { AppData } from '../model/types';
import type { RoadmapsBackend, RoadmapsLoad } from './storage';

const OWN_FILES = new Set([MARKER_FILE, ORDER_FILE, ASSIGNEES_FILE, BLOCKERS_FILE]);
const isOwn = (name: string) => OWN_FILES.has(name) || isRoadmapFile(name);

function failure(e: unknown, folder: string): RoadmapsLoad {
  const name = e instanceof Error ? e.name : '';
  if (name === 'NotFoundError') {
    return {
      kind: 'unavailable',
      reason: `No se encuentra la carpeta «${folder}»: puede que se haya movido o borrado.`,
      why: { cause: 'carpeta-ausente' },
    };
  }
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      kind: 'unavailable',
      reason: `Falta el permiso para leer la carpeta «${folder}».`,
      why: { cause: 'permiso' },
    };
  }
  const detail = e instanceof Error ? e.message : String(e);
  return {
    kind: 'unavailable',
    reason: `No se pudo leer la carpeta «${folder}»: ${detail}`,
    why: { cause: 'error', detail },
  };
}

export class FolderBackend implements RoadmapsBackend {
  readonly source = 'folder';
  /** Bytes last read or written, by file name. Only files of this format are ever in here. */
  private known: FileMap = new Map();
  /** The newest state waiting to be written, if any. */
  private next: AppData | null = null;
  private draining: Promise<void> | null = null;

  constructor(readonly dir: FolderDir) {}

  get pending(): boolean {
    return this.draining !== null;
  }

  settled(): Promise<void> {
    return this.draining ?? Promise.resolve();
  }

  async load(): Promise<RoadmapsLoad> {
    let all: FileMap;
    try {
      all = await readAll(this.dir);
    } catch (e) {
      return failure(e, this.dir.name);
    }
    const files: FileMap = new Map([...all].filter(([name]) => isOwn(name)));
    const parsed = parse(files);
    if (parsed.kind === 'unreadable') {
      return {
        kind: 'unavailable',
        reason: `No se puede leer «${this.dir.name}/${parsed.file}»: no es un fichero de roadmaps válido. Si viene de un merge, puede tener un conflicto de git sin resolver.`,
        why: { cause: 'fichero-ilegible', file: parsed.file },
      };
    }
    this.known = files;
    const d = parsed.data;
    if (d.roadmaps.length === 0 && d.assignees.length === 0 && d.blockers.length === 0) {
      return { kind: 'empty' };
    }
    return { kind: 'loaded', data: d };
  }

  /**
   * Queue the state to be written.
   *
   * A save that arrives while another is writing replaces whatever was queued
   * before it: only the last state matters, so ten quick saves are at most two
   * writes per file. Resolves once the queue has drained.
   */
  save(data: AppData): Promise<void> {
    this.next = data;
    if (!this.draining) {
      this.draining = this.drain().finally(() => {
        this.draining = null;
      });
    }
    return this.draining;
  }

  private async drain(): Promise<void> {
    while (this.next) {
      const data = this.next;
      this.next = null;
      await this.write(data);
    }
  }

  private async write(data: AppData): Promise<void> {
    const files = serialize(data);
    for (const [name, text] of files) {
      if (this.known.get(name) === text) continue;
      await writeText(this.dir, name, text);
      // Only after the write is confirmed: a failed write must be retried.
      this.known.set(name, text);
    }
    // Only roadmap files this backend read or wrote as its own. A file that
    // appeared on disk since, or that is not of this format, is not touched.
    for (const name of [...this.known.keys()]) {
      if (isRoadmapFile(name) && !files.has(name)) {
        await removeFile(this.dir, name);
        this.known.delete(name);
      }
    }
  }
}
