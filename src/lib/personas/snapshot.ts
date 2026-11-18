/**
 * Freezing a sprint, and the two truths it keeps (personas-plan-real).
 *
 * A snapshot is what the engine received, not what it returned (D1): handed
 * back to `computeCapacity`, it gives the same matrix and the same breakdown
 * as the moment it was taken, whatever has been edited since.
 */

import { computeCapacity, type SprintCapacity, type TeamCapacity } from './capacity';
import type { Absence, Adjustment, CapacitySnapshot, PersonasData, Sprint } from './model';

/** Freeze what the engine needs for a sprint, now, with the data as it is. */
export function takeSnapshot(
  sprint: Sprint,
  data: PersonasData,
  adjustment: Adjustment | null,
  people: readonly string[] = sprint.members.map((m) => m.personId),
  now: Date = new Date(),
): CapacitySnapshot {
  const ids = new Set(people);
  const frozenPeople = data.people.filter((p) => ids.has(p.id)).map((p) => ({ ...p }));
  const byId = new Map(frozenPeople.map((p) => [p.id, p]));
  const members = people
    .filter((id) => byId.has(id))
    .map((personId) => {
      const own = sprint.members.find((m) => m.personId === personId)?.dedication ?? null;
      return { personId, dedication: own ?? byId.get(personId)!.dedication };
    });
  const locIds = new Set(frozenPeople.map((p) => p.locationId));
  const locations = data.locations
    .filter((l) => locIds.has(l.id))
    .map((l) => ({
      id: l.id,
      name: l.name,
      holidays: l.holidays
        .filter((h) => h.date >= sprint.startDate && h.date <= sprint.endDate)
        .map((h) => ({ ...h })),
    }));
  const absences = data.absences
    .filter(
      (a) => ids.has(a.personId) && a.endDate >= sprint.startDate && a.startDate <= sprint.endDate,
    )
    .map((a) => ({ ...a }));
  const snap: Omit<CapacitySnapshot, 'totals'> = {
    takenAt: now.toISOString(),
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    incidentPercentage: sprint.incidentPercentage,
    members,
    people: frozenPeople,
    locations,
    absences,
    adjustment: adjustment ? { ...adjustment } : null,
  };
  return { ...snap, totals: totalsOf(fromSnapshot(snap).team) };
}

function totalsOf(t: TeamCapacity): CapacitySnapshot['totals'] {
  return {
    theoretical: t.theoretical,
    holiday: t.holiday,
    absence: t.absence,
    dedication: t.dedication,
    adjustment: t.adjustment,
    available: t.available,
    reserve: t.reserve,
    planning: t.planning,
  };
}

function fromSnapshot(s: Omit<CapacitySnapshot, 'totals'>): SprintCapacity {
  return computeCapacity({
    sprint: {
      startDate: s.startDate,
      endDate: s.endDate,
      incidentPercentage: s.incidentPercentage,
      members: s.members,
    },
    people: s.people,
    locations: s.locations,
    absences: s.absences,
    adjustment: s.adjustment,
  });
}

/** The frozen capacity, recomputed from its inputs: the breakdown comes back whole. */
export const capacityFromSnapshot = (s: CapacitySnapshot): SprintCapacity => fromSnapshot(s);

/**
 * What a sprint is in reality (D2).
 *
 * In planning, the data as it is. While active, the plan's people and reserve
 * with their data as it is now, the sprint's current dedications and the
 * adjustment. Closed, what was frozen on closing.
 */
export function realCapacity(sprint: Sprint, data: PersonasData): SprintCapacity {
  if (sprint.status === 'cerrado' && sprint.real) return fromSnapshot(sprint.real);
  if (sprint.status === 'activo' && sprint.plan) {
    return fromSnapshot(
      takeSnapshot(
        {
          ...sprint,
          startDate: sprint.plan.startDate,
          endDate: sprint.plan.endDate,
          incidentPercentage: sprint.plan.incidentPercentage,
        },
        data,
        sprint.adjustment,
        sprint.plan.members.map((m) => m.personId),
      ),
    );
  }
  return computeCapacity({
    sprint,
    people: data.people,
    locations: data.locations,
    absences: data.absences,
  });
}

/** What was planned, or `null` for a sprint still in planning. */
export function planCapacity(sprint: Sprint): SprintCapacity | null {
  return sprint.plan ? fromSnapshot(sprint.plan) : null;
}

// ---- comparing ----

export type CompareLine =
  | 'theoretical'
  | 'holiday'
  | 'absence'
  | 'dedication'
  | 'adjustment'
  | 'available'
  | 'reserve'
  | 'planning';

export const COMPARE_LINES: readonly CompareLine[] = [
  'theoretical',
  'holiday',
  'absence',
  'dedication',
  'adjustment',
  'available',
  'reserve',
  'planning',
];

export interface Comparison {
  lines: { line: CompareLine; plan: number; real: number; delta: number }[];
  people: { personId: string; name: string; plan: number; real: number; delta: number }[];
  /** In reality and not in the plan, as they were. */
  appeared: Absence[];
  /** In the plan and no longer in reality. */
  withdrawn: Absence[];
}

const sameAbsence = (a: Absence, b: Absence): boolean =>
  a.id === b.id &&
  a.type === b.type &&
  a.startDate === b.startDate &&
  a.endDate === b.endDate &&
  a.hoursPerDay === b.hoursPerDay;

/**
 * Plan against reality (D4). An absence edited after activation shows on both
 * sides: its planned version withdrawn, its new one appeared — which is what
 * changed.
 */
export function compare(
  plan: SprintCapacity,
  real: SprintCapacity,
  planAbsences: readonly Absence[],
  realAbsences: readonly Absence[],
): Comparison {
  const lines = COMPARE_LINES.map((line) => ({
    line,
    plan: plan.team[line],
    real: real.team[line],
    delta: real.team[line] - plan.team[line],
  }));
  const realBy = new Map(real.people.map((p) => [p.person.id, p]));
  const people = plan.people.map((p) => {
    const r = realBy.get(p.person.id);
    const realAvailable = r?.totals.available ?? 0;
    return {
      personId: p.person.id,
      name: p.person.name,
      plan: p.totals.available,
      real: realAvailable,
      delta: realAvailable - p.totals.available,
    };
  });
  const appeared = realAbsences.filter((a) => !planAbsences.some((b) => sameAbsence(a, b)));
  const withdrawn = planAbsences.filter((a) => !realAbsences.some((b) => sameAbsence(a, b)));
  return { lines, people, appeared, withdrawn };
}

/** The absences that reality is computed from, in the same window as the plan. */
export function realAbsences(sprint: Sprint, data: PersonasData): Absence[] {
  if (sprint.status === 'cerrado' && sprint.real) return sprint.real.absences;
  const s = sprint.plan ?? sprint;
  const ids = new Set((sprint.plan?.members ?? sprint.members).map((m) => m.personId));
  return data.absences.filter(
    (a) => ids.has(a.personId) && a.endDate >= s.startDate && a.startDate <= s.endDate,
  );
}
