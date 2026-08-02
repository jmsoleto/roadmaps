/** Transient UI state: which drawer is open and the floating drag tooltip. */

export type DrawerState =
  | { kind: 'none' }
  | { kind: 'detail'; phaseId: string; itemId: string | null }
  | { kind: 'assignees' };

class UiStore {
  drawer = $state<DrawerState>({ kind: 'none' });
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

  closeDrawer(): void {
    this.drawer = { kind: 'none' };
  }

  showTooltip(x: number, y: number, text: string): void {
    this.tooltip = { show: true, x, y, text };
  }

  hideTooltip(): void {
    this.tooltip = { ...this.tooltip, show: false };
  }
}

export const ui = new UiStore();
