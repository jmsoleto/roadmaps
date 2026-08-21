/**
 * Transient UI state for Decisions: which filter is on and whether the capture
 * dialog is up. Follows the shape of `store/ui.svelte.ts` in Roadmaps.
 *
 * Kept apart from `store.svelte.ts` for the same reason Roadmaps keeps them
 * apart: none of this is persisted, and mixing it in would invite it to be.
 */

import type { DecisionState } from './model/state';

/** Which slice of the list is showing. */
export type Filter = 'abiertas' | 'borradores' | 'resueltas' | 'todas';

export const FILTERS: { id: Filter; label: string }[] = [
  { id: 'abiertas', label: 'abiertas' },
  { id: 'borradores', label: 'sin traducir' },
  { id: 'resueltas', label: 'resueltas' },
  { id: 'todas', label: 'todas' },
];

/** Whether a decision in `state` belongs in `filter`. */
export function matchesFilter(filter: Filter, state: DecisionState): boolean {
  switch (filter) {
    case 'abiertas':
      return state !== 'resuelta';
    case 'borradores':
      return state === 'borrador';
    case 'resueltas':
      return state === 'resuelta';
    case 'todas':
      return true;
  }
}

class DecisionsUi {
  filter = $state<Filter>('abiertas');
  /** Empty means every project. */
  project = $state<string>('');
  capturing = $state<boolean>(false);

  openCapture(): void {
    this.capturing = true;
  }

  closeCapture(): void {
    this.capturing = false;
  }

  setFilter(f: Filter): void {
    this.filter = f;
  }

  setProject(p: string): void {
    this.project = p;
  }
}

export const decisionsUi = new DecisionsUi();
