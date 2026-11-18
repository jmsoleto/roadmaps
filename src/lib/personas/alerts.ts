/**
 * The risks a sprint's capacity hides (personas-alertas, D3).
 *
 * Read off the same matrix the engine returns, every time: nothing here is
 * stored, and an alert goes away the moment its cause does. A closed sprint
 * has none, because there is nothing left to act on (D2).
 */

import type { IsoDate } from '../model/types';
import type { SprintCapacity } from './capacity';
import { fmtNumber } from './format';
import type { PersonasData, Sprint } from './model';
import { planCapacity, realCapacity } from './snapshot';

export type Severity = 'critical' | 'warn' | 'info';

export type AlertKind = 'solapamiento' | 'cobertura' | 'capacidad' | 'calendario' | 'localidad';

export interface Alert {
  /** Derived from the rule, so it is the same from one recomputation to the next. */
  id: string;
  kind: AlertKind;
  severity: Severity;
  date: IsoDate | null;
  message: string;
  /** Who is behind it, to open the alert. */
  detail: string[];
}

export const SEVERITY_MARK: Record<Severity, string> = { critical: '▲', warn: '◆', info: 'i' };
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'crítica',
  warn: 'aviso',
  info: 'informativa',
};

const RANK: Record<Severity, number> = { critical: 0, warn: 1, info: 2 };

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** `2027-01-05` → `5 de enero`, as the PRD writes it (§11). */
export function longDay(iso: IsoDate): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
}

/** The plannable capacity a sprint committed to: the plan's once frozen. */
const committed = (s: Sprint, data: PersonasData): number =>
  (planCapacity(s) ?? realCapacity(s, data)).team.planning;

export function sprintAlerts(sprint: Sprint, data: PersonasData): Alert[] {
  if (sprint.status === 'cerrado') return [];
  const c = realCapacity(sprint, data);
  const team = data.teams.find((t) => t.id === sprint.teamId);
  const roleName = (id: string) => data.roles.find((r) => r.id === id)?.name ?? 'sin nombre';
  const out: Alert[] = [
    ...overlaps(c, roleName),
    ...coverage(c, team?.criticalRoleIds ?? [], roleName),
    ...drop(sprint, data, team?.dropThreshold ?? 20),
    ...calendar(sprint, c, data),
  ];
  return out.sort(
    (a, b) =>
      RANK[a.severity] - RANK[b.severity] ||
      (a.date ?? '').localeCompare(b.date ?? '') ||
      a.id.localeCompare(b.id),
  );
}

/** Two or more people of a role off the whole day, on a working day. */
function overlaps(c: SprintCapacity, roleName: (id: string) => string): Alert[] {
  const out: Alert[] = [];
  c.days.forEach((day, i) => {
    if (day.weekend) return;
    const off = new Map<string, string[]>();
    for (const p of c.people) {
      const role = p.person.roleId;
      if (role === null || p.days[i].state !== 'ausencia') continue;
      off.set(role, [...(off.get(role) ?? []), p.person.name]);
    }
    for (const [role, names] of off) {
      if (names.length < 2) continue;
      out.push({
        id: `solape:${role}:${day.date}`,
        kind: 'solapamiento',
        severity: 'warn',
        date: day.date,
        message: `El ${longDay(day.date)} hay ${names.length} ${roleName(role)} ausentes.`,
        detail: names,
      });
    }
  });
  return out;
}

/**
 * A critical role with nobody's hours on a working day — absence, holiday or a
 * 0 % dedication alike, because what matters is whether anyone is there. A role
 * that nobody in the sprint has is one alert, not one per day.
 */
function coverage(
  c: SprintCapacity,
  critical: readonly string[],
  roleName: (id: string) => string,
): Alert[] {
  const out: Alert[] = [];
  for (const role of critical) {
    const holders = c.people.filter((p) => p.person.roleId === role);
    if (holders.length === 0) {
      out.push({
        id: `cobertura:${role}`,
        kind: 'cobertura',
        severity: 'critical',
        date: null,
        message: `No hay nadie con rol ${roleName(role)} en el sprint.`,
        detail: [],
      });
      continue;
    }
    c.days.forEach((day, i) => {
      if (day.weekend) return;
      if (holders.some((p) => p.days[i].net * p.dedication > 0)) return;
      out.push({
        id: `cobertura:${role}:${day.date}`,
        kind: 'cobertura',
        severity: 'critical',
        date: day.date,
        message: `No hay disponibilidad ${roleName(role)} el ${longDay(day.date)}.`,
        detail: holders.map((p) => p.person.name),
      });
    });
  }
  return out;
}

/** Plannable capacity falling more than the team's threshold from its previous sprint. */
function drop(sprint: Sprint, data: PersonasData, threshold: number): Alert[] {
  const previous = data.sprints
    .filter((s) => s.teamId === sprint.teamId && s.id !== sprint.id && s.endDate < sprint.startDate)
    .reduce<Sprint | null>(
      (best, s) => (best === null || s.endDate > best.endDate ? s : best),
      null,
    );
  if (!previous) return [];
  const before = committed(previous, data);
  const now = committed(sprint, data);
  if (before <= 0) return [];
  const fall = (before - now) / before;
  if (fall * 100 <= threshold) return [];
  return [
    {
      id: `capacidad:${sprint.id}`,
      kind: 'capacidad',
      severity: 'warn',
      date: null,
      message: `La capacidad baja un ${fmtNumber(Math.round(fall * 100))} % respecto al sprint anterior.`,
      detail: [`${previous.name}: ${fmtNumber(before)} h`, `${sprint.name}: ${fmtNumber(now)} h`],
    },
  ];
}

/** A location of the sprint's people with no holiday in a year it touches; people with none. */
function calendar(sprint: Sprint, c: SprintCapacity, data: PersonasData): Alert[] {
  const out: Alert[] = [];
  const years: string[] = [];
  for (let y = Number(sprint.startDate.slice(0, 4)); y <= Number(sprint.endDate.slice(0, 4)); y++) {
    years.push(String(y));
  }
  const used = new Map<string, string[]>();
  for (const p of c.people) {
    if (p.person.locationId === null) {
      out.push({
        id: `localidad:${p.person.id}`,
        kind: 'localidad',
        severity: 'info',
        date: null,
        message: `${p.person.name} no tiene localidad: no se le descuenta ningún festivo.`,
        detail: [],
      });
      continue;
    }
    used.set(p.person.locationId, [...(used.get(p.person.locationId) ?? []), p.person.name]);
  }
  for (const [id, names] of used) {
    const loc = data.locations.find((l) => l.id === id);
    if (!loc) continue;
    for (const year of years) {
      if (loc.holidays.some((h) => h.date.startsWith(year))) continue;
      out.push({
        id: `calendario:${id}:${year}`,
        kind: 'calendario',
        severity: 'warn',
        date: null,
        message: `Faltan festivos de ${loc.name} para ${year}.`,
        detail: names,
      });
    }
  }
  return out;
}
