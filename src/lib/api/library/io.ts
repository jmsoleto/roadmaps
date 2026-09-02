/**
 * Export/import of the model library (D7).
 *
 * The library lives in one profile's IndexedDB, exactly like the contracts, so
 * **this is the only thing that moves it between machines and between people**
 * — and therefore the only way two squads end up using the same `Paginacion`,
 * which is the entire point of having one.
 *
 * Same shape as the contract's document: it declares what it is, the rejection
 * names the application a foreign file really belongs to, and identity is
 * reissued on the way in.
 */

import { uid } from '../../util/id';
import { foreignDocumentMessage } from '../../hub/documents';
import { API_ID } from '../../hub/apps';
import { ImportError } from '../io';
import type { LibraryEntry } from './types';

const KIND = 'tech-lead-hub/api-library';
const VERSION = 1;

export interface LibraryExport {
  kind: typeof KIND;
  version: number;
  exportedAt: string;
  entries: LibraryEntry[];
}

export function exportLibrary(entries: readonly LibraryEntry[]): string {
  const doc: LibraryExport = {
    kind: KIND,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    entries: [...entries],
  };
  return JSON.stringify(doc, null, 2);
}

export const LIBRARY_FILENAME = 'biblioteca-de-modelos.json';

/** An entry is only worth keeping if it carries at least the model it names. */
function readableEntry(raw: unknown): LibraryEntry | null {
  if (raw === null || typeof raw !== 'object') return null;
  const e = raw as Partial<LibraryEntry>;
  if (!Array.isArray(e.models) || e.models.length === 0) return null;
  const name = typeof e.name === 'string' && e.name.trim() !== '' ? e.name : e.models[0]?.name;
  if (typeof name !== 'string' || name.trim() === '') return null;
  return {
    // Identity is ours, so importing does not depend on the source's ids being
    // unique here.
    id: uid('lib'),
    name,
    description: typeof e.description === 'string' ? e.description : '',
    updated: typeof e.updated === 'string' ? e.updated : new Date().toISOString(),
    models: e.models,
  };
}

/**
 * Read a library document.
 *
 * All or nothing, like the contract's: the entries are built whole before any
 * are returned, so a document that breaks halfway leaves nothing half-imported.
 */
export function parseLibraryImport(text: string): LibraryEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('El archivo no es un JSON válido.');
  }

  const foreign = foreignDocumentMessage(parsed, API_ID);
  if (foreign) throw new ImportError(foreign);

  if (parsed === null || typeof parsed !== 'object') {
    throw new ImportError('El archivo no contiene una biblioteca de modelos.');
  }
  const doc = parsed as Record<string, unknown>;

  // The contract and the library are both ours, so «it is not mine» is not
  // enough: saying which of the two it is, is the whole point of the message.
  if (doc.kind === 'tech-lead-hub/api-contract') {
    throw new ImportError('Esto es un contrato, no una biblioteca de modelos.');
  }
  if (doc.kind !== KIND) {
    throw new ImportError('El archivo no es una biblioteca de modelos.');
  }
  if (!Array.isArray(doc.entries)) {
    throw new ImportError('El documento no contiene ninguna entrada.');
  }

  const entries = doc.entries.map(readableEntry).filter((e): e is LibraryEntry => e !== null);
  if (entries.length === 0) {
    throw new ImportError('El documento no contiene ninguna entrada legible.');
  }
  return entries;
}
