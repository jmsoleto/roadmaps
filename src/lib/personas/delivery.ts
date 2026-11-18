/**
 * What a team delivers with its capacity, and what that lets it propose next
 * (personas-historico, D2 and D4).
 *
 * Pure, like the engine: sprints, their capacities and the catalogue in, the
 * figures out. Nothing here is stored — completion, velocity and productivity
 * are read off the results and the real capacity every time, so they never
 * disagree with them.
 */

import type { SprintCapacity } from './capacity';
import {
  familyOf,
  type FamilyResult,
  type PersonasData,
  type Sprint,
  type Technology,
} from './model';
import { planCapacity, realCapacity } from './snapshot';

export interface Counts {
  plannedStories: number;
  plannedPoints: number;
  completedStories: number;
  completedPoints: number;
}

export interface Delivery extends Counts {
  /** Real plannable hours the points were delivered with. */
  realPlanning: number;
  /** Completed over planned points; `null` when nothing was committed. */
  completion: number | null;
  /** Completed points per 100 real plannable hours; `null` without hours. */
  productivity: number | null;
}

const ZERO: Counts = {
  plannedStories: 0,
  plannedPoints: 0,
  completedStories: 0,
  completedPoints: 0,
};

export function sumCounts(rows: readonly Counts[]): Counts {
  return rows.reduce<Counts>(
    (n, r) => ({
      plannedStories: n.plannedStories + r.plannedStories,
      plannedPoints: n.plannedPoints + r.plannedPoints,
      completedStories: n.completedStories + r.completedStories,
      completedPoints: n.completedPoints + r.completedPoints,
    }),
    ZERO,
  );
}

export function delivery(counts: Counts, realPlanning: number): Delivery {
  return {
    ...counts,
    realPlanning,
    completion: counts.plannedPoints > 0 ? counts.completedPoints / counts.plannedPoints : null,
    productivity: realPlanning > 0 ? (counts.completedPoints / realPlanning) * 100 : null,
  };
}

/**
 * The plannable hours of the people of one family: their available hours less
 * their proportional part of the reserve — the same split the breakdown uses.
 * The adjustment belongs to nobody, so it counts in the team and in no family.
 */
export function familyPlanning(
  c: SprintCapacity,
  techs: readonly Technology[],
  familyId: string,
): number {
  const keep = 1 - c.team.incidentPercentage / 100;
  return c.people.reduce(
    (n, p) =>
      familyOf(techs, p.person.technologyId)?.id === familyId ? n + p.totals.available * keep : n,
    0,
  );
}

export interface SprintDelivery {
  total: Delivery;
  families: (Delivery & { familyId: string })[];
}

export function sprintDelivery(
  results: readonly FamilyResult[],
  real: SprintCapacity,
  techs: readonly Technology[],
): SprintDelivery {
  return {
    total: delivery(sumCounts(results), real.team.planning),
    families: results.map((r) => ({
      familyId: r.familyId,
      ...delivery(r, familyPlanning(real, techs, r.familyId)),
    })),
  };
}

// ---- history ----

export interface HistoryRow {
  sprint: Sprint;
  planPlanning: number;
  delivery: SprintDelivery;
}

/** A team's closed sprints, newest first. */
export function history(data: PersonasData, teamId: string, before?: string): HistoryRow[] {
  return data.sprints
    .filter((s) => s.teamId === teamId && s.status === 'cerrado')
    .filter((s) => before === undefined || s.endDate < before)
    .sort((a, b) => (a.endDate < b.endDate ? 1 : a.endDate > b.endDate ? -1 : 0))
    .map((sprint) => ({
      sprint,
      planPlanning: planCapacity(sprint)?.team.planning ?? 0,
      delivery: sprintDelivery(sprint.results, realCapacity(sprint, data), data.technologies),
    }));
}

