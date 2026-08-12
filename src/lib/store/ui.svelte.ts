/** Transient UI state: which drawer is open and the floating drag tooltip. */

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

  showTooltip(x: number, y: number, text: string): void {
    this.tooltip = { show: true, x, y, text };
  }

  hideTooltip(): void {
    this.tooltip = { ...this.tooltip, show: false };
  }
}

export const ui = new UiStore();
