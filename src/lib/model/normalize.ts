/**
 * Load-boundary normalization for blockers (design decision D9).
 *
 * Documents written before blockers existed carry neither the global catalog
 * nor a `blockers` list on their items. Rather than versioning the stored
 * format, they are filled in on the way in — the same trick `normalizeColors`
 * uses, and possible for the same reason: the transport is JSON.
 *
 * The pass is idempotent and does not itself write anything. The conversion
 * lands in the store on the next save that happens through normal use, so
 * opening the app and touching nothing leaves the stored document alone.
 *
 * Assignments pointing at a blocker that is not in the catalog are dropped. A
 * dangling assignment has no name and no owner to show, so it would stripe a
 * bar without being able to say why.
 */

import { uid } from '../util/id';
import type { Blocker, ItemBlocker } from './types';

/** A document as it may arrive from storage or an import: fields may be missing. */
type MaybeBlockers = {
  blockers?: unknown;
  roadmaps?: { rows?: { children?: { blockers?: unknown }[] }[] }[];
} | null;

/** Coerce one catalog entry, ignoring anything without a usable id. */
function asBlocker(value: unknown): Blocker | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as Partial<Blocker>;
  if (typeof b.id !== 'string' || !b.id) return null;
  return {
    id: b.id,
    name: String(b.name ?? ''),
    owner: String(b.owner ?? ''),
    email: String(b.email ?? ''),
  };
}

/** Coerce the catalog of a loaded document to a well-formed array. */
export function asBlockers(value: unknown): Blocker[] {
  if (!Array.isArray(value)) return [];
  return value.map(asBlocker).filter((b): b is Blocker => b !== null);
}

/**
 * Coerce one item's assignments, keeping only those whose blocker resolves.
 *
 * `known` is the set of catalog ids available *after* whatever merge the caller
 * has already done, so an import can bring its own blockers along and still
 * have its assignments survive.
 */
export function asItemBlockers(value: unknown, known: Set<string>): ItemBlocker[] {
  if (!Array.isArray(value)) return [];
  const out: ItemBlocker[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const a = raw as Partial<ItemBlocker>;
    if (typeof a.blockerId !== 'string' || !known.has(a.blockerId)) continue;
    out.push({
      id: typeof a.id === 'string' && a.id ? a.id : uid('ib'),
      blockerId: a.blockerId,
      feature: String(a.feature ?? ''),
      resolved: a.resolved === true,
    });
  }
  return out;
}

/**
 * Normalize a whole loaded document in place: catalog, then every item's list.
 *
 * Loosely typed because it runs before the data has earned its `AppData` type,
 * mirroring `normalizeColors`.
 */
export function normalizeBlockers<T>(data: T): T {
  const doc = data as MaybeBlockers;
  if (!doc || typeof doc !== 'object') return data;

  const catalog = asBlockers(doc.blockers);
  doc.blockers = catalog;
  const known = new Set(catalog.map((b) => b.id));

  for (const roadmap of doc.roadmaps ?? []) {
    for (const phase of roadmap.rows ?? []) {
      for (const item of phase.children ?? []) {
        item.blockers = asItemBlockers(item.blockers, known);
      }
    }
  }
  return data;
}
