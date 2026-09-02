/**
 * Reusable blocks: naming them, and knowing who uses them.
 *
 * Pure. Nothing here mutates a contract — the store does that — and nothing
 * here knows about OpenAPI. `pascal` lives here rather than in the exporter
 * because it is how a model is *named*, and the exporter is one of the things
 * that needs the answer, not the one that decides it.
 */

import { walk } from './tree';
import type { ApiNode, Contract } from './types';

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
  /** Set when the body *is* a model's own tree. */
  modelId?: string;
}

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
    const at = `${endpoint.method ?? '?'} ${endpoint.path ?? ''}`;
    if (endpoint.body) out.push({ where: `${at} · petición`, root: endpoint.body });
    for (const response of endpoint.responses ?? []) {
      if (response.body) out.push({ where: `${at} · ${response.code}`, root: response.body });
    }
  }
  for (const model of contract.models) {
    if (model.node)
      out.push({ where: `modelo ${model.name}`, root: model.node, modelId: model.id });
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

/**
 * The places that use a model, named.
 *
 * Computed rather than kept as a counter on the model (D8). A stored count
 * would be a second source of truth to maintain on every create, delete,
 * extract, expand and reference change — and the repo already chose the other
 * side of this trade for Roadmaps' recent list: filter on read, do not maintain
 * on write.
 *
 * A model does not count itself: one that references itself is recursive, not
 * used by somebody else.
 */
export function usesOf(contract: Contract, modelId: string): string[] {
  const out: string[] = [];
  for (const body of contractBodies(contract)) {
    if (body.modelId === modelId) continue;
    let hit = false;
    walk(body.root, (node) => {
      if (pointsAt(node, modelId)) hit = true;
    });
    if (hit) out.push(body.where);
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
