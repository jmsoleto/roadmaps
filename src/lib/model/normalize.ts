/**
 * Load-boundary normalization for blockers (D9 of `bloqueos-externos`) and for
 * completion (D10 of `completitud-de-items`).
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
import { isIsoDate } from '../time/timeline';
import type { Blocker, IsoDate, ItemBlocker } from './types';

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

/** A document as it may arrive from storage or an import, seen through completion. */
type MaybeCompletion = {
  roadmaps?: {
    baselineDate?: unknown;
    rows?: {
      children?: {
        id?: unknown;
        dependsOn?: unknown;
        completedDate?: unknown;
        endAtCompletion?: unknown;
        baselineEnd?: unknown;
      }[];
    }[];
  }[];
} | null;

/** An ISO day, or null for anything that is not one. */
function asIsoOrNull(value: unknown): IsoDate | null {
  return isIsoDate(value) ? value : null;
}

/**
 * Normalize a whole loaded document in place: fill in the completion fields
 * documents written before this change do not carry, and drop the completion
 * states rule B cannot reach.
 *
 * Documents that predate completion have none of these fields, so every item
 * reads as open and every roadmap as having no fixed plan.
 *
 * The second half is the interesting one. A completed item whose predecessor is
 * open can only arrive from a hand-edited or hand-merged document, and keeping
 * it would leave a frozen bar that `enforceConstraints` has standing permission
 * to want to push. Losing a tick is cheaper than carrying that contradiction,
 * so the offending item is reopened — and reopening it can invalidate whatever
 * depended on it, which is why this runs to a fixed point.
 *
 * Idempotent, and it writes nothing by itself: like `normalizeBlockers`, the
 * result reaches storage on the next save that normal use produces.
 */
export function normalizeCompletion<T>(data: T): T {
  const doc = data as MaybeCompletion;
  if (!doc || typeof doc !== 'object') return data;

  for (const roadmap of doc.roadmaps ?? []) {
    roadmap.baselineDate = asIsoOrNull(roadmap.baselineDate);

    for (const phase of roadmap.rows ?? []) {
      const children = phase.children ?? [];
      for (const item of children) {
        item.completedDate = asIsoOrNull(item.completedDate);
        item.endAtCompletion = asIsoOrNull(item.endAtCompletion);
        item.baselineEnd = asIsoOrNull(item.baselineEnd);
      }

      let changed = true;
      while (changed) {
        changed = false;
        for (const item of children) {
          if (item.completedDate === null) continue;
          const deps = Array.isArray(item.dependsOn) ? item.dependsOn : [];
          const open = deps.some((id) => {
            const dep = children.find((c) => c.id === id);
            return dep !== undefined && dep.completedDate === null;
          });
          if (!open) continue;
          item.completedDate = null;
          item.endAtCompletion = null;
          changed = true;
        }
      }
    }
  }
  return data;
}
