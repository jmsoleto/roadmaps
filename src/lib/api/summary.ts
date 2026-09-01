/**
 * What API Hub reports to the landing.
 *
 * Pure, like `roadmaps-summary.ts`: contracts and recent openings in, the
 * card's contract out. The store wiring is in `hub/registry.ts`.
 */

import { issueCount } from './validate';
import type { RecentEntry } from '../hub/usage';
import type { Alert, AppSummary, Row, Stat } from '../hub/types';
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
    // The three figures stay as they are now that the validator exists (D7).
    // The first change's open question asked whether "contracts with warnings"
    // should displace "models" here; it does not need to. The alert already
    // carries the severity, models start counting next change, and
    // `hub-landing` only asks that a figure *can* carry a tone, not that one
    // does.
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

/**
 * What API Hub contributes to "lo que no puede esperar" (D7).
 *
 * One alert per contract that has problems, naming it and how many — not one
 * per problem. Three half-written contracts would fill the strip and bury what
 * Roadmaps and Decisions have to say.
 *
 * The count comes from the same `validate` the export panel shows, never from a
 * second set of rules: two lists would end up disagreeing about the same
 * contract, and the hub's would be the one nobody maintains.
 */
export function contractAlerts(contracts: Contract[]): Alert[] {
  const out: Alert[] = [];
  for (const contract of contracts) {
    const count = issueCount(contract);
    if (count === 0) continue;
    out.push({
      id: `issues:${contract.id}`,
      text:
        count === 1
          ? `${contract.title}: 1 problema antes de poder entregarlo`
          : `${contract.title}: ${count} problemas antes de poder entregarlo`,
      source: 'API Hub',
      tone: 'warn',
    });
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
    alerts: contractAlerts(contracts),
  };
}
