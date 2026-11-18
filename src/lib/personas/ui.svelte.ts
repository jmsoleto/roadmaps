/**
 * What is open in Personas Hub, and which form is half-filled (personas-hub, D5).
 *
 * Outside the data on purpose: which team you were looking at is not a fact
 * about the team, so it is never saved, never reaches a folder, and entering
 * the application puts it back at its first active team.
 */

import { personas, type PersonasStore } from './store.svelte';

export type TeamTab = 'sprints' | 'personas' | 'ausencias';
export type SprintTab = 'resumen' | 'personas' | 'disponibilidad' | 'comparacion';
export type CatalogTab = 'roles' | 'localidades';

export type View =
  | { kind: 'none' }
  | { kind: 'team'; teamId: string; tab: TeamTab }
  | { kind: 'sprint'; sprintId: string; tab: SprintTab }
  | { kind: 'catalog'; tab: CatalogTab };

/** The absence form: a new one (with what is known) or an existing one. */
export type AbsenceForm =
  | { kind: 'new'; personId: string | null; date: string | null }
  | { kind: 'edit'; absenceId: string };

export type PersonForm = { kind: 'new'; teamId: string } | { kind: 'edit'; personId: string };

export class PersonasUi {
  view = $state<View>({ kind: 'none' });
  creatingTeam = $state(false);
  /** The team a new sprint is being proposed for. */
  creatingSprint = $state<string | null>(null);
  absenceForm = $state<AbsenceForm | null>(null);
  personForm = $state<PersonForm | null>(null);

  constructor(private store: PersonasStore = personas) {}

  /** The team on screen, whether the team itself or one of its sprints is open. */
  get teamId(): string | null {
    const v = this.view;
    if (v.kind === 'team') return v.teamId;
    if (v.kind === 'sprint') return this.store.sprint(v.sprintId)?.teamId ?? null;
    return null;
  }

  closeForms(): void {
    this.creatingTeam = false;
    this.creatingSprint = null;
    this.absenceForm = null;
    this.personForm = null;
  }

  /** The first active team, or nothing: where entering the application lands. */
  home(): void {
    this.closeForms();
    const first = this.store.activeTeams[0];
    this.view = first ? { kind: 'team', teamId: first.id, tab: 'sprints' } : { kind: 'none' };
  }

  openTeam(teamId: string, tab: TeamTab = 'sprints'): void {
    this.closeForms();
    this.view = { kind: 'team', teamId, tab };
  }

  openSprint(sprintId: string, tab: SprintTab = 'resumen'): void {
    if (!this.store.sprint(sprintId)) return;
    this.closeForms();
    this.view = { kind: 'sprint', sprintId, tab };
  }

  openCatalog(tab: CatalogTab): void {
    this.closeForms();
    this.view = { kind: 'catalog', tab };
  }

  /**
   * Start a new sprint where it can be finished: for the open team, or the
   * first active one, or — without teams — by creating the team first.
   */
  startSprint(): void {
    const teamId = this.teamId ?? this.store.activeTeams[0]?.id ?? null;
    if (teamId === null || !this.store.team(teamId)?.active) {
      this.view = { kind: 'none' };
      this.creatingTeam = true;
      return;
    }
    this.openTeam(teamId, 'sprints');
    this.creatingSprint = teamId;
  }

  /** If what is open no longer exists, go home instead of showing a hole. */
  heal(): void {
    const v = this.view;
    if (v.kind === 'team' && !this.store.team(v.teamId)) this.home();
    if (v.kind === 'sprint' && !this.store.sprint(v.sprintId)) this.home();
  }
}

export const personasUi = new PersonasUi();
