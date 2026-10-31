/**
 * API Hub's three documents as files in a folder (carpeta-api-hub, D1).
 *
 * ```
 * api/
 * ├─ tech-lead-hub.json    the marker: { "app": "api", "format": 1 }
 * ├─ order.json            { "contracts": ["api-…", …] }
 * ├─ c-<id>.json           one contract per file
 * ├─ lib-<id>.json         one library entry per file
 * └─ value-sources.json    { "sources": [ … ] }
 * ```
 *
 * **Canonical, but nothing is dropped.** Roadmaps writes each type from a
 * closed list of fields (carpeta-roadmaps, D2). API Hub's types are deeper and
 * keep growing optional parts (a node's value source, the mock's settings, the
 * recipes), and a closed list would lose, silently, whatever it forgot or
 * whatever is added next. So each known object writes its known fields first,
 * in the order they read best, and then any other field in alphabetical order.
 * Objects whose shape is not listed (the mock's settings, a recipe, maps keyed
 * by id) are written with their keys sorted. Equal states still give equal
 * bytes, and a field nobody listed still reaches the folder.
 *
 * The one thing left out on purpose is view state (`open`, `view`, `openId`):
 * that is each person's (D4), and a document from an earlier version that still
 * carries it must not put it in a shared folder.
 *
 * Pure: names and texts in, names and texts out.
 */

import type { FileFormat, FileMap, FormatParse } from '../folder/file-sync';
import { MARKER_FILE, markerText } from '../folder/marker';
import type { ApiData, Contract } from './model/types';
import type { LibraryData, LibraryEntry } from './library/types';
import type { ValueSourcesData } from './sources/types';

export const APP_ID = 'api';
export const FORMAT = 1;
export const ORDER_FILE = 'order.json';
export const SOURCES_FILE = 'value-sources.json';
const CONTRACT_PREFIX = 'c-';
const ENTRY_PREFIX = 'lib-';

// ---- canonical JSON ----

type Kind = 'contract' | 'model' | 'node' | 'endpoint' | 'param' | 'response' | 'entry' | 'source';

/** The fields of each known object, in the order a person reads them. */
const ORDER: Record<Kind, string[]> = {
  contract: [
    'id',
    'title',
    'version',
    'description',
    'server',
    'colorSlot',
    'models',
    'endpoints',
    'mock',
  ],
  model: ['id', 'name', 'description', 'node'],
  node: [
    'id',
    'key',
    'type',
    'itemType',
    'itemRef',
    'ref',
    'required',
    'nullable',
    'format',
    'enums',
    'example',
    'description',
    'source',
    'children',
  ],
  endpoint: [
    'id',
    'method',
    'path',
    'summary',
    'description',
    'tags',
    'params',
    'body',
    'responses',
  ],
  param: ['id', 'in', 'name', 'type', 'required', 'example', 'description'],
  response: ['id', 'code', 'description', 'body'],
  entry: ['id', 'name', 'description', 'updated', 'models'],
  source: ['id', 'name', 'description', 'updated', 'kind', 'values', 'recipe'],
};

/** What each property of a known object holds. */
const HOLDS: Partial<Record<Kind, Record<string, Kind>>> = {
  contract: { models: 'model', endpoints: 'endpoint' },
  model: { node: 'node' },
  node: { children: 'node' },
  endpoint: { params: 'param', body: 'node', responses: 'response' },
  response: { body: 'node' },
  entry: { models: 'model' },
};

/** Each person's, never the document's (D4). */
const VIEW_KEYS = new Set(['open', 'view', 'openId']);

function canon(value: unknown, kind?: Kind): unknown {
  if (Array.isArray(value)) return value.map((v) => canon(v, kind));
  if (!value || typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined && !(kind && VIEW_KEYS.has(k)));
  const known = kind ? ORDER[kind].filter((k) => keys.includes(k)) : [];
  const rest = keys.filter((k) => !known.includes(k)).sort();
  const out: Record<string, unknown> = {};
  for (const k of [...known, ...rest]) out[k] = canon(obj[k], kind ? HOLDS[kind]?.[k] : undefined);
  return out;
}

/** Two-space indentation and a final newline, as in every folder file. */
const text = (value: unknown, kind?: Kind): string =>
  JSON.stringify(canon(value, kind), null, 2) + '\n';

/** A file name for an id: used as it is when it is safe, spelled in hex behind `x` otherwise. */
function fileFor(prefix: string, id: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(id) && !id.startsWith('x')) return `${prefix}${id}.json`;
  const hex = [...new TextEncoder().encode(id)].map((b) => b.toString(16).padStart(2, '0'));
  return `${prefix}x${hex.join('')}.json`;
}

const isFile = (prefix: string) => (name: string) =>
  name.startsWith(prefix) && /^[A-Za-z0-9_-]+\.json$/.test(name.slice(prefix.length));

