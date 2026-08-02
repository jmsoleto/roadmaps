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

/** Earliest ISO start allowed for `item` given its predecessors, or null if none. */
export function getMinStart(phase: Phase, item: Item): IsoDate | null {
  let min: IsoDate | null = null;
  for (const depId of item.dependsOn) {
    const dep = itemById(phase, depId);
    if (!dep) continue;
    const depEnd = dep.isMilestone ? dep.startDate : dep.endDate;
    if (min === null || depEnd > min) min = depEnd;
  }
  return min;
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

/** Cascade dependent items forward until all constraints hold. Returns true if anything changed. */
export function enforceConstraints(rm: Roadmap): boolean {
  let anyChanged = false;
  for (const phase of rm.rows) {
    let changed = true;
    let iter = 0;
    while (changed && iter++ < 200) {
      changed = false;
      for (const item of phase.children) {
        if (item.dependsOn.length === 0) continue;
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
          if (newEnd <= newStart) newEnd = addDays(newStart, 1);
          item.endDate = newEnd;
        }
        changed = true;
        anyChanged = true;
      }
    }
  }
  return anyChanged;
}
