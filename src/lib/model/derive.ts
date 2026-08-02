/** Pure derivations over the data model (no reactivity, easy to test). */

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
