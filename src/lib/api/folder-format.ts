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

import type { FileFormat, FileMap } from '../folder/file-sync';
import {
  attempt,
  canonicalizer,
  fileFor,
  inOrder,
  isFile,
  isObject,
  json,
  layout,
  units,
  Unreadable,
} from '../folder/canonical';
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
const { canon, text } = canonicalizer<Kind>({
  order: ORDER,
  holds: HOLDS,
  viewKeys: new Set(['open', 'view', 'openId']),
});

export const fileForContract = (id: string) => fileFor(CONTRACT_PREFIX, id);
export const fileForEntry = (id: string) => fileFor(ENTRY_PREFIX, id);
export const isContractFile = isFile(CONTRACT_PREFIX);
export const isEntryFile = isFile(ENTRY_PREFIX);

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
      const listed = order ? (order.contracts as unknown[]) : [];
      const contracts = inOrder(listed, byId);
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
    return new Map([[SOURCES_FILE, layout(body)]]);
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
