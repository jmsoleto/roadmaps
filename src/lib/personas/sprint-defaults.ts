/**
 * What a new sprint proposes (personas-hub, «Sprints en planificación»).
 *
 * The next number of the team's last sprint, starting the working day after it
 * ends, two weeks long and with the same reserve — the four things that are
 * almost always the same as last time, so creating a sprint is confirming them.
 */

import { addDays, dayOfWeek } from '../time/timeline';
import type { IsoDate } from '../model/types';
import { DEFAULT_INCIDENTS, type PersonasData, type SprintDraft } from './model';

/** Two working weeks from a Monday: Monday to the Friday after next. */
export const SPRINT_LENGTH_DAYS = 12;

/** The first Monday on or after a day. */
function mondayFrom(iso: IsoDate): IsoDate {
  const w = dayOfWeek(iso);
  return addDays(iso, w === 1 ? 0 : (8 - w) % 7);
}

/** The next working day after a day. */
function workdayAfter(iso: IsoDate): IsoDate {
  let d = addDays(iso, 1);
  while (dayOfWeek(d) === 0 || dayOfWeek(d) === 6) d = addDays(d, 1);
  return d;
}

export function nextName(previous: string | null, count: number): string {
  const m = previous ? /^(.*?)(\d+)\s*$/.exec(previous) : null;
  if (m) return `${m[1]}${Number(m[2]) + 1}`;
  return `Sprint ${count + 1}`;
}

export function proposeSprint(data: PersonasData, teamId: string, today: IsoDate): SprintDraft {
  const own = data.sprints.filter((s) => s.teamId === teamId);
  const last = own.reduce<(typeof own)[number] | null>(
    (best, s) => (best === null || s.endDate > best.endDate ? s : best),
    null,
  );
  const startDate = last ? workdayAfter(last.endDate) : mondayFrom(today);
  return {
    teamId,
    name: nextName(last?.name ?? null, own.length),
    startDate,
    endDate: addDays(startDate, SPRINT_LENGTH_DAYS - 1),
    incidentPercentage: last?.incidentPercentage ?? DEFAULT_INCIDENTS,
  };
}
