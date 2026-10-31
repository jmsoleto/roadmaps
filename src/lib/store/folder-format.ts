/**
 * Roadmaps' data as files in a folder (carpeta-roadmaps, D1 and D2).
 *
 * The folder is the clone of a git repo, so the format is built for diffs and
 * for being merged by hand on GitHub's conflict screen:
 *
 * ```
 * roadmaps/
 * ├─ tech-lead-hub.json    the marker: { "app": "roadmaps", "format": 1 }
 * ├─ order.json            { "roadmaps": ["rm-…", …] }
 * ├─ assignees.json        { "assignees": [ … ] }
 * ├─ blockers.json         { "blockers": [ … ] }
 * └─ rm-….json             one roadmap per file, named after its id
 * ```
 *
 * Pure: names and texts in, names and texts out. The folder backend does the
 * reading and writing.
 */

import type { AppData, Assignee, Blocker, Item, ItemBlocker, Phase, Roadmap } from '../model/types';
import {
  MARKER_FILE,
  markerText as folderMarkerText,
  readMarker as folderReadMarker,
  type MarkerReading,
} from '../folder/marker';

export { MARKER_FILE, type MarkerReading };

/** The app id written in the marker. API Hub and Links will write their own. */
export const APP_ID = 'roadmaps';
/** The format this version writes and the newest it can read. */
export const FORMAT = 1;

export const ORDER_FILE = 'order.json';
export const ASSIGNEES_FILE = 'assignees.json';
export const BLOCKERS_FILE = 'blockers.json';

/** The files the backend reads and writes, by name. */
export type FileMap = Map<string, string>;

// ---- writing ----

/**
 * A fixed order of fields per type, the order a person reads them in: who it
 * is first, dates together, the long free text and the children last.
 *
 * Built field by field rather than handed to `JSON.stringify` as it stands,
 * because the order of keys in memory depends on where the object was born
 * (seed, import, `addItem`, a normalization), and two equal states would then
 * produce different bytes and a phantom diff. A side effect that is wanted: a
 * field that is not listed here is not written, so view state that creeps into
 * the model later does not reach a shared folder unless someone adds it here
 * on purpose.
 */
const assignee = (a: Assignee) => ({ id: a.id, name: a.name, colorSlot: a.colorSlot });

const blocker = (b: Blocker) => ({ id: b.id, name: b.name, owner: b.owner, email: b.email });

const itemBlocker = (a: ItemBlocker) => ({
  id: a.id,
  blockerId: a.blockerId,
  feature: a.feature,
  resolved: a.resolved,
});

const item = (i: Item) => ({
  id: i.id,
  label: i.label,
  isMilestone: i.isMilestone,
  startDate: i.startDate,
  endDate: i.endDate,
  colorSlot: i.colorSlot,
  assigneeId: i.assigneeId,
  dependsOn: [...i.dependsOn],
  blockers: i.blockers.map(itemBlocker),
  completedDate: i.completedDate,
  endAtCompletion: i.endAtCompletion,
  baselineEnd: i.baselineEnd,
  notes: i.notes,
});

const phase = (p: Phase) => ({
  id: p.id,
  name: p.name,
  colorSlot: p.colorSlot,
  startDate: p.startDate,
  endDate: p.endDate,
  assigneeId: p.assigneeId,
  notes: p.notes,
  children: p.children.map(item),
});

const roadmap = (r: Roadmap) => ({
  id: r.id,
  name: r.name,
  colorSlot: r.colorSlot,
  startDate: r.startDate,
  windowDays: r.windowDays,
  baselineDate: r.baselineDate,
  rows: r.rows.map(phase),
});

/** Two-space indentation and a final newline, so git never reports «No newline at end of file». */
const text = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';

/**
 * The file a roadmap lives in.
 *
 * Its id and not its name: renaming a roadmap would otherwise rename its file,
 * and git sees that as a deletion and an addition that collides with any edit
 * made in parallel. Every id the app creates is `rm-<digits>-<hex>` and is used
 * as it is. Anything else is spelled out in hex behind `rm-x`, which no id the
 * app creates can start with, so two ids can never share a file and every
 * roadmap file matches `rm-*.json`.
 */
export function fileForRoadmap(id: string): string {
  if (/^rm-[A-Za-z0-9_-]+$/.test(id) && !id.startsWith('rm-x')) return `${id}.json`;
  const hex = [...new TextEncoder().encode(id)].map((b) => b.toString(16).padStart(2, '0'));
  return `rm-x${hex.join('')}.json`;
}

