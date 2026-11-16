/**
 * Going to a field: the one path the search and «Usado en» share (D5).
 *
 * Two halves, because they belong to two stores: the document side opens the
 * view and unfolds the holders (`apiContracts.reveal`, testable without a
 * screen), and the screen side asks the row to scroll into view and light up
 * (`apiUi.wantReveal`). The store has no business knowing what is on screen —
 * the same line `wantFocus` draws — so the two meet here.
 */

import { apiContracts } from './store.svelte';
import { apiUi } from './ui.svelte';
import type { ContractTarget } from './model/models';

export function goTo(target: ContractTarget, itemId: string | null): void {
  apiContracts.reveal(target, itemId);
  if (itemId !== null) apiUi.wantReveal(itemId);
}
