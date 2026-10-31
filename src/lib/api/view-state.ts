/**
 * How each person looks at API Hub, kept apart from the contracts
 * (carpeta-api-hub, D4).
 *
 * Three things used to travel inside the documents: which contract is open
 * (`ApiData.openId`), what each contract shows (`Contract.view`) and whether
 * each node of a tree is unfolded (`ApiNode.open`, also inside the models saved
 * in the library). In a single browser that made no difference; in a folder
 * shared through git, folding a field would be a line in somebody's pull
 * request. All three now live in preferences.
 *
 * Folded and not unfolded is what is kept, as in Roadmaps: nodes are born open,
 * so a new node writes nothing and the set stays small.
 *
 * Pure: the store reads and writes the preferences.
 */

import { walk } from './model/tree';
import type { ApiNode, Contract, ContractView } from './model/types';

export const PREF_OPEN = 'api:open-id';
export const PREF_VIEWS = 'api:views';
export const PREF_COLLAPSED = 'api:collapsed-nodes';

export type Views = Record<string, Exclude<ContractView, null>>;

/** Every node of a contract: models, then each endpoint's body and responses. */
export function contractNodes(contract: Contract): ApiNode[] {
  const out: ApiNode[] = [];
  const add = (root: ApiNode | null | undefined) => root && walk(root, (n) => out.push(n));
  for (const m of contract.models ?? []) add(m.node);
  for (const e of contract.endpoints ?? []) {
    add(e.body);
    for (const r of e.responses ?? []) add(r.body);
  }
  return out;
}

/** What older documents carried, lifted out. `undefined` is "said nothing". */
export interface LegacyApiView {
  openId: string | null | undefined;
  views: Views | undefined;
  collapsed: string[] | undefined;
}

type Raw = { openId?: unknown; contracts?: unknown };

/**
 * Take the view state out of a contracts document written by an earlier
 * version.
 *
 * Mutates in place, deleting `openId`, every `view` and every node's `open`, so
 * the next save writes the documents without them. Nothing here forces that
 * save. Idempotent: a document without them gives `undefined` three times.
 */
export function liftApiView(doc: Raw | null | undefined): LegacyApiView {
  const out: LegacyApiView = { openId: undefined, views: undefined, collapsed: undefined };
  if (!doc || typeof doc !== 'object') return out;
  if ('openId' in doc) {
    out.openId = typeof doc.openId === 'string' ? doc.openId : null;
    delete doc.openId;
  }
  if (!Array.isArray(doc.contracts)) return out;
  for (const c of doc.contracts as (Contract & { view?: ContractView })[]) {
    if (!c || typeof c !== 'object') continue;
    if ('view' in c) {
      out.views ??= {};
      if (c.view && typeof c.view === 'object' && typeof c.view.id === 'string') {
        out.views[c.id] = c.view;
      }
      delete c.view;
    }
    for (const node of contractNodes(c)) {
      const n = node as ApiNode & { open?: unknown };
      if (!('open' in n)) continue;
      out.collapsed ??= [];
      if (n.open === false) out.collapsed.push(n.id);
      delete n.open;
    }
  }
  return out;
}

/** Remove `open` from every node under the models of a library entry. Nobody folds those. */
export function stripNodeOpen(models: { node?: ApiNode }[]): void {
  for (const m of models) {
    if (m.node) walk(m.node, (n) => delete (n as ApiNode & { open?: unknown }).open);
  }
}

export function parseOpen(raw: string | null): string | null | undefined {
  if (raw === null) return undefined;
  return raw === '' ? null : raw;
}

export function parseViews(raw: string | null): Views | undefined {
  if (raw === null) return undefined;
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Views) : undefined;
  } catch {
    return undefined;
  }
}

export function parseIds(raw: string | null): string[] | undefined {
  if (raw === null) return undefined;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;
  } catch {
    return undefined;
  }
}

/** Sorted, so the same set is always the same string. */
export function serializeIds(ids: readonly string[]): string {
  return JSON.stringify([...ids].sort());
}

/**
 * The view a duplicated contract should open on: the copy of what the
 * original showed. The copy has new ids in the same positions, so the view
 * follows by position.
 */
export function followView(original: Contract, copy: Contract, view: ContractView): ContractView {
  if (!view) return null;
  const [from, to] =
    view.kind === 'endpoint'
      ? [original.endpoints, copy.endpoints]
      : [original.models, copy.models];
  const i = from.findIndex((x) => x.id === view.id);
  return i >= 0 && to[i] ? { kind: view.kind, id: to[i].id } : null;
}