/** Whether a file name is one this format writes for a roadmap. */
export function isRoadmapFile(name: string): boolean {
  return /^rm-[A-Za-z0-9_-]+\.json$/.test(name);
}

export function markerText(): string {
  return folderMarkerText(APP_ID, FORMAT);
}

/** Every file the state is made of, by name. Deterministic: equal states give equal bytes. */
export function serialize(data: AppData): FileMap {
  const files: FileMap = new Map();
  files.set(MARKER_FILE, markerText());
  files.set(ORDER_FILE, text({ roadmaps: data.roadmaps.map((r) => r.id) }));
  files.set(ASSIGNEES_FILE, text({ assignees: data.assignees.map(assignee) }));
  files.set(BLOCKERS_FILE, text({ blockers: data.blockers.map(blocker) }));
  for (const r of data.roadmaps) files.set(fileForRoadmap(r.id), text(roadmap(r)));
  return files;
}

// ---- the marker ----

/** What a marker says about its folder, for Roadmaps. */
export function readMarker(raw: string | null): MarkerReading {
  return folderReadMarker(raw, APP_ID, FORMAT);
}

// ---- reading ----

export type ParseResult = { kind: 'ok'; data: AppData } | { kind: 'unreadable'; file: string };

class Unreadable extends Error {
  constructor(readonly file: string) {
    super(file);
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

function json(files: FileMap, name: string): unknown {
  const raw = files.get(name);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Unreadable(name);
  }
}

/** A list under `key` in a catalog file, or empty when the file is absent. */
function list(files: FileMap, name: string, key: string): unknown[] {
  const v = json(files, name);
  if (v === undefined) return [];
  if (!isObject(v) || !Array.isArray(v[key])) throw new Unreadable(name);
  return v[key] as unknown[];
}

/**
 * The shape a roadmap file must have before the normalizations get it.
 *
 * Only the skeleton is checked: ids, names, and the arrays the rest of the app
 * walks without looking. Everything finer (a missing completion, a blocker list
 * that is absent) is what the load-time normalizations already fill in, and
 * they run on this data exactly as on the browser's.
 */
function asRoadmap(v: unknown, file: string): Roadmap {
  const ok =
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.rows) &&
    v.rows.every(
      (p) =>
        isObject(p) &&
        typeof p.id === 'string' &&
        Array.isArray(p.children) &&
        p.children.every((c) => isObject(c) && typeof c.id === 'string'),
    );
  if (!ok) throw new Unreadable(file);
  return v as unknown as Roadmap;
}

/**
 * Files back to data.
 *
 * Tolerant of what a merge leaves behind (D1): a roadmap file that `order.json`
 * does not name goes at the end, in file-name order; an id in `order.json`
 * without a file is ignored. The next save writes an `order.json` that agrees.
 *
 * Intolerant of what cannot be read (D8): one file that is not JSON, or not the
 * shape it should be, or a second file with an id already seen, and the whole
 * load is refused with that file's name. A plan that appears without one of its
 * roadmaps reads as a deletion.
 *
 * The result has not been through the load-time normalizations; the store runs
 * them, the same chain it runs on the browser's data.
 */
export function parse(files: FileMap): ParseResult {
  try {
    const assignees = list(files, ASSIGNEES_FILE, 'assignees') as Assignee[];
    const blockers = list(files, BLOCKERS_FILE, 'blockers') as Blocker[];
    const order = list(files, ORDER_FILE, 'roadmaps').filter(
      (x): x is string => typeof x === 'string',
    );

    // Read in file-name order, which is also the order of whatever `order.json`
    // does not mention. Two files claiming the same id refuse the load: one
    // would hide the other, and the next save would delete the hidden one.
    const byId = new Map<string, Roadmap>();
    for (const name of [...files.keys()].filter(isRoadmapFile).sort()) {
      const rm = asRoadmap(json(files, name), name);
      if (byId.has(rm.id)) throw new Unreadable(name);
      byId.set(rm.id, rm);
    }

    const roadmaps: Roadmap[] = [];
    for (const id of new Set(order)) {
      const rm = byId.get(id);
      if (rm) roadmaps.push(rm);
    }
    for (const rm of byId.values()) if (!roadmaps.includes(rm)) roadmaps.push(rm);

    return { kind: 'ok', data: { roadmaps, assignees, blockers } };
  } catch (e) {
    if (e instanceof Unreadable) return { kind: 'unreadable', file: e.file };
    throw e;
  }
}
