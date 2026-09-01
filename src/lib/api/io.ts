/**
 * Export/import of one contract as JSON.
 *
 * The simplest of the three exchanges in this repo, and not by accident. A
 * roadmap has to carry its assignees and its external dependencies, and merge
 * two catalogues on the way in; a decisions document carries a manifest whose
 * bytes live elsewhere. A contract carries **itself**: the models live inside
 * it, so exporting is serialising.
 *
 * What this file does own is identity. Ids are reissued on the way in, so
 * importing the same document twice produces two independent contracts rather
 * than one overwriting the other — and, crucially, so the imported contract's
 * references point at its **own** models. That work is `reissueIds`, shared
 * with duplicating a contract, because they are the same operation.
 *
 * The reading of a contract is **not** repeated here: it is `normalizeApiData`,
 * the same function the store uses on load. One reading, so a document that an
 * older version wrote is understood the same way through both doors.
 */

import { PALETTE_SLOTS } from '../theme/tokens';
import { uid } from '../util/id';
import { foreignDocumentMessage } from '../hub/documents';
import { API_ID } from '../hub/apps';
import { reissueIds } from './model/identity';
import { normalizeApiData } from './model/normalize';
import type { Contract } from './model/types';

/** Marks the document as ours, and as a *contract* rather than anything else. */
const KIND = 'tech-lead-hub/api-contract';
const VERSION = 1;

export interface ContractExport {
  kind: typeof KIND;
  version: number;
  exportedAt: string;
  contract: Contract;
}

export class ImportError extends Error {}

/**
 * Serialise one contract.
 *
 * `view` is stripped: what somebody was editing belongs to them, not to whoever
 * receives the file. Everything else travels, `colorSlot` included — it is the
 * contract's identity, so re-importing your own export gives back the colour
 * you had.
 */
export function exportContract(contract: Contract): string {
  const doc: ContractExport = {
    kind: KIND,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    contract: { ...contract, view: null },
  };
  return JSON.stringify(doc, null, 2);
}

/** A file name that survives being saved, and that two exports do not share. */
export function exportFilename(contract: Contract): string {
  const slug =
    contract.title
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'contrato';
  const version = contract.version.trim().replace(/[^\w.-]+/g, '-');
  // The version is in the name so two copies taken at different moments do not
  // overwrite each other in the downloads folder.
  return version ? `${slug}-v${version}-contrato.json` : `${slug}-contrato.json`;
}

/**
 * Read a contract document.
 *
 * All or nothing: the contract is built whole before anything is returned, so a
 * document that breaks halfway leaves nothing half-imported.
 *
 * `fallbackSlot` is the palette slot for a contract whose document carries
 * none. It comes from the caller because it depends on where the contract is
 * about to land, not on anything inside the document: a document holds one
 * contract, so its own position is always zero and says nothing.
 */
export function parseContractImport(text: string, fallbackSlot = 0): Contract {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('El archivo no es un JSON válido.');
  }

  // Naming the other applications' documents before rejecting: putting the
  // wrong file in the wrong application is the likeliest mistake here.
  const foreign = foreignDocumentMessage(parsed, API_ID);
  if (foreign) throw new ImportError(foreign);

  if (parsed === null || typeof parsed !== 'object') {
    throw new ImportError('El archivo no contiene un contrato de API.');
  }
  const doc = parsed as Record<string, unknown>;
  if (doc.kind !== KIND) {
    throw new ImportError('El archivo no es un documento de contratos de API.');
  }
  if (doc.contract === null || typeof doc.contract !== 'object') {
    throw new ImportError('El documento no contiene ningún contrato.');
  }

  // Read through the same normaliser the store uses on load, by handing it a
  // document of one. A contract without an id gets a provisional one first:
  // the normaliser drops what has none, and here that would look like an
  // unreadable document rather than an id we are about to replace anyway.
  const raw = doc.contract as Record<string, unknown>;
  const normalized = normalizeApiData({
    contracts: [{ ...raw, id: typeof raw.id === 'string' && raw.id ? raw.id : uid('api') }],
    openId: null,
  });
  const contract = normalized?.contracts[0];
  if (!contract) throw new ImportError('El contrato del documento no se puede leer.');

  contract.id = uid('api');
  // The slot the document brings is kept; without one, where it lands decides.
  if (typeof raw.colorSlot !== 'number' || !Number.isFinite(raw.colorSlot)) {
    contract.colorSlot = fallbackSlot % PALETTE_SLOTS;
  }
  // Whoever exported it was editing something; the receiver was not.
  contract.view = null;
  reissueIds(contract);
  return contract;
}
