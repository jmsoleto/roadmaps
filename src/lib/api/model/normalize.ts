/**
 * What comes in gets normalised, so nothing downstream has to know that a
 * document could be incomplete.
 *
 * Same job the four normalisers in Roadmaps do, and the same two rules:
 * **idempotent**, so running it over an already-normal document changes
 * nothing, and it **does not force a write** — the repair consolidates on the
 * next save that happens through the normal flow.
 *
 * The depth stopped at the contract for as long as there was no older shape of a
 * field tree to repair. The mock's value sources changed that: a node can now
 * carry a `source`, so there is one thing inside a tree that a hand-edited or
 * older document can get wrong, and exactly one thing is what gets walked. The
 * rest of a node is still left alone, for the original reason.
 */

import { PALETTE_SLOTS } from '../../theme/tokens';
import { MOCK_PAGE_SIZE, MOCK_SIZE, MOCK_VARIANTS } from './factories';
import {
  RECIPE_KINDS,
  SOURCE_DRAWS,
  type ApiData,
  type ApiNode,
  type Contract,
  type ContractView,
  type MockSettings,
  type NodeSource,
  type PagingOverride,
  type Recipe,
  type RelationOverride,
  type SourceDraw,
} from './types';

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole number at least `min`, for the counts a mock is configured with. */
function count(value: unknown, fallback: number, min = 0): number {
  const n = num(value, fallback);
  return Math.max(min, Math.trunc(n));
}

/**
 * The mock a contract was configured with, or `undefined`.
 *
 * `undefined` stays `undefined`: a contract that never asked for a mock MUST NOT
 * come back with one, because that is the whole guarantee that nothing already
 * written changes meaning. Inventing a seed here would also force a write on the
 * next save of every contract in the document, which this normaliser promises not
 * to do.
 */
function normalizeMock(raw: unknown): MockSettings | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const m = raw as Partial<MockSettings>;
  return {
    // A fixed fallback and not a fresh random one: the normaliser has to be
    // deterministic, or two loads of the same document would disagree.
    seed: count(m.seed, 1),
    // The same numbers `newMockSettings` starts a mock with, and for the same
    // reason: 45 over 20 is the three-page case with a partial last page.
    size: count(m.size, MOCK_SIZE),
    pageSize: count(m.pageSize, MOCK_PAGE_SIZE, 1),
    variants: count(m.variants, MOCK_VARIANTS, 1),
    sizes: numberMap(m.sizes),
    pagination: mapOf(m.pagination, normalizePaging),
    relations: mapOf(m.relations, normalizeRelation),
    collections: stringMap(m.collections),
    identities: stringMap(m.identities),
  };
}

function plainObject(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function stringMap(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(plainObject(raw))) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

function numberMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(plainObject(raw))) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(0, Math.trunc(v));
  }
  return out;
}

function mapOf<T>(raw: unknown, one: (value: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(plainObject(raw))) {
    const value = one(v);
    if (value !== null) out[k] = value;
  }
  return out;
}

/** A denied pagination envelope. Dotted paths, so anything else is dropped. */
function normalizePaging(raw: unknown): PagingOverride | null {
  if (raw === null || typeof raw !== 'object') return null;
  const p = raw as Partial<PagingOverride>;
  return {
    items: str(p.items),
    page: str(p.page),
    size: str(p.size),
    total: str(p.total),
    hasNext: str(p.hasNext),
    next: str(p.next),
    prev: str(p.prev),
    base: p.base === 0 ? 0 : 1,
    pageSize: count(p.pageSize, 0),
  };
}

function normalizeRelation(raw: unknown): RelationOverride | null {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Partial<RelationOverride>;
  return { parent: str(r.parent), foreignKey: str(r.foreignKey) };
}

/**
 * A field's value source, or `null` when what is there cannot be read.
 *
 * `null` means the property is removed, not that the field breaks: a field with
 * no source generates what it always generated. An assignment naming a source
 * that does not **exist** is a different matter and is deliberately kept — see
 * `sources`, and the validator that names it.
 */
function normalizeSource(raw: unknown): NodeSource | null {
  if (raw === null || typeof raw !== 'object') return null;
  const s = raw as Partial<NodeSource>;
  const sourceId = str(s.sourceId);
  const recipe = normalizeRecipe(s.recipe);
  // Neither a saved source nor a readable recipe is not an assignment at all.
  if (sourceId === '' && recipe === null) return null;
  const draw = SOURCE_DRAWS.includes(s.draw as SourceDraw) ? (s.draw as SourceDraw) : 'random';
  return { sourceId, recipe: sourceId === '' ? recipe : null, draw };
}

