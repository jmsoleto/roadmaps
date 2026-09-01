/**
 * What API Hub reports to the landing.
 *
 * Pure, like `roadmaps-summary.ts`: contracts and recent openings in, the
 * card's contract out. The store wiring is in `hub/registry.ts`.
 */

import type { RecentEntry } from '../hub/usage';
import type { AppSummary, Row, Stat } from '../hub/types';
import type { Contract } from './model/types';

/** How many rows the card shows. */
const LIST_ROWS = 3;

function stats(contracts: Contract[]): [Stat, Stat, Stat] {
  let endpoints = 0;
  let models = 0;
  for (const c of contracts) {
    endpoints += c.endpoints.length;
    models += c.models.length;
  }
  return [
    { value: contracts.length, label: 'contratos', tone: 'neutral' },
    { value: endpoints, label: 'endpoints', tone: 'neutral' },
    // Not a problem being counted, so never a grave tone. The figure that will
    // deserve one is "contracts with warnings", once the validator exists — see
    // the open question in this change's design.
    { value: models, label: 'modelos', tone: 'neutral' },
  ];
}

/**
 * The contracts opened most recently, newest first.
 *
 * `recent` is already filtered to live ids by the caller; anything that still
 * fails to resolve here is skipped rather than rendered as a blank row.
 */
export function recentRows(
  contracts: Contract[],
  recent: RecentEntry[],
  slotColor: (slot: number) => string,
): Row[] {
  const out: Row[] = [];
  for (const entry of recent) {
    const contract = contracts.find((c) => c.id === entry.id);
    if (contract === undefined) continue;
    out.push({
      id: contract.id,
      // The contract's own slot, so the swatch on the card is the one its
      // switcher shows — and stays that colour when the list is reordered.
      color: slotColor(contract.colorSlot),
      label: contract.title,
      meta: contract.version.trim() === '' ? 'sin versión' : `v${contract.version}`,
      metaTone: 'neutral',
    });
    if (out.length === LIST_ROWS) break;
  }
  return out;
}

export function apiSummary(
  contracts: Contract[],
  recent: RecentEntry[],
  slotColor: (slot: number) => string,
): AppSummary {
  return {
    stats: stats(contracts),
    list: {
      label: 'CONTRATOS RECIENTES',
      rows: recentRows(contracts, recent, slotColor),
      emptyLabel: 'aún no has abierto ninguno',
    },
    // Nothing to warn about yet. The validator is what will fill this, and it
    // arrives with the change that can actually check a contract.
    alerts: [],
  };
}
