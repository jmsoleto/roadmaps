/**
 * Personas Hub's data: catalogues, teams, people, absences and sprints
 * (personas-hub, D2).
 *
 * One normalised document with references by id. The entities the PRD splits
 * into tables (`SprintPerson`, `SprintMetrics`, the snapshot) are, without a
 * relational database, the same object — the sprint — and live inside it.
 *
 * Percentages are stored as the user writes them (`50`, `33.3`) and become a
 * fraction only inside the engine (BR-10). Dates are ISO days, handled in UTC
 * through `time/timeline.ts`, so no time zone can move a holiday to another day.
 */

import type { IsoDate } from '../model/types';
import { uid } from '../util/id';

export interface Role {
  id: string;
  name: string;
  active: boolean;
}

/** A family when `parentId` is `null`; a technology inside that family otherwise. */
export interface Technology {
  id: string;
  name: string;
  parentId: string | null;
  active: boolean;
}

export interface Holiday {
  date: IsoDate;
  name: string;
}

/**
 * The municipality a location takes its holidays from, as calendariosnacionales.com
 * names it (personas-festivos-api, D5). The slugs build the URL; `ine` and
 * `name` let it be shown without the network, and identify it if the slugs
 * ever change.
 */
export interface Municipality {
  ccaa: string;
  province: string;
  slug: string;
  ine: string;
  name: string;
  /** The province and community, as they are shown next to the name. */
  provinceName: string;
  ccaaName: string;
}

/** A working calendar. Its holidays have no identity of their own: a date. */
export interface Location {
  id: string;
  name: string;
  active: boolean;
  holidays: Holiday[];
  /** Absent until the location is linked: data from before the link reads as it was. */
  municipality?: Municipality;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  active: boolean;
  /** Roles this team cannot be left without (DP-05; personas-alertas). */
  criticalRoleIds: string[];
  /** A drop in plannable capacity above this percentage is flagged. */
  dropThreshold: number;
}

export interface Person {
  id: string;
  teamId: string;
  name: string;
  roleId: string | null;
  technologyId: string | null;
  locationId: string | null;
  hoursPerDay: number;
  /** Default dedication to this team, as a percentage 0–100. */
  dedication: number;
  active: boolean;
}

export const ABSENCE_TYPES = [
  'vacaciones',
  'baja',
  'permiso',
  'formacion',
  'asuntos-propios',
  'otra',
] as const;

export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export const ABSENCE_LABEL: Record<AbsenceType, string> = {
  vacaciones: 'vacaciones',
  baja: 'baja médica',
  permiso: 'permiso',
  formacion: 'formación',
  'asuntos-propios': 'asuntos propios',
  otra: 'otra',
};

/**
 * The mark each absence carries in the daily matrix, so a day reads without
 * colour. `F` is the holiday's, so formation gets two letters.
 */
export const ABSENCE_MARK: Record<AbsenceType, string> = {
  vacaciones: 'V',
  baja: 'B',
  permiso: 'P',
  formacion: 'Fo',
  'asuntos-propios': 'A',
  otra: 'O',
};

export interface Absence {
  id: string;
  personId: string;
  type: AbsenceType;
  startDate: IsoDate;
  endDate: IsoDate;
  /** Hours off each day; `null` is the whole day. */
  hoursPerDay: number | null;
  comment: string;
}

/** Planning, then active, then closed; never back (personas-plan-real). */
export type SprintStatus = 'planificacion' | 'activo' | 'cerrado';

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  planificacion: 'en planificación',
  activo: 'activo',
  cerrado: 'cerrado',
};

/** Hours added to (or taken from) the real capacity, with why (personas-plan-real, D3). */
export interface Adjustment {
  hours: number;
  reason: string;
}

/**
 * What the engine received when a sprint was frozen (personas-plan-real, D1):
 * its inputs, not its output, so the breakdown comes back whole.
 */
export interface CapacitySnapshot {
  takenAt: string;
  startDate: IsoDate;
  endDate: IsoDate;
  incidentPercentage: number;
  /** The dedication already resolved: never `null` here. */
  members: { personId: string; dedication: number }[];
  people: Person[];
  locations: { id: string; name: string; holidays: Holiday[] }[];
  absences: Absence[];
  adjustment: Adjustment | null;
  /** The team figures that were seen, kept as a check. */
  totals: {
    theoretical: number;
    holiday: number;
    absence: number;
    dedication: number;
    adjustment: number;
    available: number;
    reserve: number;
    planning: number;
  };
}

export interface SprintMember {
  personId: string;
  /** The sprint's own dedication, or `null` for the person's default (RF-10). */
  dedication: number | null;
}

export interface Sprint {
  id: string;
  teamId: string;
  name: string;
  startDate: IsoDate;
  endDate: IsoDate;
  status: SprintStatus;
  /** Percentage of the available capacity kept for incidents, 0–100. */
  incidentPercentage: number;
  members: SprintMember[];
  /** Frozen on activation. */
  plan: CapacitySnapshot | null;
  /** Frozen on closing. */
  real: CapacitySnapshot | null;
  /** Only while active. */
  adjustment: Adjustment | null;
  /** What was committed and delivered, one row per family used (personas-historico, D1). */
  results: FamilyResult[];
}

