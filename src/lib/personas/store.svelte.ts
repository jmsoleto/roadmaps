/**
 * Personas Hub's store: the catalogues, the teams, the people, their absences
 * and the sprints (personas-hub).
 *
 * Synchronous in the browser, like Links Hub (D1); asynchronous only behind a
 * folder, where it says it is opening. Writes are coalesced with a debounce.
 *
 * Every operation that can be refused says why, in a sentence the screen shows
 * as it is: `Outcome` and not an exception, because a dedication of 120 % is
 * something a person types, not a fault.
 *
 * What is open on screen lives in `ui.svelte.ts`, not here: it is each person's
 * and never reaches the data (`folder-persistence`).
 */

import type { DocBackend, DataSource } from '../folder/doc-backend';
import type { Unavailability } from '../folder/file-sync';
import { todayIso } from '../time/timeline';
import type { SprintCapacity } from './capacity';
import { planCapacity, realCapacity, takeSnapshot } from './snapshot';
import { festivosClient, type Client } from './festivos-api';
import { mergeHolidays, parseHolidays, pasteNotice, readDate } from './holidays';
import {
  emptyData,
  isBlank,
  isInAnySprint,
  newAbsence,
  newLocation,
  newPerson,
  newRole,
  newSprint,
  newTeam,
  newTechnology,
  peopleOf,
  type Absence,
  type AbsenceDraft,
  type FamilyResult,
  type Location,
  type Municipality,
  type Person,
  type PersonDraft,
  type PersonasData,
  type Role,
  type Sprint,
  type SprintDraft,
  type Team,
  type Technology,
} from './model';
import { hoursOk, normalize, percentOk } from './normalize';
import { proposeSprint } from './sprint-defaults';
import { LocalPersonasBackend, type PersonasBackend } from './storage';

const SAVE_DEBOUNCE_MS = 300;

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Outcome<T> => ({ ok: true, value });
const no = <T>(error: string): Outcome<T> => ({ ok: false, error });

export const MSG = {
  name: 'El nombre no puede estar vacío.',
  hours: 'Las horas por día deben ser mayores que 0 y no pasar de 24.',
  dedication: 'La dedicación debe estar entre 0 y 100 %.',
  reserve: 'La reserva de incidencias debe estar entre 0 y 100 %.',
  dates: 'La fecha de fin no puede ser anterior a la de inicio.',
  date: 'La fecha no es válida.',
  partial: 'Las horas de una ausencia parcial deben ser mayores que 0.',
  team: 'El equipo no existe o está inactivo.',
  down: 'Personas Hub no está disponible.',
  frozen: 'El sprint ya está activo: sus fechas, su reserva y sus personas quedaron en el plan.',
  closed: 'El sprint está cerrado: ya no cambia.',
  reason: 'El ajuste necesita un motivo.',
  committed: 'Lo comprometido quedó congelado al activar el sprint.',
} as const;

type FolderBackend = DocBackend<PersonasData> & { source: 'folder' };

const inFolder = (b: PersonasBackend | DocBackend<PersonasData>): b is FolderBackend =>
  (b as DocBackend<PersonasData>).source === 'folder';

const validRange = (start: string, end: string): string | null => {
  if (readDate(start) === null || readDate(end) === null) return MSG.date;
  return end < start ? MSG.dates : null;
};

export class PersonasStore {
  private backend: PersonasBackend | DocBackend<PersonasData>;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  data = $state<PersonasData>(emptyData());
  ready = $state<boolean>(true);
  unavailable = $state<{ reason: string; why?: Unavailability } | null>(null);
  saveError = $state<string | null>(null);

  constructor(backend: PersonasBackend | DocBackend<PersonasData> = new LocalPersonasBackend()) {
    this.backend = backend;
  }

  get source(): DataSource {
    return inFolder(this.backend) ? 'folder' : 'browser';
  }

  get pending(): boolean {
    return this.saveTimer !== null || (inFolder(this.backend) && !!this.backend.pending);
  }

  settled(): Promise<void> {
    return inFolder(this.backend)
      ? (this.backend.settled?.() ?? Promise.resolve())
      : Promise.resolve();
  }

