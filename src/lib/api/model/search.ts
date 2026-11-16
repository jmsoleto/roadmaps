/**
 * Finding a field in the open contract: «where else do we use this?».
 *
 * Pure, like the rest of `model/`: the rail paints what this returns, and the
 * store opens what the person chooses. Nothing here knows what is on screen.
 *
 * It walks what `contractBodies` walks plus what that function leaves out on
 * purpose, the parameters and the path markers, in the order the editor shows
 * them. References are **not** followed (design D1): a field that lives in a
 * model is found once, in the model, and «Usado en» goes from there.
 */

import { places, type ContractTarget } from './models';
import { undeclaredMarkers } from './paths';
import type { ApiNode, ApiParam, Contract, NodeType } from './types';

/** Why a result is in the list. */
export type HitReason = 'key' | 'param' | 'description';

/** The part of a description that matched, in its original spelling. */
export interface Snippet {
  before: string;
  match: string;
  after: string;
}

export interface SearchHit {
  /** What to open. */
  target: ContractTarget;
  /** The field or parameter to show, or `null` for a marker nobody declared. */
  itemId: string | null;
  /** The place, named the way «Usado en» names it. */
  where: string;
  /** `data[].cliente.email`; a parameter's name. */
  path: string;
  type: NodeType | ApiParam['type'];
  reason: HitReason;
  /** Only when `reason` is `description`. */
  snippet: Snippet | null;
}

/** How much of a description is shown on each side of the match. */
const CONTEXT = 30;

/**
 * One character, folded: accents, case and the separators of an identifier out.
 *
 * Per character so that `fold` and the snippet's position map cannot disagree
 * about what a character becomes. Dots and braces stay (D2): they are how a path
 * is written, not how a name is separated.
 */
function foldChar(ch: string): string {
  return ch
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

/** `Código_Cliente-ID` → `codigoclienteid`. */
export function fold(text: string): string {
  let out = '';
  for (const ch of text) out += foldChar(ch);
  return out;
}

/**
 * Where `needle` (already folded) is in `text`, cut out of the original.
 *
 * A map from each folded character back to the original one it came from is
 * what makes `código_cliente` come out marked whole, accent and underscore
 * included, when the search was `codigo cliente`.
 */
export function matchSnippet(text: string, needle: string): Snippet | null {
  if (needle === '') return null;
  let folded = '';
  const origin: number[] = [];
  let at = 0;
  for (const ch of text) {
    const f = foldChar(ch);
    folded += f;
    for (let i = 0; i < f.length; i++) origin.push(at);
    at += ch.length;
  }
  const idx = folded.indexOf(needle);
  if (idx < 0) return null;

  const start = origin[idx];
  const last = origin[idx + needle.length - 1];
  const end = last + (text.codePointAt(last)! > 0xffff ? 2 : 1);

  const from = Math.max(0, start - CONTEXT);
  const to = Math.min(text.length, end + CONTEXT);
  return {
    before: (from > 0 ? '…' : '') + text.slice(from, start),
    match: text.slice(start, end),
    after: text.slice(end, to) + (to < text.length ? '…' : ''),
  };
}

/**
 * Every field and parameter of `contract` that matches `query`.
 *
 * A field matching by both key and description is listed once, by its key
 * (D3): one field twice in the list would read as two places.
 */
export function searchContract(contract: Contract, query: string): SearchHit[] {
  const needle = fold(query);
  if (needle === '') return [];
  const out: SearchHit[] = [];

  /** The key, or failing that the description; `null` if neither. */
  const why = (
    name: string,
    description: string,
    byName: HitReason,
  ): Pick<SearchHit, 'reason' | 'snippet'> | null => {
    if (fold(name).includes(needle)) return { reason: byName, snippet: null };
    const snippet = matchSnippet(description ?? '', needle);
    return snippet ? { reason: 'description', snippet } : null;
  };

  const body = (root: ApiNode, target: ContractTarget, where: string) => {
    const visit = (node: ApiNode, prefix: string) => {
      const path = prefix === '' ? node.key : `${prefix}.${node.key}`;
      const hit = why(node.key ?? '', node.description, 'key');
      if (hit) out.push({ target, itemId: node.id, where, path, type: node.type, ...hit });
      // A `ref` has no children of its own: its model is walked as a model.
      const below = node.type === 'array' ? `${path}[]` : path;
      for (const child of node.children ?? []) visit(child, below);
    };
    // The root is not a field of anything, so it adds no segment.
    for (const child of root.children ?? []) visit(child, '');
  };

  for (const endpoint of contract.endpoints) {
    const target: ContractTarget = { kind: 'endpoint', id: endpoint.id };
    const params = endpoint.params ?? [];
    for (const param of params) {
      const hit = why(param.name, param.description, 'param');
      if (hit)
        out.push({
          target,
          itemId: param.id,
          where: places.param(endpoint, param.in),
          path: param.name,
          type: param.type,
          ...hit,
        });
    }
    for (const marker of undeclaredMarkers(endpoint.path ?? '', params)) {
      if (!fold(marker).includes(needle)) continue;
      out.push({
        target,
        itemId: null,
        where: places.param(endpoint, 'path'),
        path: marker,
        type: 'string',
        reason: 'param',
        snippet: null,
      });
    }
    if (endpoint.body) body(endpoint.body, target, places.request(endpoint));
    for (const response of endpoint.responses ?? []) {
      if (response.body) body(response.body, target, places.response(endpoint, response.code));
    }
  }

  for (const model of contract.models) {
    if (model.node) body(model.node, { kind: 'model', id: model.id }, places.model(model.name));
  }
  return out;
}
