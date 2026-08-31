/** Pure derivations over the data model (no reactivity, easy to test). */

import { addDays, dayIndex } from '../time/timeline';
import { ROW_H } from '../config';
import type { Item, Phase, Roadmap, IsoDate } from './types';

/** A flattened, render-ready row: a phase header, one of its items, or its "add" row. */
export type VisibleRow =
  | { kind: 'phase'; phase: Phase }
  | { kind: 'item'; phase: Phase; item: Item }
  | { kind: 'add'; phase: Phase };

/** Flatten a roadmap into the visible rows, expanding phases that are open. */
export function getVisibleRows(rm: Roadmap): VisibleRow[] {
  const out: VisibleRow[] = [];
  for (const phase of rm.rows) {
    out.push({ kind: 'phase', phase });
    if (phase.expanded) {
      for (const item of phase.children) out.push({ kind: 'item', phase, item });
      out.push({ kind: 'add', phase });
    }
  }
  return out;
}

/**
 * A stable identity for a visible row, independent of its position.
 *
 * Rows are rendered from `getVisibleRows` but positioned from `previewRows`,
 * and the two lists hold different objects (the preview is built over shallow
 * copies). Ids are what survives that, so they are what pairs the two.
 */
export function rowKey(v: VisibleRow): string {
  if (v.kind === 'item') return `i:${v.item.id}`;
  if (v.kind === 'add') return `a:${v.phase.id}`;
  return `p:${v.phase.id}`;
}

/** Where one phase's block of visible rows starts, and how many rows it spans. */
export interface PhaseBlock {
  phaseId: string;
  /** Index of the phase header within `getVisibleRows(rm)`. */
  start: number;
  /** Rows the block occupies: the header, plus its items and "add" row when expanded. */
  len: number;
}

/**
 * The visible-row span of each phase, read off the flattened list itself.
 *
 * Deliberately derived from `getVisibleRows` rather than recomputing
 * `expanded ? 1 + children + 1 : 1`: that rule would then live in two places and
 * a third row kind would have to be remembered in both.
 */
export function getPhaseBlocks(rm: Roadmap): PhaseBlock[] {
  const out: PhaseBlock[] = [];
  getVisibleRows(rm).forEach((v, i) => {
    if (v.kind === 'phase') out.push({ phaseId: v.phase.id, start: i, len: 1 });
    else out[out.length - 1].len++;
  });
  return out;
}

/**
 * Where a row dragged `dy` pixels from index `from` lands, among `len` siblings.
 *
 * The clamp *is* the containment rule (design decision D3): an item can never
 * name a position outside its phase, so nothing downstream has to detect an
 * invalid drop, refuse it, or animate a rejected row back. The pointer keeps
 * going and the row stops, which is how the limit gets taught.
 */
export function dropIndex(from: number, dy: number, len: number): number {
  return Math.max(0, Math.min(len - 1, from + Math.round(dy / ROW_H)));
}

/**
 * Where a phase dragged `dy` pixels from index `from` lands among its siblings.
 *
 * Phases need their own reckoning because their blocks are not all one row
 * tall: a collapsed phase is a single row, an expanded one is its header plus
 * its items plus its "add" row. So pixels cannot be divided by `ROW_H` the way
 * `dropIndex` divides them for items — crossing a collapsed phase is one row of
 * travel and crossing a long one is many.
 *
 * The rule is the one the eye is already applying: lift the block out, let the
 * rest close up, and pick the slot whose resulting header position is nearest
 * to where the held header actually is. Landing where you are closest to
 * landing.
 *
 * `blocks` must be the layout as it stood when the gesture began, never the
 * preview: measuring against a layout that the measurement itself rearranges
 * feeds back, and the row judders between two positions at the boundary.
 */
export function dropBlockIndex(blocks: PhaseBlock[], from: number, dy: number): number {
  const rest = blocks.filter((_, i) => i !== from);
  let headerTop = dy / ROW_H;
  for (let i = 0; i < from; i++) headerTop += blocks[i].len;

  let best = 0;
  let bestGap = Infinity;
  let cum = 0;
  for (let j = 0; j <= rest.length; j++) {
    const gap = Math.abs(cum - headerTop);
    if (gap < bestGap) {
      bestGap = gap;
      best = j;
    }
    if (j < rest.length) cum += rest[j].len;
  }
  return best;
}