export interface FamilyResult {
  familyId: string;
  plannedStories: number;
  plannedPoints: number;
  completedStories: number;
  completedPoints: number;
}

export interface PersonasData {
  roles: Role[];
  technologies: Technology[];
  locations: Location[];
  teams: Team[];
  people: Person[];
  absences: Absence[];
  sprints: Sprint[];
}

/**
 * The technology tree the PRD starts from (§10).
 *
 * Fixed ids so two browsers that start empty agree on them, and an import from
 * one into the other does not see two different «APP».
 */
export function seedTechnologies(): Technology[] {
  const fam = (id: string, name: string): Technology => ({
    id,
    name,
    parentId: null,
    active: true,
  });
  const tech = (id: string, name: string, parentId: string): Technology => ({
    id,
    name,
    parentId,
    active: true,
  });
  return [
    fam('tec-app', 'APP'),
    tech('tec-app-front', 'App Front', 'tec-app'),
    tech('tec-app-back', 'App Back / Gateway', 'tec-app'),
    tech('tec-app-qa', 'QA', 'tec-app'),
    fam('tec-web', 'WEB'),
    tech('tec-web-web', 'Web', 'tec-web'),
    tech('tec-web-qa', 'QA', 'tec-web'),
    fam('tec-backend', 'BACKEND'),
    tech('tec-backend-backend', 'Backend', 'tec-backend'),
  ];
}

/** What a new Personas Hub holds: nothing but the technology tree. */
export function emptyData(): PersonasData {
  return {
    roles: [],
    technologies: seedTechnologies(),
    locations: [],
    teams: [],
    people: [],
    absences: [],
    sprints: [],
  };
}

/** No team, no person, no sprint: what an import may restore over (D8). */
export function isBlank(data: PersonasData): boolean {
  return data.teams.length === 0 && data.people.length === 0 && data.sprints.length === 0;
}

// ---- factories ----

export const DEFAULT_HOURS = 8;
export const DEFAULT_DEDICATION = 100;
export const DEFAULT_INCIDENTS = 15;
export const DEFAULT_DROP_THRESHOLD = 20;

export const newRole = (name: string): Role => ({
  id: uid('rol'),
  name: name.trim(),
  active: true,
});

export const newTechnology = (name: string, parentId: string | null): Technology => ({
  id: uid('tec'),
  name: name.trim(),
  parentId,
  active: true,
});

export const newLocation = (name: string): Location => ({
  id: uid('loc'),
  name: name.trim(),
  active: true,
  holidays: [],
});

export const newTeam = (name: string, description = ''): Team => ({
  id: uid('team'),
  name: name.trim(),
  description: description.trim(),
  active: true,
  criticalRoleIds: [],
  dropThreshold: DEFAULT_DROP_THRESHOLD,
});

export type PersonDraft = Omit<Person, 'id' | 'active'>;

export const newPerson = (draft: PersonDraft): Person => ({
  id: uid('per'),
  ...draft,
  name: draft.name.trim(),
  active: true,
});

export type AbsenceDraft = Omit<Absence, 'id'>;

export const newAbsence = (draft: AbsenceDraft): Absence => ({
  id: uid('aus'),
  ...draft,
  comment: draft.comment.trim(),
});

export type SprintDraft = Omit<
  Sprint,
  'id' | 'status' | 'members' | 'plan' | 'real' | 'adjustment' | 'results'
>;

export const newSprint = (draft: SprintDraft, members: SprintMember[]): Sprint => ({
  id: uid('sprint'),
  ...draft,
  name: draft.name.trim(),
  status: 'planificacion',
  members,
  plan: null,
  real: null,
  adjustment: null,
  results: [],
});

// ---- reading ----

export const familyOf = (techs: readonly Technology[], id: string | null): Technology | null => {
  const t = techs.find((x) => x.id === id);
  if (!t) return null;
  return t.parentId === null ? t : (techs.find((x) => x.id === t.parentId) ?? null);
};

/** «QA · APP» for a technology, «APP» for a family, `''` for none. */
export function technologyLabel(techs: readonly Technology[], id: string | null): string {
  const t = techs.find((x) => x.id === id);
  if (!t) return '';
  if (t.parentId === null) return t.name;
  const fam = techs.find((x) => x.id === t.parentId);
  return fam ? `${t.name} · ${fam.name}` : t.name;
}

/** Sprints of a team, newest first. */
export function sprintsOf(data: PersonasData, teamId: string): Sprint[] {
  return data.sprints
    .filter((s) => s.teamId === teamId)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0));
}

export const peopleOf = (data: PersonasData, teamId: string): Person[] =>
  data.people.filter((p) => p.teamId === teamId);

export const isInAnySprint = (data: PersonasData, personId: string): boolean =>
  data.sprints.some((s) => s.members.some((m) => m.personId === personId));
