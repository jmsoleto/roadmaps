/**
 * Reusable blocks: naming them, and knowing who uses them.
 *
 * Pure. Nothing here mutates a contract — the store does that — and nothing
 * here knows about OpenAPI. `pascal` lives here rather than in the exporter
 * because it is how a model is *named*, and the exporter is one of the things
 * that needs the answer, not the one that decides it.
 */

import { walk } from './tree';
import type { ApiEndpoint, ApiNode, Contract, ContractView, ParamIn } from './types';

/** Somewhere in a contract that can be opened: an endpoint or a model. */
export type ContractTarget = Exclude<ContractView, null>;

/**
 * `mi modelo raro` → `MiModeloRaro`.
 *
 * Accents are folded before the split, not treated as separators. Without that
 * step `paginación` becomes `PaginaciN` — the `ó` splits the word and the
 * leftover `n` gets capitalised — and this is a tool used in Spanish, so model
 * names carry accents as a matter of course.
 */
export function pascal(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('') || 'Modelo';
}

/** One body of a contract, with the place it belongs to. */
export interface ContractBody {
  /** Where it is, e.g. `GET /catalogo/productos · 200`. */
  where: string;
  root: ApiNode;
  /** What to open to see this body: its endpoint, or its model. */
  target: ContractTarget;
  /** Set when the body *is* a model's own tree. */
  modelId?: string;
}

/**
 * How places are named, in one spot.
 *
 * The validator, "used in" and the field search all name the same places, and
 * a request body called `petición` in one list and `request` in another reads
 * as two different places.
 */
export const places = {
  endpoint: (endpoint: ApiEndpoint): string => `${endpoint.method ?? '?'} ${endpoint.path ?? ''}`,
  request: (endpoint: ApiEndpoint): string => `${places.endpoint(endpoint)} · petición`,
  response: (endpoint: ApiEndpoint, code: string): string =>
    `${places.endpoint(endpoint)} · ${code}`,
  param: (endpoint: ApiEndpoint, at: ParamIn): string =>
    `${places.endpoint(endpoint)} · ${PARAM_PLACES[at] ?? at}`,
  model: (name: string): string => `modelo ${name}`,
};

/** Where a parameter travels, said the way it is said in a meeting. */
export const PARAM_PLACES: Record<ParamIn, string> = {
  query: 'consulta',
  path: 'ruta',
  header: 'cabecera',
};

/**
 * Every body a contract holds: request bodies, response bodies, and models.
 *
 * One place, because three things walk them — the validator, "used in", and the
 * store's node lookup — and each keeping its own list is how the three end up
 * disagreeing about what a contract contains.
 */
export function contractBodies(contract: Contract): ContractBody[] {
  const out: ContractBody[] = [];
  for (const endpoint of contract.endpoints) {
    const target: ContractTarget = { kind: 'endpoint', id: endpoint.id };
    if (endpoint.body) out.push({ where: places.request(endpoint), root: endpoint.body, target });
    for (const response of endpoint.responses ?? []) {
      if (response.body)
        out.push({ where: places.response(endpoint, response.code), root: response.body, target });
    }
  }
  for (const model of contract.models) {
    if (model.node)
      out.push({
        where: places.model(model.name),
        root: model.node,
        target: { kind: 'model', id: model.id },
        modelId: model.id,
      });
  }
  return out;
}

/** Whether a field points at this model, as a reference or as an array of it. */
function pointsAt(node: ApiNode, modelId: string): boolean {
  return (
    (node.type === 'ref' && node.ref === modelId) ||
    (node.type === 'array' && node.itemType === 'ref' && node.itemRef === modelId)
  );
}

/** One place that uses a model: named, and with somewhere to go. */
export interface ModelUse {
  where: string;
  target: ContractTarget;
  /** The first field of that body pointing at the model, in tree order. */
  itemId: string;
}

/**
 * The places that use a model, named and reachable.
 *
 * Computed rather than kept as a counter on the model (D8). A stored count
 * would be a second source of truth to maintain on every create, delete,
 * extract, expand and reference change — and the repo already chose the other
 * side of this trade for Roadmaps' recent list: filter on read, do not maintain
 * on write.
 *
 * A model does not count itself: one that references itself is recursive, not
 * used by somebody else.
 *
 * One entry per body, not per field: «used in `GET /x · 200`» is the statement,
 * and two references from the same body are still one place. The entry leads
 * to the first of them, because a link has to lead somewhere.
 */
export function usesOf(contract: Contract, modelId: string): ModelUse[] {
  const out: ModelUse[] = [];
  for (const body of contractBodies(contract)) {
    if (body.modelId === modelId) continue;
    let first: string | null = null;
    walk(body.root, (node) => {
      if (first === null && pointsAt(node, modelId)) first = node.id;
    });
    if (first !== null) out.push({ where: body.where, target: body.target, itemId: first });
  }
  return out;
}

/** The models one model points at, directly. */
export function directDependencies(contract: Contract, modelId: string): string[] {
  const model = contract.models.find((m) => m.id === modelId);
  if (!model?.node) return [];
  const out = new Set<string>();
  walk(model.node, (node) => {
    if (node.type === 'ref' && node.ref) out.add(node.ref);
    if (node.type === 'array' && node.itemType === 'ref' && node.itemRef) out.add(node.itemRef);
  });
  out.delete(modelId);
  return [...out];
}

/**
 * Everything a model needs to mean anything, following the chain.
 *
 * `ItemProducto → Paginacion → Moneda` is three models, and saving only the
 * first to the library would bring two broken references into whatever
 * contract receives it — a contract describing something that is not there,
 * which is worse than not being able to bring it at all.
 *
 * The visited set is what makes a recursive model resolve once instead of
 * hanging; same guard the example generator uses to cut a cycle.
 */
export function modelDependencies(contract: Contract, modelId: string): string[] {
  const seen = new Set<string>([modelId]);
  const queue = [modelId];
  const out: string[] = [];

  while (queue.length > 0) {
    for (const next of directDependencies(contract, queue.shift()!)) {
      if (seen.has(next)) continue;
      seen.add(next);
      out.push(next);
      queue.push(next);
    }
  }
  return out;
}

/**
 * The name proposed when a field is extracted to a model.
 *
 * An array gets `Item` appended, because what is extracted is the shape of its
 * **element**, not of the list. `items` proposing `ItemsItem` is ugly and gets
 * renamed in two seconds; `Items` for the element of a list would be plainly
 * misleading, and misleading survives longer than ugly.
 */
export function extractedName(key: string, isArray: boolean): string {
  const base = pascal(key.trim() || 'Modelo');
  return isArray ? `${base}Item` : base;
}

/** A model name nobody else is using. */
export function uniqueModelName(models: readonly { name: string }[], base: string): string {
  const wanted = base.trim() || 'Modelo';
  const taken = new Set(models.map((m) => m.name));
  if (!taken.has(wanted)) return wanted;
  let i = 2;
  while (taken.has(`${wanted}${i}`)) i++;
  return `${wanted}${i}`;
}
