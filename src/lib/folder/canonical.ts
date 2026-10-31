/**
 * Canonical JSON for folder files, and the helpers to read them back
 * (carpeta-api-hub D1, moved here in carpeta-links D2).
 *
 * **Canonical, but nothing is dropped.** Each known object writes its known
 * fields first, in the order they read best, and then any other field in
 * alphabetical order. Objects whose shape is not listed are written with their
 * keys sorted. Equal states give equal bytes, and a field nobody listed still
 * reaches the folder: a closed list of fields would lose, silently, whatever it
 * forgot or whatever is added next.
 *
 * View state is the one thing left out on purpose: it is each person's, and a
 * document from an earlier version that still carries it must not put it in a
 * shared folder. Which keys those are is the application's to say.
 *
 * Knows no application.
 */

import type { FileMap, FormatParse } from './file-sync';

export interface Shapes<K extends string> {
  /** The fields of each known object, in the order a person reads them. */
  order: Record<K, readonly string[]>;
  /** What each property of a known object holds. */
  holds?: Partial<Record<K, Record<string, K>>>;
  /** Keys never written on a known object: each person's view, not the document. */
  viewKeys?: ReadonlySet<string>;
}

export function canonicalizer<K extends string>(shapes: Shapes<K>) {
  const view = shapes.viewKeys ?? new Set<string>();
  function canon(value: unknown, kind?: K): unknown {
    if (Array.isArray(value)) return value.map((v) => canon(v, kind));
    if (!value || typeof value !== 'object') return value;
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined && !(kind && view.has(k)));
    const known = kind ? shapes.order[kind].filter((k) => keys.includes(k)) : [];
    const rest = keys.filter((k) => !known.includes(k)).sort();
    const out: Record<string, unknown> = {};
    for (const k of [...known, ...rest]) {
      out[k] = canon(obj[k], kind ? shapes.holds?.[kind]?.[k] : undefined);
    }
    return out;
  }
  /** Two-space indentation and a final newline, as in every folder file. */
  const text = (value: unknown, kind?: K): string =>
    JSON.stringify(canon(value, kind), null, 2) + '\n';
  return { canon, text };
}

/** Already canonical: just the layout every folder file has. */
export const layout = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';

/** A file name for an id: used as it is when it is safe, spelled in hex behind `x` otherwise. */
export function fileFor(prefix: string, id: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(id) && !id.startsWith('x')) return `${prefix}${id}.json`;
  const hex = [...new TextEncoder().encode(id)].map((b) => b.toString(16).padStart(2, '0'));
  return `${prefix}x${hex.join('')}.json`;
}

/** Whether a name is one `fileFor(prefix, …)` could have produced. */
export const isFile = (prefix: string) => (name: string) =>
  name.startsWith(prefix) && /^[A-Za-z0-9_-]+\.json$/.test(name.slice(prefix.length));

// ---- reading ----

/** Thrown inside a parse to name the file that could not be read. */
export class Unreadable extends Error {
  constructor(readonly file: string) {
    super(file);
  }
}

export const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** A file's JSON, `undefined` when there is no such file, `Unreadable` when it is not JSON. */
export function json(files: FileMap, name: string): unknown {
  const raw = files.get(name);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Unreadable(name);
  }
}

/**
 * The units of one kind, one per file, by id, in file-name order.
 *
 * A second file claiming an id already seen refuses the load: one would hide
 * the other, and the next save would delete the hidden one.
 */
export function units<T extends { id: string }>(
  files: FileMap,
  is: (name: string) => boolean,
  shapeOk: (v: Record<string, unknown>) => boolean,
): Map<string, T> {
  const byId = new Map<string, T>();
  for (const name of [...files.keys()].filter(is).sort()) {
    const v = json(files, name);
    if (!isObject(v) || typeof v.id !== 'string' || !shapeOk(v)) throw new Unreadable(name);
    if (byId.has(v.id)) throw new Unreadable(name);
    byId.set(v.id, v as unknown as T);
  }
  return byId;
}

/**
 * Units in the order an `order.json` lists, tolerant of what a merge leaves:
 * unlisted units go last, in file order; listed ids without a file are ignored.
 * The next save writes an order that agrees.
 */
export function inOrder<T>(listed: unknown[], byId: Map<string, T>): T[] {
  const out: T[] = [];
  for (const id of new Set(listed)) {
    const unit = typeof id === 'string' ? byId.get(id) : undefined;
    if (unit) out.push(unit);
  }
  for (const unit of byId.values()) if (!out.includes(unit)) out.push(unit);
  return out;
}

/** Run a parse, turning an `Unreadable` into the result that names the file. */
export function attempt<T>(fn: () => T): FormatParse<T> {
  try {
    return { kind: 'ok', data: fn() };
  } catch (e) {
    if (e instanceof Unreadable) return { kind: 'unreadable', file: e.file };
    throw e;
  }
}
