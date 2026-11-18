/**
 * What Personas Hub reports to the landing (personas-hub, «La tarjeta…»).
 *
 * Pure, like the other summaries: the data and today in, the card's contract
 * out. No alerts in this change: those are `personas-alertas`, and an invented
 * one would spend the room of a real one.
 */

import type { IsoDate } from '../model/types';
import type { AppSummary, Row } from '../hub/types';
import { computeCapacity } from './capacity';
import { fmtHours } from './format';
import type { PersonasData } from './model';

const LIST_ROWS = 3;

/** Sprints that have not ended, nearest first. */
export function upcomingRows(
  data: PersonasData,
  today: IsoDate,
  slotColor: (slot: number) => string,
): Row[] {
  return data.sprints
    .filter((s) => s.endDate >= today)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0))
    .slice(0, LIST_ROWS)
    .map((s) => {
      const teamIndex = data.teams.findIndex((t) => t.id === s.teamId);
      const team = data.teams[teamIndex];
      const { planning } = computeCapacity({
        sprint: s,
        people: data.people,
        locations: data.locations,
        absences: data.absences,
      }).team;
      return {
        id: s.id,
        color: slotColor(Math.max(0, teamIndex)),
        label: team ? `${team.name} · ${s.name}` : s.name,
        meta: fmtHours(planning),
        metaTone: 'neutral' as const,
      };
    });
}

export function personasSummary(
  data: PersonasData,
  today: IsoDate,
  slotColor: (slot: number) => string,
): AppSummary {
  return {
    stats: [
      { value: data.people.filter((p) => p.active).length, label: 'personas', tone: 'neutral' },
      { value: data.teams.filter((t) => t.active).length, label: 'equipos', tone: 'neutral' },
      {
        value: data.sprints.filter((s) => s.status === 'planificacion').length,
        label: 'en planificación',
        tone: 'neutral',
      },
    ],
    list: {
      label: 'PRÓXIMOS SPRINTS',
      rows: upcomingRows(data, today, slotColor),
      emptyLabel: 'ningún sprint por delante',
    },
    alerts: [],
  };
}
