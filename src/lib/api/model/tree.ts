/**
 * Walking, finding and copying the field tree.
 *
 * Pure and free of runes on purpose: the store hands it plain snapshots, never
 * the reactive document. Copying a `$state` proxy would share identity between
 * the copy and the original, which is precisely what duplicating must not do.
 */

import { uid } from '../../util/id';
import type { ApiNode } from './types';

/** A node that can hold children: an object, or an array of objects. */
export function isContainer(node: ApiNode): boolean {
  return node.type === 'object' || (node.type === 'array' && node.itemType === 'object');
}

/** True for the types that carry a value of their own, and so an example. */
export function isScalar(node: ApiNode): boolean {
  return node.type !== 'object' && node.type !== 'array' && node.type !== 'ref';
}

/** Depth-first, parents before children. */
export function walk(
  node: ApiNode,
  fn: (node: ApiNode, parent: ApiNode | null) => void,
  parent: ApiNode | null = null,
): void {
  fn(node, parent);
  for (const child of node.children) walk(child, fn, node);
}

/** Locate a node and the parent that holds it. The root has no parent. */
export function find(root: ApiNode, id: string): { node: ApiNode; parent: ApiNode | null } | null {
  let hit: { node: ApiNode; parent: ApiNode | null } | null = null;
  walk(root, (node, parent) => {
    if (node.id === id) hit = { node, parent };
  });
  return hit;
}

/**
 * Copy a node and everything under it, reissuing every identifier.
 *
 * Reissuing is not tidiness: ids are how the store finds a node to mutate, so a
 * copy that kept them would make editing the copy edit the original too.
 */
export function cloneWithNewIds(node: ApiNode): ApiNode {
  return {
    ...node,
    id: uid('nod'),
    enums: [...node.enums],
    children: node.children.map(cloneWithNewIds),
  };
}

const FALLBACK_KEY = 'campo';

/**
 * A key no sibling is using, for a field being **added**.
 *
 * Numbered — `campo`, `campo2`, `campo3` — because that is what a list of new
 * fields reads like. Duplicating uses `copyKey` instead, which says something
 * different.
 */
export function uniqueKey(siblings: readonly ApiNode[], key = FALLBACK_KEY): string {
  const base = key.trim() === '' ? FALLBACK_KEY : key.trim();
  const taken = new Set(siblings.map((s) => s.key));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}

/**
 * A key for a **copy** of a field, which carries its origin in its name.
 *
 * `direccion` becomes `direccion_copia`, and a second copy `direccion_copia2`.
 * The suffix is the point: in the middle of a refinement, a field called
 * `direccion2` reads as a second address and `direccion_copia` reads as work in
 * progress.
 */
export function copyKey(siblings: readonly ApiNode[], key = FALLBACK_KEY): string {
  const base = key.trim() === '' ? FALLBACK_KEY : key.trim();
  const taken = new Set(siblings.map((s) => s.key));
  const first = `${base}_copia`;
  if (!taken.has(first)) return first;
  let i = 2;
  while (taken.has(`${first}${i}`)) i++;
  return `${first}${i}`;
}

/** Move a node one place up or down among its siblings, if there is room. */
export function moveAmongSiblings(siblings: ApiNode[], from: number, delta: -1 | 1): boolean {
  const to = from + delta;
  if (from < 0 || from >= siblings.length || to < 0 || to >= siblings.length) return false;
  const [moved] = siblings.splice(from, 1);
  siblings.splice(to, 0, moved);
  return true;
}
