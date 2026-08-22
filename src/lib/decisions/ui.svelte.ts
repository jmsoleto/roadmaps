/**
 * Transient UI state for Decisions: which filter is on and whether the capture
 * dialog is up. Follows the shape of `store/ui.svelte.ts` in Roadmaps.
 *
 * Kept apart from `store.svelte.ts` for the same reason Roadmaps keeps them
 * apart: none of this is persisted, and mixing it in would invite it to be.
 */

import type { Phase } from './model/state';

/** Which slice of the list is showing. */
export type Filter = 'abiertas' | 'borradores' | 'listas' | 'resueltas' | 'todas';

export const FILTERS: { id: Filter; label: string }[] = [
  { id: 'abiertas', label: 'abiertas' },
  { id: 'borradores', label: 'sin traducir' },
  { id: 'listas', label: 'listas' },
  { id: 'resueltas', label: 'cerradas' },
  { id: 'todas', label: 'todas' },
];

/** Whether a decision in `phase` belongs in `filter`. */
export function matchesFilter(filter: Filter, phase: Phase): boolean {
  switch (filter) {
    case 'abiertas':
      return phase !== 'cerrada';
    case 'borradores':
      return phase === 'captura';
    case 'listas':
      // Lapsed ones belong here too: they are ready, just overdue.
      return phase === 'lista' || phase === 'caducada';
    case 'resueltas':
      return phase === 'cerrada';
    case 'todas':
      return true;
  }
}

class DecisionsUi {
  filter = $state<Filter>('abiertas');
  /** Empty means every project. */
  project = $state<string>('');
  capturing = $state<boolean>(false);
  /**
   * Which decision is being presented, or `null`.
   *
   * Transient like everything else here: a presentation is a moment, not a
   * state of the decision, and reopening the app must never land inside one.
   */
  presenting = $state<string | null>(null);

  openCapture(): void {
    this.capturing = true;
  }

  closeCapture(): void {
    this.capturing = false;
  }

  present(id: string): void {
    this.presenting = id;
  }

  /** True while a presentation is on screen. */
  get isPresenting(): boolean {
    return this.presenting !== null;
  }

  endPresentation(): void {
    this.presenting = null;
  }

  setFilter(f: Filter): void {
    this.filter = f;
  }

  setProject(p: string): void {
    this.project = p;
  }
}

export const decisionsUi = new DecisionsUi();
