/** Transient UI state: which drawer is open and the floating drag tooltip. */

import { sprintIntersectsWindow } from '../time/segments';
import type { IsoDate } from '../model/types';

export type DrawerState =
  | { kind: 'none' }
  | { kind: 'detail'; phaseId: string; itemId: string | null }
  | { kind: 'assignees' }
  | { kind: 'blockers' }
  | { kind: 'theme' };

class UiStore {
  drawer = $state<DrawerState>({ kind: 'none' });
  /**
   * True while the "new roadmap" dialog is up.
   *
   * Deliberately its own field and not another `DrawerState` variant: a modal
   * is not a drawer, and it may sit over an open one. Folding it into the union
   * would force the theme drawer shut just to ask for a name. It lives here
   * rather than in a component because two of them open it (the topbar button
   * and the "Todos" empty-state call to action).
   */
  newRoadmap = $state<boolean>(false);
  /**
   * El sprint con el foco puesto, por su **número absoluto**, o `null`.
   *
   * Campo propio y no una variante más de `DrawerState`, por la misma razón que
   * ya justificó a `newRoadmap`: son dos cosas que pueden estar a la vez, y aquí
   * tienen que poder. El caso de uso es exactamente ese —ves que alguien va al
   * 120%, abres su item para mirarlo, y el foco tiene que seguir ahí cuando
   * vuelvas—, así que meterlo en la unión apagaría el foco justo cuando más
   * falta hace (D7).
   *
   * El número y no un par de offsets contra la ventana activa: así S12 es el
   * mismo S12 en todos los roadmaps, y la elección sobrevive a cambiar de uno a
   * otro sin recalcular nada.
   *
   * Transitorio, como todo lo de este fichero: nada de `setPref`, nada en
   * `AppData`, y por tanto nada que viaje en la exportación ni sobreviva a
   * recargar.
   */
  selectedSprint = $state<number | null>(null);
  tooltip = $state<{ show: boolean; x: number; y: number; text: string }>({
    show: false,
    x: 0,
    y: 0,
    text: '',
  });

  openDetail(phaseId: string, itemId: string | null): void {
    this.drawer = { kind: 'detail', phaseId, itemId };
  }

  openAssignees(): void {
    this.drawer = { kind: 'assignees' };
  }

  openBlockers(): void {
    this.drawer = { kind: 'blockers' };
  }

  openTheme(): void {
    this.drawer = { kind: 'theme' };
  }

  closeDrawer(): void {
    this.drawer = { kind: 'none' };
  }

  openNewRoadmap(): void {
    this.newRoadmap = true;
  }

  closeNewRoadmap(): void {
    this.newRoadmap = false;
  }

  /**
   * Elegir un sprint, o soltarlo si ya era el elegido.
   *
   * Elegir otro traslada el foco sin pasar por ningún estado intermedio: una
   * sola asignación, así que no hay un fotograma sin foco entre los dos.
   */
  selectSprint(num: number): void {
    this.selectedSprint = this.selectedSprint === num ? null : num;
  }

  clearSprint(): void {
    this.selectedSprint = null;
  }

  /**
   * Soltar el foco si el sprint elegido no se ve en la ventana que se le pasa.
   *
   * Un velo que cubre la rejilla entera y una etiqueta que no está en ninguna
   * parte no son un foco, son una pantalla rota: sin etiqueta a la que volver a
   * pinchar, tampoco habría forma de soltarlo. Soltar es la única lectura
   * honesta de «ese sprint no sale en este roadmap» (D7).
   */
  dropSprintOutOfWindow(startDate: IsoDate, windowDays: number): void {
    if (this.selectedSprint === null) return;
    if (!sprintIntersectsWindow(this.selectedSprint, startDate, windowDays)) this.clearSprint();
  }

  showTooltip(x: number, y: number, text: string): void {
    this.tooltip = { show: true, x, y, text };
  }

  hideTooltip(): void {
    this.tooltip = { ...this.tooltip, show: false };
  }
}

export const ui = new UiStore();