  useBackend(backend: PersonasBackend | DocBackend<PersonasData>): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.backend = backend;
  }

  init(): void | Promise<void> {
    this.saveError = null;
    if (!inFolder(this.backend)) {
      this.data = (this.backend as PersonasBackend).load();
      this.unavailable = null;
      this.ready = true;
      return;
    }
    return this.initFromFolder(this.backend);
  }

  private async initFromFolder(backend: FolderBackend): Promise<void> {
    this.ready = false;
    const out = await backend.load();
    if (out.kind === 'unavailable') {
      this.data = emptyData();
      this.unavailable = { reason: out.reason, why: out.why };
    } else {
      this.data = out.kind === 'loaded' ? normalize(out.data) : emptyData();
      this.unavailable = null;
    }
    this.ready = true;
  }

  expectFolder(): void {
    this.ready = false;
  }

  /** Nothing may be created or written over data that has not been read. */
  get down(): boolean {
    return !this.ready || this.unavailable !== null;
  }

  // ---- reading ----

  team(id: string | null): Team | null {
    return this.data.teams.find((t) => t.id === id) ?? null;
  }
  person(id: string | null): Person | null {
    return this.data.people.find((p) => p.id === id) ?? null;
  }
  sprint(id: string | null): Sprint | null {
    return this.data.sprints.find((s) => s.id === id) ?? null;
  }
  location(id: string | null): Location | null {
    return this.data.locations.find((l) => l.id === id) ?? null;
  }
  role(id: string | null): Role | null {
    return this.data.roles.find((r) => r.id === id) ?? null;
  }
  technology(id: string | null): Technology | null {
    return this.data.technologies.find((t) => t.id === id) ?? null;
  }

  get activeTeams(): Team[] {
    return this.data.teams.filter((t) => t.active);
  }

  /**
   * What the sprint is in reality: in planning it follows its people; active,
   * its plan's people with their data as it is now; closed, frozen
   * (personas-plan-real, D2).
   */
  capacityOf(sprint: Sprint): SprintCapacity {
    return realCapacity(sprint, this.data);
  }

  /** What was planned, frozen on activation; `null` while in planning. */
  planOf(sprint: Sprint): SprintCapacity | null {
    return planCapacity(sprint);
  }

  absencesOf(personId: string): Absence[] {
    return this.data.absences.filter((a) => a.personId === personId);
  }

  // ---- shared catalogue rules ----

  private named<T extends { name: string }>(list: T[], make: () => T, name: string): Outcome<T> {
    if (this.down) return no(MSG.down);
    if (name.trim() === '') return no(MSG.name);
    const item = make();
    list.push(item);
    this.schedule();
    return ok(item);
  }

  private rename(item: { name: string } | null | undefined, name: string): Outcome<null> {
    if (!item) return no('No existe.');
    if (name.trim() === '') return no(MSG.name);
    item.name = name.trim();
    this.schedule();
    return ok(null);
  }

  private setActive(item: { active: boolean } | null | undefined, active: boolean): void {
    if (!item) return;
    item.active = active;
    this.schedule();
  }

  // ---- roles ----

  addRole(name: string): Outcome<Role> {
    return this.named(this.data.roles, () => newRole(name), name);
  }
  renameRole(id: string, name: string): Outcome<null> {
    return this.rename(this.role(id), name);
  }
  setRoleActive(id: string, active: boolean): void {
    this.setActive(this.role(id), active);
  }
  roleInUse(id: string): boolean {
    return this.data.people.some((p) => p.roleId === id);
  }
  deleteRole(id: string): Outcome<null> {
    if (this.roleInUse(id)) return no('El rol lo tiene alguna persona: solo se puede inactivar.');
    this.data.roles = this.data.roles.filter((r) => r.id !== id);
    this.schedule();
    return ok(null);
  }

  // ---- technologies ----

  addTechnology(name: string, parentId: string | null): Outcome<Technology> {
    if (parentId !== null && this.technology(parentId)?.parentId !== null) {
      return no('Una tecnología va dentro de una familia.');
    }
    return this.named(this.data.technologies, () => newTechnology(name, parentId), name);
  }
  renameTechnology(id: string, name: string): Outcome<null> {
    return this.rename(this.technology(id), name);
  }
  setTechnologyActive(id: string, active: boolean): void {
    this.setActive(this.technology(id), active);
  }
  technologyInUse(id: string): boolean {
    return (
      this.data.people.some((p) => p.technologyId === id) ||
      this.data.technologies.some((t) => t.parentId === id)
    );
  }
  deleteTechnology(id: string): Outcome<null> {
    if (this.technologyInUse(id)) {
      return no('La tecnología está en uso o tiene tecnologías dentro: solo se puede inactivar.');
    }
    this.data.technologies = this.data.technologies.filter((t) => t.id !== id);
    this.schedule();
    return ok(null);
  }

  // ---- locations and holidays ----

  addLocation(name: string): Outcome<Location> {
    return this.named(this.data.locations, () => newLocation(name), name);
  }
  renameLocation(id: string, name: string): Outcome<null> {
    return this.rename(this.location(id), name);
  }
  setLocationActive(id: string, active: boolean): void {
    this.setActive(this.location(id), active);
  }
  locationInUse(id: string): boolean {
    return this.data.people.some((p) => p.locationId === id);
  }
  deleteLocation(id: string): Outcome<null> {
    if (this.locationInUse(id)) {
      return no('La localidad la tiene alguna persona: solo se puede inactivar.');
    }
    this.data.locations = this.data.locations.filter((l) => l.id !== id);
    this.schedule();
    return ok(null);
  }

  addHoliday(locationId: string, date: string, name: string): Outcome<string> {
    const loc = this.location(locationId);
    if (!loc) return no('No existe.');
    const iso = readDate(date.trim());
    if (iso === null) return no(MSG.date);
    const out = mergeHolidays(loc.holidays, [{ date: iso, name: name.trim() || 'Festivo' }]);
    if (out.added === 0) return no('Esa fecha ya es festivo de esta localidad.');
    loc.holidays = out.holidays;
    this.schedule();
    return ok(iso);
  }

  /** Paste a list of holidays; returns the sentence that says what happened. */
  pasteHolidays(locationId: string, text: string): string {
    const loc = this.location(locationId);
    if (!loc) return '';
    const { holidays, rejected } = parseHolidays(text);
    const out = mergeHolidays(loc.holidays, holidays);
    if (out.added > 0) {
      loc.holidays = out.holidays;
      this.schedule();
    }
    return pasteNotice(out.added, out.repeated, rejected);
  }

  /** Link a location to a municipality, or unlink it with `null`. Its holidays stay. */
  setLocationMunicipality(locationId: string, m: Municipality | null): void {
    const loc = this.location(locationId);
    if (!loc) return;
    if (m === null) delete loc.municipality;
    else loc.municipality = { ...m };
    this.schedule();
  }

  /**
   * Import a year of the linked municipality's holidays (personas-festivos-api, D6):
   * the same merge as a paste, so nothing already there is duplicated or renamed.
   * Returns the sentence the screen shows; on any failure nothing changes.
   */
  async importHolidays(
    locationId: string,
    year: number,
    client: Client = festivosClient(),
  ): Promise<string> {
    const muni = this.location(locationId)?.municipality;
    if (!muni) return '';
    const r = await client.holidays(year, muni);
    if (!r.ok) {
      return r.error === 'no-publicado'
        ? `Los festivos de ${year} todavía no están publicados.`
        : 'No se pudieron importar los festivos. Inténtalo más tarde.';
    }
    // The location may have gone, or changed municipality, while the answer came.
    const loc = this.location(locationId);
    if (!loc?.municipality || loc.municipality.ine !== muni.ine) return '';
    const out = mergeHolidays(loc.holidays, r.value);
    if (out.added > 0) {
      loc.holidays = out.holidays;
      this.schedule();
    }
    return pasteNotice(out.added, out.repeated, []);
  }

  removeHoliday(locationId: string, date: string): void {
    const loc = this.location(locationId);
    if (!loc) return;
    loc.holidays = loc.holidays.filter((h) => h.date !== date);
    this.schedule();
  }

  // ---- teams ----

  addTeam(name: string, description = ''): Outcome<Team> {
    return this.named(this.data.teams, () => newTeam(name, description), name);
  }
  updateTeam(id: string, patch: { name?: string; description?: string }): Outcome<null> {
    const team = this.team(id);
    if (!team) return no('No existe.');
    if (patch.name !== undefined && patch.name.trim() === '') return no(MSG.name);
    if (patch.name !== undefined) team.name = patch.name.trim();
    if (patch.description !== undefined) team.description = patch.description.trim();
    this.schedule();
    return ok(null);
  }
  /** Mark or unmark a role as critical for a team (DP-05; personas-alertas). */
  setCriticalRole(teamId: string, roleId: string, critical: boolean): void {
    const team = this.team(teamId);
    if (!team || !this.role(roleId)) return;
    const rest = team.criticalRoleIds.filter((id) => id !== roleId);
    team.criticalRoleIds = critical ? [...rest, roleId] : rest;
    this.schedule();
  }

  setDropThreshold(teamId: string, threshold: number): Outcome<null> {
    const team = this.team(teamId);
    if (!team) return no('No existe.');
    if (!percentOk(threshold)) return no('El umbral debe estar entre 0 y 100 %.');
    team.dropThreshold = threshold;
    this.schedule();
    return ok(null);
  }

  setTeamActive(id: string, active: boolean): void {
    this.setActive(this.team(id), active);
  }
  teamHasHistory(id: string): boolean {
    return (
      this.data.people.some((p) => p.teamId === id) ||
      this.data.sprints.some((s) => s.teamId === id)
    );
  }
  deleteTeam(id: string): Outcome<null> {
    if (this.teamHasHistory(id)) {
      return no('El equipo tiene personas o sprints: solo se puede inactivar.');
    }
    this.data.teams = this.data.teams.filter((t) => t.id !== id);
    this.schedule();
    return ok(null);
  }

  // ---- people ----

  private personProblem(d: Partial<PersonDraft>): string | null {
    if (d.name !== undefined && d.name.trim() === '') return MSG.name;
    if (d.hoursPerDay !== undefined && !hoursOk(d.hoursPerDay)) return MSG.hours;
    if (d.dedication !== undefined && !percentOk(d.dedication)) return MSG.dedication;
    if (d.teamId !== undefined && !this.team(d.teamId)) return MSG.team;
    return null;
  }

  addPerson(draft: PersonDraft): Outcome<Person> {
    if (this.down) return no(MSG.down);
    const problem = this.personProblem(draft);
    if (problem) return no(problem);
    const person = newPerson(draft);
    this.data.people.push(person);
    this.schedule();
    return ok(person);
  }

  updatePerson(id: string, patch: Partial<PersonDraft>): Outcome<null> {
    const person = this.person(id);
    if (!person) return no('No existe.');
    const problem = this.personProblem(patch);
    if (problem) return no(problem);
    Object.assign(person, patch, patch.name !== undefined ? { name: patch.name.trim() } : {});
    this.schedule();
    return ok(null);
  }

  setPersonActive(id: string, active: boolean): void {
    this.setActive(this.person(id), active);
  }

  /** Someone already in a sprint is deactivated, never deleted (RF-03). */
  deletePerson(id: string): Outcome<null> {
    if (isInAnySprint(this.data, id)) {
      return no('La persona está en algún sprint: solo se puede inactivar.');
    }
    this.data.people = this.data.people.filter((p) => p.id !== id);
    this.data.absences = this.data.absences.filter((a) => a.personId !== id);
    this.schedule();
    return ok(null);
  }

  // ---- absences ----

  private absenceProblem(d: AbsenceDraft): string | null {
    if (!this.person(d.personId)) return 'La persona no existe.';
    const range = validRange(d.startDate, d.endDate);
    if (range) return range;
    if (d.hoursPerDay !== null && !(Number.isFinite(d.hoursPerDay) && d.hoursPerDay > 0)) {
      return MSG.partial;
    }
    return null;
  }

  addAbsence(draft: AbsenceDraft): Outcome<Absence> {
    if (this.down) return no(MSG.down);
    const problem = this.absenceProblem(draft);
    if (problem) return no(problem);
    const absence = newAbsence(draft);
    this.data.absences.push(absence);
    this.schedule();
    return ok(absence);
  }

  updateAbsence(id: string, draft: AbsenceDraft): Outcome<null> {
    const absence = this.data.absences.find((a) => a.id === id);
    if (!absence) return no('No existe.');
    const problem = this.absenceProblem(draft);
    if (problem) return no(problem);
    Object.assign(absence, draft, { comment: draft.comment.trim() });
    this.schedule();
    return ok(null);
  }

  deleteAbsence(id: string): void {
    this.data.absences = this.data.absences.filter((a) => a.id !== id);
    this.schedule();
  }

  // ---- sprints ----

  propose(teamId: string, today = todayIso()): SprintDraft {
    return proposeSprint(this.data, teamId, today);
  }

  private sprintProblem(d: Partial<SprintDraft>): string | null {
    if (d.name !== undefined && d.name.trim() === '') return MSG.name;
    if (d.incidentPercentage !== undefined && !percentOk(d.incidentPercentage)) return MSG.reserve;
    if (d.startDate !== undefined && d.endDate !== undefined)
      return validRange(d.startDate, d.endDate);
    return null;
  }

  /** A new sprint brings every active person of the team, at their default. */
  addSprint(draft: SprintDraft): Outcome<Sprint> {
    if (this.down) return no(MSG.down);
    const team = this.team(draft.teamId);
    if (!team || !team.active) return no(MSG.team);
    const problem = this.sprintProblem(draft);
    if (problem) return no(problem);
    const members = peopleOf(this.data, team.id)
      .filter((p) => p.active)
      .map((p) => ({ personId: p.id, dedication: null }));
    const sprint = newSprint(draft, members);
    this.data.sprints.push(sprint);
    this.schedule();
    return ok(sprint);
  }

  updateSprint(id: string, patch: Partial<Omit<SprintDraft, 'teamId'>>): Outcome<null> {
    const sprint = this.sprint(id);
    if (!sprint) return no('No existe.');
    const frozenKeys = ['startDate', 'endDate', 'incidentPercentage'] as const;
    if (
      sprint.status !== 'planificacion' &&
      frozenKeys.some((k) => patch[k] !== undefined && patch[k] !== sprint[k])
    ) {
      return no(MSG.frozen);
    }
    const problem = this.sprintProblem({
      ...patch,
      startDate: patch.startDate ?? sprint.startDate,
      endDate: patch.endDate ?? sprint.endDate,
    });
    if (problem) return no(problem);
    Object.assign(sprint, patch, patch.name !== undefined ? { name: patch.name.trim() } : {});
    this.schedule();
    return ok(null);
  }

  /** Only a sprint in planning is deleted: the others are history. */
  deleteSprint(id: string): Outcome<null> {
    const sprint = this.sprint(id);
    if (!sprint) return no('No existe.');
    if (sprint.status !== 'planificacion') return no(MSG.frozen);
    this.data.sprints = this.data.sprints.filter((s) => s.id !== id);
    this.schedule();
    return ok(null);
  }

  /** Freeze the plan (personas-plan-real). No way back. */
  activateSprint(id: string, now = new Date()): Outcome<null> {
    const sprint = this.sprint(id);
    if (!sprint) return no('No existe.');
    if (sprint.status !== 'planificacion') return no(MSG.frozen);
    sprint.plan = takeSnapshot(
      $state.snapshot(sprint) as Sprint,
      $state.snapshot(this.data) as PersonasData,
      null,
      undefined,
      now,
    );
    sprint.status = 'activo';
    this.schedule();
    return ok(null);
  }

  /** Freeze reality, adjustment included, the way activating froze the plan. */
  closeSprint(id: string, now = new Date()): Outcome<null> {
    const sprint = this.sprint(id);
    if (!sprint) return no('No existe.');
    if (sprint.status !== 'activo' || !sprint.plan) {
      return no(sprint.status === 'cerrado' ? MSG.closed : 'Solo se cierra un sprint activo.');
    }
    const s = $state.snapshot(sprint) as Sprint;
    const plan = s.plan!;
    sprint.real = takeSnapshot(
      {
        ...s,
        startDate: plan.startDate,
        endDate: plan.endDate,
        incidentPercentage: plan.incidentPercentage,
      },
      $state.snapshot(this.data) as PersonasData,
      s.adjustment,
      plan.members.map((m) => m.personId),
      now,
    );
    sprint.adjustment = null;
    sprint.status = 'cerrado';
    this.schedule();
    return ok(null);
  }

  /** Adjust reality while active: hours, positive or negative, and why. */
  setAdjustment(id: string, adjustment: { hours: number; reason: string } | null): Outcome<null> {
    const sprint = this.sprint(id);
    if (!sprint) return no('No existe.');
    if (sprint.status !== 'activo') {
      return no(
        sprint.status === 'cerrado' ? MSG.closed : 'Solo se ajusta lo real de un sprint activo.',
      );
    }
    if (adjustment !== null) {
      if (!Number.isFinite(adjustment.hours)) return no('El ajuste debe ser un número de horas.');
      if (adjustment.reason.trim() === '') return no(MSG.reason);
    }
    sprint.adjustment =
      adjustment === null || adjustment.hours === 0
        ? null
        : { hours: adjustment.hours, reason: adjustment.reason.trim() };
    this.schedule();
    return ok(null);
  }

  addMember(sprintId: string, personId: string): void {
    const sprint = this.sprint(sprintId);
    const person = this.person(personId);
    if (!sprint || !person || person.teamId !== sprint.teamId) return;
    if (sprint.status !== 'planificacion') return;
    if (sprint.members.some((m) => m.personId === personId)) return;
    sprint.members.push({ personId, dedication: null });
    this.schedule();
  }

  removeMember(sprintId: string, personId: string): void {
    const sprint = this.sprint(sprintId);
    if (!sprint || sprint.status !== 'planificacion') return;
    sprint.members = sprint.members.filter((m) => m.personId !== personId);
    this.schedule();
  }

  /** `null` puts the person's default back (RF-10). */
  setMemberDedication(
    sprintId: string,
    personId: string,
    dedication: number | null,
  ): Outcome<null> {
    const sprint = this.sprint(sprintId);
    const member = sprint?.members.find((m) => m.personId === personId);
    if (!sprint || !member) return no('No existe.');
    if (sprint.status === 'cerrado') return no(MSG.closed);
    if (dedication !== null && !percentOk(dedication)) return no(MSG.dedication);
    member.dedication = dedication;
    this.schedule();
    return ok(null);
  }

  // ---- results (personas-historico, D3) ----

  /** Give a family a row in a sprint's results; only before it is closed. */
  addResultFamily(sprintId: string, familyId: string): Outcome<null> {
    const sprint = this.sprint(sprintId);
    const family = this.technology(familyId);
    if (!sprint || !family || family.parentId !== null) return no('No existe.');
    if (sprint.status === 'cerrado') return no(MSG.closed);
    if (sprint.results.some((r) => r.familyId === familyId)) return ok(null);
    sprint.results.push({
      familyId,
      plannedStories: 0,
      plannedPoints: 0,
      completedStories: 0,
      completedPoints: 0,
    });
    this.schedule();
    return ok(null);
  }

  /** Remove a family's row; only in planning, where nothing has been delivered. */
  removeResultFamily(sprintId: string, familyId: string): Outcome<null> {
    const sprint = this.sprint(sprintId);
    if (!sprint) return no('No existe.');
    if (sprint.status !== 'planificacion') return no(MSG.committed);
    sprint.results = sprint.results.filter((r) => r.familyId !== familyId);
    this.schedule();
    return ok(null);
  }

  /**
   * Write committed or delivered figures. Committed only in planning (frozen on
   * activation), delivered only while active (frozen on closing).
   */
  setResult(
    sprintId: string,
    familyId: string,
    patch: Partial<Omit<FamilyResult, 'familyId'>>,
  ): Outcome<null> {
    const sprint = this.sprint(sprintId);
    const row = sprint?.results.find((r) => r.familyId === familyId);
    if (!sprint || !row) return no('No existe.');
    const planned = patch.plannedPoints !== undefined || patch.plannedStories !== undefined;
    const completed = patch.completedPoints !== undefined || patch.completedStories !== undefined;
    if (planned && sprint.status !== 'planificacion') return no(MSG.committed);
    if (completed && sprint.status !== 'activo') {
      return no(
        sprint.status === 'cerrado' ? MSG.closed : 'Lo terminado se apunta con el sprint activo.',
      );
    }
    for (const v of Object.values(patch)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        return no('Las historias y los Story Points son números mayores o iguales que 0.');
      }
    }
    Object.assign(row, patch);
    this.schedule();
    return ok(null);
  }

  // ---- restore ----

  /** Restore a document, only over a blank Personas Hub (D8). */
  restore(data: PersonasData): Outcome<null> {
    if (this.down) return no(MSG.down);
    if (!isBlank(this.data)) {
      return no(
        'Personas Hub ya tiene datos: la importación solo restaura en un Personas Hub vacío.',
      );
    }
    this.data = data;
    this.schedule();
    return ok(null);
  }

  // ---- persistence ----

  private schedule(): void {
    if (this.down) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  }

  flush(): void | Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.down) return;
    const data = $state.snapshot(this.data) as PersonasData;
    if (!inFolder(this.backend)) {
      (this.backend as PersonasBackend).save(data);
      return;
    }
    return this.flushToFolder(this.backend, data);
  }

  private async flushToFolder(backend: FolderBackend, data: PersonasData): Promise<void> {
    try {
      await backend.save(data);
      await backend.settled?.();
      this.saveError = null;
    } catch (e) {
      this.saveError = e instanceof Error ? e.message : String(e);
    }
  }
}

export const personas = new PersonasStore();
