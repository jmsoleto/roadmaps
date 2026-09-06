/**
 * Dependency constraints (ported from the original `enforceConstraints`,
 * `getMinStartForItem`, `wouldCreateCycle`), operating in ISO-date space.
 *
 * A dependent item may not start before all its predecessors finish. When a
 * predecessor moves, dependents are cascaded forward (snapped to a workday).
 */

import type { Item, Phase, Roadmap, IsoDate } from './types';
import { addDays, dayIndex, isWeekend, snapForward, snapToWorkday } from '../time/timeline';

function itemById(phase: Phase, id: string): Item | undefined {
  return phase.children.find((c) => c.id === id);
}

/**
 * Earliest ISO start allowed for `item` given its predecessors, or null if none.
 *
 * **Depends on the end date being inclusive**, and that is the whole subtlety:
 * `endDate` is the last day the predecessor *occupies*, so the earliest a
 * dependent may start is the day after it, never that same date. Returning the
 * end itself — which is what this did until the convention changed — reads as
 * "right after" only while the end is exclusive, and as a day of overlap once
 * it is not.
 *
 * A milestone goes through the same rule, on purpose. Since the end became
 * inclusive its diamond owns its column exactly as a bar owns its own, and a
 * day-granularity calendar cannot hold both "the milestone occupies Friday" and
 * "Friday is free for whatever follows it". If the other semantics is ever
 * needed, what is needed is a configurable lag, not an exception hidden here.
 *
 * The weekend is **not** this function's business: `enforceConstraints` runs
 * `snapForward` over what comes out of here, so the working-calendar rule stays
 * in one place instead of two.
 */
export function getMinStart(phase: Phase, item: Item): IsoDate | null {
  let last: IsoDate | null = null;
  for (const depId of item.dependsOn) {
    const dep = itemById(phase, depId);
    if (!dep) continue;
    const depEnd = dep.isMilestone ? dep.startDate : dep.endDate;
    if (last === null || depEnd > last) last = depEnd;
  }
  return last === null ? null : addDays(last, 1);
}

/** Would adding `candidate` as a dependency of `target` create a cycle? */
export function wouldCreateCycle(phase: Phase, target: Item, candidate: Item): boolean {
  if (target.id === candidate.id) return true;
  const visited = new Set<string>();
  const stack = [candidate.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === target.id) return true;
    if (visited.has(id)) continue;
    visited.add(id);
    const it = itemById(phase, id);
    if (it) for (const d of it.dependsOn) stack.push(d);
  }
  return false;
}

/**
 * Cascade dependent items forward until all constraints hold. Returns true if
 * anything changed.
 *
 * Completed items are skipped: they are frozen in time (D4). Under rule B this
 * skip is never load-bearing — a completed item's predecessors are completed
 * too, hence frozen too, so its `minStart` can no longer rise and the cascade
 * would have nothing to do. It is here as the last of the four guards, for the
 * document that arrives already inconsistent.
 *
 * Skipping is only about moving them. `getMinStart` still counts a completed
 * predecessor's end, because an open item does have to start after the work it
 * follows, finished or not.
 */
export function enforceConstraints(rm: Roadmap): boolean {
  let anyChanged = false;
  for (const phase of rm.rows) {
    let changed = true;
    let iter = 0;
    while (changed && iter++ < 200) {
      changed = false;
      for (const item of phase.children) {
        if (item.dependsOn.length === 0 || item.completedDate !== null) continue;
        const minStart = getMinStart(phase, item);
        if (minStart === null || item.startDate >= minStart) continue;
        if (item.isMilestone) {
          const newStart = snapForward(minStart);
          item.startDate = newStart;
          item.endDate = newStart;
        } else {
          const dur = dayIndex(item.startDate, item.endDate);
          const newStart = snapForward(minStart);
          item.startDate = newStart;
          let newEnd = addDays(newStart, dur);
          if (isWeekend(newEnd)) newEnd = snapToWorkday(newEnd);
          // `<` y no `<=`: con el fin inclusivo, un item de un día es legal (D3),
          // y empujarlo a dos sería alargar el trabajo por cascadearlo. El guarda
          // sigue estando porque `snapToWorkday` puede tirar del fin hacia atrás.
          if (newEnd < newStart) newEnd = newStart;
          item.endDate = newEnd;
        }
        changed = true;
        anyChanged = true;
      }
    }
  }
  return anyChanged;
}
