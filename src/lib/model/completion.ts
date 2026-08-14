/**
 * Pure derivations over item completion (no reactivity, easy to test).
 *
 * Three ideas carry this file:
 *
 *  - **Absence is the unfinished state.** `completedDate` alone says whether an
 *    item is done and when (D2). There is no boolean to keep in step with it.
 *  - **Dependencies impose the order, not the permission.** An item cannot be
 *    completed while a predecessor is still open (rule B). That is what makes
 *    freezing coherent: a completed item's predecessors are completed too, so
 *    they are frozen too, so `enforceConstraints` can never need to push a
 *    completed item forward (D4).
 *  - **Two slips, and the gap between them.** One against the committed plan,
 *    one against the last forecast. The first resists dragging, the second does
 *    not, and their difference is exactly how much the plan moved (D6).
 *
 * Blockers deliberately play no part here: an item with unresolved external
 * dependencies can still be completed (D3).
 */

import { dayIndex } from '../time/timeline';
import type { Item, Phase } from './types';

/** Whether an item's work is closed. The single reading of the completion state. */
export function isCompleted(item: Item): boolean {
  return item.completedDate !== null;
}

/**
 * Predecessors of `item`, within its phase, that are not completed yet.
 *
 * Ids that no longer resolve are skipped rather than treated as pending, the
 * same way `getMinStart` skips them: a deleted predecessor constrains nothing.
 */
export function pendingPredecessors(phase: Phase, item: Item): Item[] {
  const out: Item[] = [];
  for (const id of item.dependsOn) {
    const dep = phase.children.find((c) => c.id === id);
    if (dep && !isCompleted(dep)) out.push(dep);
  }
  return out;
}

/** Whether `item` may be completed right now (rule B). */
export function canComplete(phase: Phase, item: Item): boolean {
  return pendingPredecessors(phase, item).length === 0;
}

/**
 * Completed items that depend on `item`, directly or through a chain — the
 * reach of the cascade that uncompleting it drags along (D9).
 *
 * The walk crosses items whatever their state and collects only the completed
 * ones. Under rule B an open item never has completed dependents, so crossing
 * them changes nothing in practice; it is what keeps the count honest if a
 * hand-edited document ever arrives in a state the rule forbids.
 */
export function completedDependents(phase: Phase, item: Item): Item[] {
  const out: Item[] = [];
  const seen = new Set<string>([item.id]);
  const stack = [item.id];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of phase.children) {
      if (seen.has(child.id) || !child.dependsOn.includes(id)) continue;
      seen.add(child.id);
      stack.push(child.id);
      if (isCompleted(child)) out.push(child);
    }
  }
  return out;
}

/**
 * Calendar days between the committed plan and the day the work closed, or
 * `null` when either end is missing.
 *
 * Positive means late, negative means early. `null` rather than zero when there
 * is no baseline: an item added after the plan has no drift to report, and
 * reporting zero would claim it landed exactly on a date nobody ever set.
 *
 * Calendar days and not workdays, because the plan's own dates are calendar
 * dates and "fifteen days late" is what gets said out loud.
 */
export function slipVsBaseline(item: Item): number | null {
  if (item.completedDate === null || item.baselineEnd === null) return null;
  return dayIndex(item.baselineEnd, item.completedDate);
}

/** The same, against the end date the item carried when it was completed. */
export function slipVsForecast(item: Item): number | null {
  if (item.completedDate === null || item.endAtCompletion === null) return null;
  return dayIndex(item.endAtCompletion, item.completedDate);
}

/**
 * How much of a phase is done, as a rounded percentage, or `null` when the
 * phase has no items.
 *
 * Counted per item, never weighted by duration (D8): milestones span zero days
 * and would vanish from a weighted measure, so a phase whose only outstanding
 * work was its delivery milestone would read 100%.
 *
 * `null` and not zero for an empty phase — zero percent asserts that none of
 * something has been done, and there is no something.
 */
export function phaseProgress(phase: Phase): number | null {
  const total = phase.children.length;
  if (total === 0) return null;
  const done = phase.children.filter(isCompleted).length;
  return Math.round((done / total) * 100);
}