/** Move one element of an array to another index, without touching the original. */
export function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  const out = arr.slice();
  const [moved] = out.splice(from, 1);
  out.splice(to, 0, moved);
  return out;
}

/** A reorder in flight: which row is held, where it came from, where it would land. */
export type RowDrag =
  | { kind: 'phase'; phaseId: string; from: number; to: number }
  | { kind: 'item'; phaseId: string; itemId: string; from: number; to: number };

/**
 * The rows `getVisibleRows` would return if the pending reorder were applied.
 *
 * This is what positions every row during a drag (D5): one list drives both
 * halves of every row — the grid track's `top` and the sidebar label's
 * `translateY` — and it works the same for a phase block as for a single item.
 * The held row is the only thing that escapes it, following the pointer in
 * pixels instead of snapping to the grid.
 *
 * The copies are shallow and short-lived; nothing here mutates `rm`, and the
 * rows it yields are only ever read for their position — `rowKey` is what pairs
 * them back to the real rows being rendered.
 */
export function previewRows(rm: Roadmap, drag: RowDrag | null): VisibleRow[] {
  if (!drag || drag.from === drag.to) return getVisibleRows(rm);
  if (drag.kind === 'phase') {
    return getVisibleRows({ ...rm, rows: moveInArray(rm.rows, drag.from, drag.to) });
  }
  const rows = rm.rows.map((p) =>
    p.id === drag.phaseId ? { ...p, children: moveInArray(p.children, drag.from, drag.to) } : p,
  );
  return getVisibleRows({ ...rm, rows });
}

const minIso = (a: IsoDate, b: IsoDate): IsoDate => (a < b ? a : b);
const maxIso = (a: IsoDate, b: IsoDate): IsoDate => (a > b ? a : b);

/** A phase's effective start: min of its children, else its explicit start. */
export function effectiveStart(phase: Phase): IsoDate | null {
  if (phase.children.length > 0) {
    return phase.children.map((c) => c.startDate).reduce(minIso);
  }
  return phase.startDate;
}

/** A phase's effective end: max of its children, else its explicit end. */
export function effectiveEnd(phase: Phase): IsoDate | null {
  if (phase.children.length > 0) {
    return phase.children.map((c) => c.endDate).reduce(maxIso);
  }
  return phase.endDate;
}

/** The full date extent of a roadmap (meta view), or null if it has no dates. */
export function getRoadmapExtent(rm: Roadmap): { start: IsoDate; end: IsoDate } | null {
  let min: IsoDate | null = null;
  let max: IsoDate | null = null;
  for (const phase of rm.rows) {
    const s = effectiveStart(phase);
    const e = effectiveEnd(phase);
    if (s !== null) min = min === null ? s : minIso(min, s);
    if (e !== null) max = max === null ? e : maxIso(max, e);
  }
  if (min === null || max === null) return null;
  return { start: min, end: max };
}

/** Days of breathing room left of today when today would otherwise be the origin. */
const META_LEAD_DAYS = 30;
/** Days of slack past the last thing the window has to cover. */
const META_TAIL_DAYS = 30;
/** Shortest window the "Todos" view ever shows. */
const META_MIN_DAYS = 365;

/**
 * The derived timeline window of the "Todos" view: where its grid starts and
 * how many days it spans.
 *
 * Unlike a roadmap's own window, which the user configures and the roadmap view
 * therefore respects as-is, this one is computed on every render and never
 * persisted. So it is stretched at both ends to always contain `today` — which
 * is what lets that view mark today with no visibility guard. When today already
 * falls inside the roadmaps' own range, neither end moves.
 *
 * `today` is a parameter rather than a `todayIso()` call so this stays pure.
 */
export function getMetaWindow(
  roadmaps: Roadmap[],
  today: IsoDate,
): { origin: IsoDate; windowDays: number } {
  // The lead only ever wins when every roadmap starts after today; otherwise the
  // earliest roadmap takes the minimum and nothing shifts.
  const origin = roadmaps.map((r) => r.startDate).reduce(minIso, addDays(today, -META_LEAD_DAYS));

  let windowDays = Math.max(META_MIN_DAYS, dayIndex(origin, today) + META_TAIL_DAYS);
  for (const rm of roadmaps) {
    const extent = getRoadmapExtent(rm);
    if (extent) {
      windowDays = Math.max(windowDays, dayIndex(origin, extent.end) + META_TAIL_DAYS);
    }
  }
  return { origin, windowDays };
}
