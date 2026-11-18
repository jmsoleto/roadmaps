/**
 * Reading whatever was stored — null, an earlier version, a file edited by hand
 * — into a valid `PersonasData` (personas-hub, D2).
 *
 * The same reader for the browser, the folder and the import, which is what
 * keeps "what a usable person is" in one place.
 *
 * Two modes, and the difference is deliberate (D8):
 *
 *  - **tolerant** (load): what has no id, or points at something that is not
 *    there, falls out and the rest comes in. Losing one broken absence costs
 *    less than an application that does not open.
 *  - **strict** (import): the same reading, but anything that would fall out
 *    refuses the whole document. A restore that half-enters computes a
 *    different capacity without saying so.
 */

import { isIsoDate } from '../time/timeline';
import {
  ABSENCE_TYPES,
  DEFAULT_DEDICATION,
  DEFAULT_HOURS,
  DEFAULT_INCIDENTS,
  emptyData,
  type Absence,
  type AbsenceType,
  type Holiday,
  type Location,
  type PersonasData,
  type Person,
  type Role,
  type Sprint,
  type SprintMember,
  type Team,
  type Technology,
} from './model';

export class Inconsistent extends Error {}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback = true): boolean => (typeof v === 'boolean' ? v : fallback);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const hasId = (v: unknown): v is Obj & { id: string } =>
  isObj(v) && typeof v.id === 'string' && v.id !== '';

// ---- ranges, shared with the store's validation ----

/** Hours per day: more than 0, at most 24. */
export const hoursOk = (h: number): boolean => Number.isFinite(h) && h > 0 && h <= 24;
/** A percentage: 0 to 100, both included, decimals allowed. */
export const percentOk = (p: number): boolean => Number.isFinite(p) && p >= 0 && p <= 100;

