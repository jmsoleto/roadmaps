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
  DEFAULT_DROP_THRESHOLD,
  DEFAULT_HOURS,
  DEFAULT_INCIDENTS,
  emptyData,
  type Absence,
  type AbsenceType,
  type Adjustment,
  type CapacitySnapshot,
  type FamilyResult,
  type Holiday,
  type Location,
  type Municipality,
  type PersonasData,
  type Person,
  type Role,
  type Sprint,
  type SprintMember,
  type SprintStatus,
  type Team,
  type Technology,
} from './model';

export class Inconsistent extends Error {}

const RESULT_KEYS = [
  'plannedStories',
  'plannedPoints',
  'completedStories',
  'completedPoints',
] as const;

const TOTAL_KEYS = [
  'theoretical',
  'holiday',
  'absence',
  'dedication',
  'adjustment',
  'available',
  'reserve',
  'planning',
] as const;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown, fallback = true): boolean => (typeof v === 'boolean' ? v : fallback);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const hasId = (v: unknown): v is Obj & { id: string } =>
  isObj(v) && typeof v.id === 'string' && v.id !== '';

const SLUG = /^[a-z0-9-]+$/;

/** A municipality link, or `null` when any part of it is missing or could not build a URL. */
function municipality(v: unknown): Municipality | null {
  if (!isObj(v)) return null;
  const slugs = [v.ccaa, v.province, v.slug];
  const texts = [v.ine, v.name, v.provinceName, v.ccaaName];
  if (!slugs.every((x) => typeof x === 'string' && SLUG.test(x))) return null;
  if (!texts.every((x) => typeof x === 'string' && x !== '')) return null;
  return {
    ccaa: v.ccaa as string,
    province: v.province as string,
    slug: v.slug as string,
    ine: v.ine as string,
    name: v.name as string,
    provinceName: v.provinceName as string,
    ccaaName: v.ccaaName as string,
  };
}

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
    const loc: Location = {
      id: o.id as string,
      name: str(o.name),
      active: bool(o.active),
      holidays,
    };
    if (o.municipality !== undefined && o.municipality !== null) {
      const m = municipality(o.municipality);
      if (m) loc.municipality = m;
      else fail('municipio');
    }
    return loc;
  });

  const roleIdsForTeams = new Set(roles.map((r) => r.id));
  const teams = read<Team>('teams', 'equipo', (o) => {
    const threshold = num(o.dropThreshold);
    if (o.dropThreshold !== undefined && (threshold === null || !percentOk(threshold))) {
      fail('umbral');
    }
    const critical = Array.isArray(o.criticalRoleIds) ? o.criticalRoleIds : [];
    const criticalRoleIds = [
      ...new Set(
        critical.filter((id): id is string => typeof id === 'string' && roleIdsForTeams.has(id)),
      ),
    ];
    if (criticalRoleIds.length !== critical.length) fail('rol crítico');
    return {
      id: o.id as string,
      name: str(o.name),
      description: str(o.description),
      active: bool(o.active),
      criticalRoleIds,
      dropThreshold:
        threshold !== null && percentOk(threshold) ? threshold : DEFAULT_DROP_THRESHOLD,
    };
  });
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

  /**
   * A frozen snapshot (personas-plan-real, D1, D6): read with the same rules as
   * the live data, but against its own copies — the people it froze, not the
   * people there are now. A damaged one is `null`; in strict mode it refuses.
   */
  function snapshot(raw: unknown): CapacitySnapshot | null {
    if (raw === null || raw === undefined) return null;
    const bad = (): null => {
      fail('snapshot');
      return null;
    };
    if (!isObj(raw)) return bad();
    if (!isIsoDate(raw.startDate) || !isIsoDate(raw.endDate) || raw.endDate < raw.startDate) {
      return bad();
    }
    const pct = num(raw.incidentPercentage);
    if (pct === null || !percentOk(pct)) return bad();
    const frozenPeople: Person[] = [];
    for (const p of Array.isArray(raw.people) ? raw.people : []) {
      if (!hasId(p) || typeof p.teamId !== 'string') return bad();
      const h = num(p.hoursPerDay);
      const d = num(p.dedication);
      if (h === null || !hoursOk(h) || d === null || !percentOk(d)) return bad();
      frozenPeople.push({
        id: p.id,
        teamId: p.teamId,
        name: str(p.name),
        roleId: typeof p.roleId === 'string' ? p.roleId : null,
        technologyId: typeof p.technologyId === 'string' ? p.technologyId : null,
        locationId: typeof p.locationId === 'string' ? p.locationId : null,
        hoursPerDay: h,
        dedication: d,
        active: bool(p.active),
      });
    }
    const frozenIds = new Set(frozenPeople.map((p) => p.id));
    const members: CapacitySnapshot['members'] = [];
    for (const m of Array.isArray(raw.members) ? raw.members : []) {
      const d = isObj(m) ? num(m.dedication) : null;
      if (!isObj(m) || typeof m.personId !== 'string' || !frozenIds.has(m.personId)) return bad();
      if (d === null || !percentOk(d)) return bad();
      members.push({ personId: m.personId, dedication: d });
    }
    const frozenLocations: CapacitySnapshot['locations'] = [];
    for (const l of Array.isArray(raw.locations) ? raw.locations : []) {
      if (!hasId(l) || !Array.isArray(l.holidays)) return bad();
      const holidays: Holiday[] = [];
      for (const h of l.holidays) {
        if (!isObj(h) || !isIsoDate(h.date)) return bad();
        holidays.push({ date: h.date, name: str(h.name, 'Festivo') });
      }
      frozenLocations.push({ id: l.id, name: str(l.name), holidays });
    }
    const frozenAbsences: Absence[] = [];
    for (const a of Array.isArray(raw.absences) ? raw.absences : []) {
      if (!hasId(a) || typeof a.personId !== 'string' || !frozenIds.has(a.personId)) return bad();
      if (!isIsoDate(a.startDate) || !isIsoDate(a.endDate) || a.endDate < a.startDate) return bad();
      const h = num(a.hoursPerDay);
      if (a.hoursPerDay !== null && (h === null || h <= 0)) return bad();
      frozenAbsences.push({
        id: a.id,
        personId: a.personId,
        type: (ABSENCE_TYPES as readonly string[]).includes(a.type as string)
          ? (a.type as AbsenceType)
          : 'otra',
        startDate: a.startDate,
        endDate: a.endDate,
        hoursPerDay: h,
        comment: str(a.comment),
      });
    }
    const t = isObj(raw.totals) ? raw.totals : {};
    const totals = {} as CapacitySnapshot['totals'];
    for (const k of TOTAL_KEYS) {
      const v = num(t[k]);
      if (v === null) return bad();
      totals[k] = v;
    }
    return {
      takenAt: str(raw.takenAt),
      startDate: raw.startDate,
      endDate: raw.endDate,
      incidentPercentage: pct,
      members,
      people: frozenPeople,
      locations: frozenLocations,
      absences: frozenAbsences,
      adjustment: adjustment(raw.adjustment),
      totals,
    };
  }

  function adjustment(raw: unknown): Adjustment | null {
    if (raw === null || raw === undefined) return null;
    const h = isObj(raw) ? num(raw.hours) : null;
    if (!isObj(raw) || h === null || typeof raw.reason !== 'string' || raw.reason.trim() === '') {
      fail('ajuste');
      return null;
    }
    return { hours: h, reason: raw.reason };
  }

  const familyIds = new Set(techs.filter((t) => t.parentId === null).map((t) => t.id));

  /** One row per family that exists; counts that are not numbers ≥ 0 refuse it. */
  function results(raw: unknown): FamilyResult[] {
    const out: FamilyResult[] = [];
    for (const r of Array.isArray(raw) ? raw : []) {
      if (!isObj(r) || typeof r.familyId !== 'string' || !familyIds.has(r.familyId)) {
        fail('resultado');
        continue;
      }
      if (out.some((x) => x.familyId === r.familyId)) continue;
      const counts = RESULT_KEYS.map((k) => (r[k] === undefined ? 0 : num(r[k])));
      if (counts.some((n) => n === null || n < 0)) {
        fail('resultado');
        continue;
      }
      const [plannedStories, plannedPoints, completedStories, completedPoints] = counts as number[];
      out.push({
        familyId: r.familyId,
        plannedStories,
        plannedPoints,
        completedStories,
        completedPoints,
      });
    }
    return out;
  }

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
    const plan = snapshot(o.plan);
    const real = snapshot(o.real);
    // A state is only as far along as its snapshots allow: an active sprint
    // without a readable plan goes back to planning rather than invent one.
    let status: SprintStatus = 'planificacion';
    if (o.status === 'activo' || o.status === 'cerrado') {
      if (plan === null) fail('estado sin plan');
      else if (o.status === 'cerrado' && real === null) {
        fail('cerrado sin real');
        status = 'activo';
      } else status = o.status;
    }
    return {
      id: o.id as string,
      teamId: o.teamId,
      name: str(o.name),
      startDate: o.startDate,
      endDate: o.endDate,
      status,
      incidentPercentage: pct !== null && percentOk(pct) ? pct : DEFAULT_INCIDENTS,
      members,
      plan: status === 'planificacion' ? null : plan,
      real: status === 'cerrado' ? real : null,
      adjustment: status === 'activo' ? adjustment(o.adjustment) : null,
      results: results(o.results),
    };
  });

  return { roles, technologies: techs, locations, teams, people, absences, sprints };
}
