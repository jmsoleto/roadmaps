/**
 * What comes in gets normalised, so nothing downstream has to know that a
 * document could be incomplete.
 *
 * Same job the four normalisers in Roadmaps do, and the same two rules:
 * **idempotent**, so running it over an already-normal document changes
 * nothing, and it **does not force a write** — the repair consolidates on the
 * next save that happens through the normal flow.
 *
 * The depth stops at the contract on purpose. There is no older shape of a
 * field tree to repair, because nothing creates one yet; writing that walk now
 * would be a guess at a format that does not exist. It arrives with the editor
 * that produces the first node.
 */

import { PALETTE_SLOTS } from '../../theme/tokens';
import type { ApiData, Contract } from './types';

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeContract(raw: unknown, index: number): Contract | null {
  if (raw === null || typeof raw !== 'object') return null;
  const c = raw as Partial<Contract>;
  if (typeof c.id !== 'string' || c.id === '') return null;

  return {
    id: c.id,
    title: str(c.title, 'Contrato sin título'),
    version: str(c.version, '1.0.0'),
    description: str(c.description),
    server: str(c.server),
    // A contract without a slot takes the one its position would have given it,
    // which is what it was already being shown with.
    colorSlot:
      typeof c.colorSlot === 'number' && Number.isFinite(c.colorSlot)
        ? c.colorSlot
        : index % PALETTE_SLOTS,
    models: Array.isArray(c.models) ? c.models : [],
    endpoints: Array.isArray(c.endpoints) ? c.endpoints : [],
    view: c.view ?? null,
  };
}

/**
 * Read a stored document, dropping what cannot be read rather than failing.
 *
 * A contract without an id is not repairable: issuing one would make a
 * duplicate on the next load, since nothing links it to what it was. Returns
 * `null` when the document itself is not a document, which the caller treats as
 * empty — the same thing Roadmaps does with a malformed one.
 */
export function normalizeApiData(raw: unknown): ApiData | null {
  if (raw === null || typeof raw !== 'object') return null;
  const d = raw as Partial<ApiData>;
  if (!Array.isArray(d.contracts)) return null;

  const contracts = d.contracts
    .map((c, i) => normalizeContract(c, i))
    .filter((c): c is Contract => c !== null);

  // An open id naming a contract that is no longer there would leave the app
  // showing nothing over a list that has entries.
  const openId =
    typeof d.openId === 'string' && contracts.some((c) => c.id === d.openId) ? d.openId : null;

  return { contracts, openId };
}