export function normalize(raw: unknown, strict = false): PersonasData {
  const fail = (what: string): void => {
    if (strict) throw new Inconsistent(what);
  };
  if (!isObj(raw)) {
    if (strict) throw new Inconsistent('no es un documento de Personas Hub');
    return emptyData();
  }
  const list = (key: string): unknown[] => {
    const v = raw[key];
    if (v === undefined) return [];
    if (!Array.isArray(v)) {
      fail(key);
      return [];
    }
    return v;
  };
  /** Keep the first of each id; a second one would hide the first on save. */
  function unique<T extends { id: string }>(items: T[], what: string): T[] {
    const seen = new Set<string>();
    return items.filter((i) => {
      if (seen.has(i.id)) {
        fail(`${what} repetido`);
        return false;
      }
      seen.add(i.id);
      return true;
    });
  }
  function read<T extends { id: string }>(key: string, what: string, f: (o: Obj) => T | null): T[] {
    const out: T[] = [];
    for (const item of list(key)) {
      const v = hasId(item) ? f(item) : null;
      if (v === null) fail(what);
      else out.push(v);
    }
    return unique(out, what);
  }

  const roles = read<Role>('roles', 'rol', (o) => ({
    id: o.id as string,
    name: str(o.name),
    active: bool(o.active),
  }));

  // An empty store keeps the PRD's tree; a store that lists technologies says
  // which, including none at all.
  const technologies =
    raw.technologies === undefined
      ? emptyData().technologies
      : read<Technology>('technologies', 'tecnología', (o) => ({
          id: o.id as string,
          name: str(o.name),
          parentId: typeof o.parentId === 'string' ? o.parentId : null,
          active: bool(o.active),
        }));
  // Two levels only: a parent must be a family that exists.
  const families = new Set(technologies.filter((t) => t.parentId === null).map((t) => t.id));
  const techs = technologies.filter((t) => {
    if (t.parentId === null || families.has(t.parentId)) return true;
    fail('tecnología sin familia');
    return false;
  });

  const locations = read<Location>('locations', 'localidad', (o) => {
    const holidays: Holiday[] = [];
    const dates = new Set<string>();
    for (const h of Array.isArray(o.holidays) ? o.holidays : []) {
      if (!isObj(h) || !isIsoDate(h.date)) {
        fail('festivo');
        continue;
      }
      if (dates.has(h.date)) continue;
      dates.add(h.date);
      holidays.push({ date: h.date, name: str(h.name, 'Festivo') });
    }
    holidays.sort((a, b) => (a.date < b.date ? -1 : 1));
    return { id: o.id as string, name: str(o.name), active: bool(o.active), holidays };
  });

  const teams = read<Team>('teams', 'equipo', (o) => ({
    id: o.id as string,
    name: str(o.name),
    description: str(o.description),
    active: bool(o.active),
  }));
  const teamIds = new Set(teams.map((t) => t.id));
  const ref = (ids: Set<string>, v: unknown): string | null =>
    typeof v === 'string' && ids.has(v) ? v : null;
  const roleIds = new Set(roles.map((r) => r.id));
  const techIds = new Set(techs.map((t) => t.id));
  const locIds = new Set(locations.map((l) => l.id));

  const people = read<Person>('people', 'persona', (o) => {
    if (typeof o.teamId !== 'string' || !teamIds.has(o.teamId)) return null;
    // A dangling catalogue reference is cleared rather than dropping the person.
    for (const [k, ids] of [
      ['roleId', roleIds],
      ['technologyId', techIds],
      ['locationId', locIds],
    ] as const) {
      if (o[k] !== null && o[k] !== undefined && ref(ids, o[k]) === null) fail(`${k} roto`);
    }
    const hours = num(o.hoursPerDay);
    const ded = num(o.dedication);
    if ((hours !== null && !hoursOk(hours)) || (ded !== null && !percentOk(ded))) fail('rango');
    return {
      id: o.id as string,
      teamId: o.teamId,
      name: str(o.name),
      roleId: ref(roleIds, o.roleId),
      technologyId: ref(techIds, o.technologyId),
      locationId: ref(locIds, o.locationId),
      hoursPerDay: hours !== null && hoursOk(hours) ? hours : DEFAULT_HOURS,
      dedication: ded !== null && percentOk(ded) ? ded : DEFAULT_DEDICATION,
      active: bool(o.active),
    };
  });
  const personIds = new Set(people.map((p) => p.id));

  const absences = read<Absence>('absences', 'ausencia', (o) => {
    if (typeof o.personId !== 'string' || !personIds.has(o.personId)) return null;
    if (!isIsoDate(o.startDate) || !isIsoDate(o.endDate) || o.endDate < o.startDate) return null;
    const type = (ABSENCE_TYPES as readonly string[]).includes(o.type as string)
      ? (o.type as AbsenceType)
      : 'otra';
    const h = num(o.hoursPerDay);
    if (o.hoursPerDay !== null && o.hoursPerDay !== undefined && (h === null || h <= 0)) {
      return null;
    }
    return {
      id: o.id as string,
      personId: o.personId,
      type,
      startDate: o.startDate,
      endDate: o.endDate,
      hoursPerDay: h,
      comment: str(o.comment),
    };
  });

  const sprints = read<Sprint>('sprints', 'sprint', (o) => {
    if (typeof o.teamId !== 'string' || !teamIds.has(o.teamId)) return null;
    if (!isIsoDate(o.startDate) || !isIsoDate(o.endDate) || o.endDate < o.startDate) return null;
    const pct = num(o.incidentPercentage);
    if (pct !== null && !percentOk(pct)) fail('rango');
    const members: SprintMember[] = [];
    const seen = new Set<string>();
    for (const m of Array.isArray(o.members) ? o.members : []) {
      if (!isObj(m) || typeof m.personId !== 'string' || !personIds.has(m.personId)) {
        fail('participante');
        continue;
      }
      if (seen.has(m.personId)) continue;
      seen.add(m.personId);
      const d = num(m.dedication);
      if (d !== null && !percentOk(d)) fail('rango');
      members.push({ personId: m.personId, dedication: d !== null && percentOk(d) ? d : null });
    }
    return {
      id: o.id as string,
      teamId: o.teamId,
      name: str(o.name),
      startDate: o.startDate,
      endDate: o.endDate,
      status: 'planificacion',
      incidentPercentage: pct !== null && percentOk(pct) ? pct : DEFAULT_INCIDENTS,
      members,
    };
  });

  return { roles, technologies: techs, locations, teams, people, absences, sprints };
}