/** The mean of the last `n` closed sprints: averages of hours, quotients of sums. */
export function average(rows: readonly HistoryRow[], n: number) {
  const last = rows.slice(0, n);
  if (last.length === 0) return null;
  const counts = sumCounts(last.map((r) => r.delivery.total));
  const hours = last.reduce((t, r) => t + r.delivery.total.realPlanning, 0);
  return {
    count: last.length,
    planPlanning: last.reduce((t, r) => t + r.planPlanning, 0) / last.length,
    realPlanning: hours / last.length,
    plannedPoints: counts.plannedPoints / last.length,
    completedPoints: counts.completedPoints / last.length,
    completion: counts.plannedPoints > 0 ? counts.completedPoints / counts.plannedPoints : null,
    productivity: hours > 0 ? (counts.completedPoints / hours) * 100 : null,
  };
}

// ---- forecast ----

export interface Basis {
  sprintId: string;
  name: string;
  points: number;
  hours: number;
}

export interface Proposal {
  /** Points, unrounded. */
  value: number;
  bases: Basis[];
}

export interface FamilyForecast {
  familyId: string;
  capacity: number;
  last: Proposal | null;
  avg3: Proposal | null;
  avg5: Proposal | null;
}

export interface Forecast {
  capacity: number;
  last: Proposal;
  avg3: Proposal;
  avg5: Proposal;
  families: FamilyForecast[];
}

/** Σ points × capacity ÷ Σ hours over the given bases: one basis is the rule of three. */
function propose(bases: Basis[], capacity: number): Proposal | null {
  if (bases.length === 0) return null;
  const points = bases.reduce((n, b) => n + b.points, 0);
  const hours = bases.reduce((n, b) => n + b.hours, 0);
  return { value: (points * capacity) / hours, bases };
}

/**
 * The points a sprint in planning can reasonably take (D4), from the team's
 * closed sprints that ended before it starts and delivered points with hours.
 * `null` when there is nothing to base it on.
 */
export function forecast(
  data: PersonasData,
  sprint: Sprint,
  capacity: SprintCapacity,
): Forecast | null {
  const rows = history(data, sprint.teamId, sprint.startDate);
  const bases: Basis[] = rows
    .filter((r) => r.delivery.total.completedPoints > 0 && r.delivery.total.realPlanning > 0)
    .map((r) => ({
      sprintId: r.sprint.id,
      name: r.sprint.name,
      points: r.delivery.total.completedPoints,
      hours: r.delivery.total.realPlanning,
    }));
  if (bases.length === 0) return null;
  const cap = capacity.team.planning;

  const familyIds = [...new Set(rows.flatMap((r) => r.delivery.families.map((f) => f.familyId)))];
  const families: FamilyForecast[] = familyIds.map((familyId) => {
    const fb: Basis[] = rows.flatMap((r) => {
      const f = r.delivery.families.find((x) => x.familyId === familyId);
      return f && f.completedPoints > 0 && f.realPlanning > 0
        ? [
            {
              sprintId: r.sprint.id,
              name: r.sprint.name,
              points: f.completedPoints,
              hours: f.realPlanning,
            },
          ]
        : [];
    });
    const fcap = familyPlanning(capacity, data.technologies, familyId);
    return {
      familyId,
      capacity: fcap,
      last: propose(fb.slice(0, 1), fcap),
      avg3: propose(fb.slice(0, 3), fcap),
      avg5: propose(fb.slice(0, 5), fcap),
    };
  });

  return {
    capacity: cap,
    last: propose(bases.slice(0, 1), cap)!,
    avg3: propose(bases.slice(0, 3), cap)!,
    avg5: propose(bases.slice(0, 5), cap)!,
    families,
  };
}

/** `~25 SP (25,3)`: whole and with a decimal (DP-04). */
export function fmtPoints(value: number): string {
  const one = Math.round(value * 10) / 10;
  return `~${Math.round(value)} SP (${String(one).replace('.', ',')})`;
}