/** One recipe of the closed set, or `null`. */
export function normalizeRecipe(raw: unknown): Recipe | null {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as { kind?: unknown } & Record<string, unknown>;
  if (typeof r.kind !== 'string' || !RECIPE_KINDS.includes(r.kind as Recipe['kind'])) return null;
  switch (r.kind) {
    case 'integer':
      return { kind: 'integer', min: count(r.min, 1), max: count(r.max, 10) };
    case 'decimal':
      return {
        kind: 'decimal',
        min: num(r.min, 0),
        max: num(r.max, 100),
        decimals: Math.min(6, count(r.decimals, 2)),
      };
    case 'text':
      return { kind: 'text', length: count(r.length, 10, 1) };
    case 'digits':
      return { kind: 'digits', length: count(r.length, 10, 1) };
    case 'boolean':
      return { kind: 'boolean', trueRatio: Math.min(1, Math.max(0, num(r.trueRatio, 0.5))) };
    case 'date':
      return { kind: 'date', from: str(r.from, '2026-01-01'), to: str(r.to, '2026-12-31') };
    default:
      return { kind: 'pattern', pattern: str(r.pattern, '######') };
  }
}

/**
 * Repair the `source` of every node of a tree, in place.
 *
 * In place because the normaliser already passes the document's own arrays
 * through, and because this walk repairs **one property**: rebuilding every node
 * to fix it would be a deep copy of every contract on every load, for a field
 * that is usually absent.
 */
function repairSources(node: unknown): void {
  if (node === null || typeof node !== 'object') return;
  const n = node as ApiNode & { source?: unknown };
  if ('source' in n) {
    const source = normalizeSource(n.source);
    if (source === null) delete n.source;
    else n.source = source;
  }
  if (Array.isArray(n.children)) for (const child of n.children) repairSources(child);
}

/** Every tree a contract holds: its models, and every body of every endpoint. */
function repairContractSources(c: Partial<Contract>): void {
  if (Array.isArray(c.models)) for (const m of c.models) repairSources(m?.node);
  if (Array.isArray(c.endpoints)) {
    for (const e of c.endpoints) {
      repairSources(e?.body);
      if (Array.isArray(e?.responses)) for (const r of e.responses) repairSources(r?.body);
    }
  }
}

function normalizeContract(raw: unknown, index: number): Contract | null {
  if (raw === null || typeof raw !== 'object') return null;
  const c = raw as Partial<Contract>;
  if (typeof c.id !== 'string' || c.id === '') return null;

  const endpoints = Array.isArray(c.endpoints) ? c.endpoints : [];
  const models = Array.isArray(c.models) ? c.models : [];

  repairContractSources(c);
  const mock = normalizeMock(c.mock);

  return {
    id: c.id,
    title: str(c.title, 'Contrato sin título'),
    version: str(c.version, '1.0.0'),
    description: str(c.description),
    server: str(c.server),
    // A contract without a slot takes the one its position would have given it,
    // which is what it was already being shown with.
    colorSlot:
      typeof c.colorSlot === 'number' && Number.isFinite(c.colorSlot)
        ? c.colorSlot
        : index % PALETTE_SLOTS,
    models: Array.isArray(c.models) ? c.models : [],
    endpoints,
    // A view naming something that is no longer there would open the contract
    // on a blank editor over a list that still has entries. Same treatment
    // `openId` already gets when it names a contract that is not there (D10).
    view: resolvableView(c.view ?? null, endpoints, models),
    // Spread rather than assigned, so a contract with no mock comes back with no
    // `mock` key at all instead of one holding `undefined` — which is what
    // `structuredClone` and the JSON export would each render differently.
    ...(mock === undefined ? {} : { mock }),
  };
}

/** The remembered view, or `null` when what it names has been deleted. */
function resolvableView(
  view: ContractView,
  endpoints: readonly { id?: unknown }[],
  models: readonly { id?: unknown }[],
): ContractView {
  if (view === null) return null;
  const pool = view.kind === 'endpoint' ? endpoints : models;
  return pool.some((x) => x.id === view.id) ? view : null;
}

/**
 * Read a stored document, dropping what cannot be read rather than failing.
 *
 * A contract without an id is not repairable: issuing one would make a
 * duplicate on the next load, since nothing links it to what it was. Returns
 * `null` when the document itself is not a document, which the caller treats as
 * empty — the same thing Roadmaps does with a malformed one.
 */
export function normalizeApiData(raw: unknown): ApiData | null {
  if (raw === null || typeof raw !== 'object') return null;
  const d = raw as Partial<ApiData>;
  if (!Array.isArray(d.contracts)) return null;

  const contracts = d.contracts
    .map((c, i) => normalizeContract(c, i))
    .filter((c): c is Contract => c !== null);

  // An open id naming a contract that is no longer there would leave the app
  // showing nothing over a list that has entries.
  const openId =
    typeof d.openId === 'string' && contracts.some((c) => c.id === d.openId) ? d.openId : null;

  return { contracts, openId };
}
