/**
 * The capacity engine (personas-capacidad, design D4).
 *
 * A pure function: what the calculation needs goes in, the daily matrix and its
 * totals come out. It reads no store, so the snapshot of the next change can
 * freeze its *inputs* and get the whole breakdown back, and so the screen never
 * repeats a formula — it paints this.
 *
 * Per person and day:
 *
 *   weekend                      → nothing at all                 (BR-01)
 *   a holiday of their location  → holiday = h, net = 0           (BR-02)
 *   otherwise, that day's absences
 *                                → absence = min(h, max(hᵢ))      (BR-03, BR-04, DP-06)
 *   net = h − holiday − absence  (≥ 0 by construction)
 *
 * and then the dedication, after everything else (BR-05), and the incident
 * reserve over the team's available capacity (BR-06). Nothing is rounded here
 * (BR-10): `format.ts` rounds when painting.
 */

import { addDays, isWeekend } from '../time/timeline';
import type { IsoDate } from '../model/types';
import type { Absence, AbsenceType, Location, Person, Sprint } from './model';

export type DayState = 'finde' | 'disponible' | 'festivo' | 'ausencia' | 'parcial';

export type DayCause =
  | { kind: 'festivo'; name: string }
  | { kind: 'ausencia'; type: AbsenceType; absenceId: string; comment: string };

export interface PersonDay {
  date: IsoDate;
  state: DayState;
  theoretical: number;
  holiday: number;
  absence: number;
  /** What is left that day, before the dedication. */
  net: number;
  cause: DayCause | null;
}

export interface Totals {
  theoretical: number;
  holiday: number;
  absence: number;
  dedication: number;
  available: number;
}

export interface PersonCapacity {
  person: Person;
  /** The effective dedication, as a fraction: the sprint's own or the default. */
  dedication: number;
  /** Whether the dedication is the sprint's own and not the person's default. */
  overridden: boolean;
  days: PersonDay[];
  totals: Totals;
}

export interface TeamCapacity extends Totals {
  incidentPercentage: number;
  reserve: number;
  planning: number;
}

export interface SprintCapacity {
  days: { date: IsoDate; weekend: boolean }[];
  people: PersonCapacity[];
  team: TeamCapacity;
}

export interface CapacityInput {
  sprint: Pick<Sprint, 'startDate' | 'endDate' | 'incidentPercentage' | 'members'>;
  people: readonly Person[];
  locations: readonly Location[];
  absences: readonly Absence[];
}

/** Every day from start to end, both included. */
export function sprintDays(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const zero = (): Totals => ({
  theoretical: 0,
  holiday: 0,
  absence: 0,
  dedication: 0,
  available: 0,
});

/**
 * Which of a day's absences counts: the one that takes the most hours. On a
 * tie, the whole-day one, then the one that started first — so the cause shown
 * does not depend on the order they were typed in.
 */
function heaviest(list: readonly Absence[], hours: number): { a: Absence; h: number } | null {
  let best: { a: Absence; h: number } | null = null;
  for (const a of list) {
    const h = Math.min(hours, a.hoursPerDay === null ? hours : a.hoursPerDay);
    if (
      best === null ||
      h > best.h ||
      (h === best.h &&
        ((a.hoursPerDay === null && best.a.hoursPerDay !== null) ||
          ((a.hoursPerDay === null) === (best.a.hoursPerDay === null) &&
            a.startDate < best.a.startDate)))
    ) {
      best = { a, h };
    }
  }
  return best;
}

export function computeCapacity(input: CapacityInput): SprintCapacity {
  const { sprint } = input;
  const dates =
    sprint.endDate < sprint.startDate ? [] : sprintDays(sprint.startDate, sprint.endDate);
  const weekend = new Map(dates.map((d) => [d, isWeekend(d)]));

  const holidaysByLocation = new Map<string, Map<IsoDate, string>>();
  for (const loc of input.locations) {
    holidaysByLocation.set(loc.id, new Map(loc.holidays.map((h) => [h.date, h.name])));
  }
  const personById = new Map(input.people.map((p) => [p.id, p]));

  // Only the absences that touch the sprint, grouped by person.
  const absencesBy = new Map<string, Absence[]>();
  for (const a of input.absences) {
    if (a.endDate < sprint.startDate || a.startDate > sprint.endDate) continue;
    const list = absencesBy.get(a.personId) ?? [];
    list.push(a);
    absencesBy.set(a.personId, list);
  }

  const people: PersonCapacity[] = [];
  const team = zero();

  for (const member of sprint.members) {
    const person = personById.get(member.personId);
    if (!person) continue;
    const h = person.hoursPerDay;
    const holidays = person.locationId ? holidaysByLocation.get(person.locationId) : undefined;
    const own = absencesBy.get(person.id) ?? [];
    const totals = zero();
    let net = 0;

    const days: PersonDay[] = dates.map((date) => {
      if (weekend.get(date)) {
        return {
          date,
          state: 'finde',
          theoretical: 0,
          holiday: 0,
          absence: 0,
          net: 0,
          cause: null,
        };
      }
      totals.theoretical += h;
      const holiday = holidays?.get(date);
      if (holiday !== undefined) {
        totals.holiday += h;
        return {
          date,
          state: 'festivo',
          theoretical: h,
          holiday: h,
          absence: 0,
          net: 0,
          cause: { kind: 'festivo', name: holiday },
        };
      }
      const pick = heaviest(
        own.filter((a) => a.startDate <= date && a.endDate >= date),
        h,
      );
      if (pick === null) {
        net += h;
        return {
          date,
          state: 'disponible',
          theoretical: h,
          holiday: 0,
          absence: 0,
          net: h,
          cause: null,
        };
      }
      totals.absence += pick.h;
      net += h - pick.h;
      return {
        date,
        state: pick.h >= h ? 'ausencia' : 'parcial',
        theoretical: h,
        holiday: 0,
        absence: pick.h,
        net: h - pick.h,
        cause: {
          kind: 'ausencia',
          type: pick.a.type,
          absenceId: pick.a.id,
          comment: pick.a.comment,
        },
      };
    });

    const overridden = member.dedication !== null;
    const dedication = (member.dedication ?? person.dedication) / 100;
    totals.available = net * dedication;
    totals.dedication = net - totals.available;

    team.theoretical += totals.theoretical;
    team.holiday += totals.holiday;
    team.absence += totals.absence;
    team.dedication += totals.dedication;
    team.available += totals.available;
    people.push({ person, dedication, overridden, days, totals });
  }

  const reserve = team.available * (sprint.incidentPercentage / 100);
  return {
    days: dates.map((date) => ({ date, weekend: weekend.get(date) ?? false })),
    people,
    team: {
      ...team,
      incidentPercentage: sprint.incidentPercentage,
      reserve,
      planning: team.available - reserve,
    },
  };
}