export const fileForContract = (id: string) => fileFor(CONTRACT_PREFIX, id);
export const fileForEntry = (id: string) => fileFor(ENTRY_PREFIX, id);
export const isContractFile = isFile(CONTRACT_PREFIX);
export const isEntryFile = isFile(ENTRY_PREFIX);

// ---- reading ----

class Unreadable extends Error {
  constructor(readonly file: string) {
    super(file);
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

function json(files: FileMap, name: string): unknown {
  const raw = files.get(name);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Unreadable(name);
  }
}

/** The units of one kind, by id, refusing a second file with an id already seen. */
function units<T extends { id: string }>(
  files: FileMap,
  is: (name: string) => boolean,
  shapeOk: (v: Record<string, unknown>) => boolean,
): Map<string, T> {
  const byId = new Map<string, T>();
  for (const name of [...files.keys()].filter(is).sort()) {
    const v = json(files, name);
    if (!isObject(v) || typeof v.id !== 'string' || !shapeOk(v)) throw new Unreadable(name);
    // One would hide the other, and the next save would delete the hidden one.
    if (byId.has(v.id)) throw new Unreadable(name);
    byId.set(v.id, v as unknown as T);
  }
  return byId;
}

function attempt<T>(fn: () => T): FormatParse<T> {
  try {
    return { kind: 'ok', data: fn() };
  } catch (e) {
    if (e instanceof Unreadable) return { kind: 'unreadable', file: e.file };
    throw e;
  }
}

// ---- the three documents ----

/**
 * The contracts, their order and the marker.
 *
 * The marker is this document's to keep: it is written when the folder is
 * connected and never deleted. The other two documents do not claim it.
 */
export const CONTRACTS_FORMAT: FileFormat<ApiData> = {
  owns: (name) => name === MARKER_FILE || name === ORDER_FILE || isContractFile(name),
  serialize(data) {
    const files: FileMap = new Map();
    files.set(MARKER_FILE, markerText(APP_ID, FORMAT));
    files.set(ORDER_FILE, text({ contracts: data.contracts.map((c) => c.id) }));
    for (const c of data.contracts) files.set(fileForContract(c.id), text(c, 'contract'));
    return files;
  },
  parse: (files) =>
    attempt(() => {
      const order = json(files, ORDER_FILE);
      if (order !== undefined && (!isObject(order) || !Array.isArray(order.contracts))) {
        throw new Unreadable(ORDER_FILE);
      }
      const byId = units<Contract>(
        files,
        isContractFile,
        (v) => Array.isArray(v.models) && Array.isArray(v.endpoints),
      );
      // Tolerant of what a merge leaves: unlisted contracts go last, in file
      // order; listed ids without a file are ignored. The next save agrees.
      const listed = order ? (order.contracts as unknown[]) : [];
      const contracts: Contract[] = [];
      for (const id of new Set(listed)) {
        const c = typeof id === 'string' ? byId.get(id) : undefined;
        if (c) contracts.push(c);
      }
      for (const c of byId.values()) if (!contracts.includes(c)) contracts.push(c);
      return { contracts };
    }),
  isEmpty: (d) => d.contracts.length === 0,
  deletable: isContractFile,
};

/** The library: one file per entry, in name order, which is its key. No order file to fall out of step. */
export const LIBRARY_FORMAT: FileFormat<LibraryData> = {
  owns: isEntryFile,
  serialize(data) {
    const files: FileMap = new Map();
    for (const e of data.entries) files.set(fileForEntry(e.id), text(e, 'entry'));
    return files;
  },
  parse: (files) =>
    attempt(() => {
      const byId = units<LibraryEntry>(
        files,
        isEntryFile,
        (v) => typeof v.name === 'string' && Array.isArray(v.models),
      );
      const entries = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
      return { entries };
    }),
  isEmpty: (d) => d.entries.length === 0,
  deletable: isEntryFile,
};

/** The value sources: short lists, one catalog file. */
export const SOURCES_FORMAT: FileFormat<ValueSourcesData> = {
  owns: (name) => name === SOURCES_FILE,
  serialize(data) {
    // Built by hand rather than through `text`, which would canonicalize the
    // wrapper again without knowing what a source is and sort its fields.
    const body = { sources: canon(data.sources, 'source') };
    return new Map([[SOURCES_FILE, JSON.stringify(body, null, 2) + '\n']]);
  },
  parse: (files) =>
    attempt(() => {
      const v = json(files, SOURCES_FILE);
      if (v === undefined) return { sources: [] };
      if (!isObject(v) || !Array.isArray(v.sources)) throw new Unreadable(SOURCES_FILE);
      return { sources: v.sources as ValueSourcesData['sources'] };
    }),
  isEmpty: (d) => d.sources.length === 0,
  // The catalog is always written, empty or not.
  deletable: () => false,
};
