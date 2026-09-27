/**
 * Export/import of the value sources.
 *
 * They live in one profile's IndexedDB, exactly like the contracts and the model
 * library, so **this is the only thing that moves them between machines and
 * between people** — and what a source carries is the vocabulary of somebody's
 * domain, which is the half no engine can deduce. Without this, every laptop
 * rewrites the same list of order states.
 *
 * Same shape as the other two documents: it declares what it is, the rejection
 * names the application a foreign file really belongs to, and identity is
 * reissued on the way in.
 *
 * The **name** survives that reissue, and it has to: it is what an orphan
 * assignment is matched against when the sources finally arrive (D16).
 */

import { uid } from '../../util/id';
import { foreignDocumentMessage } from '../../hub/documents';
import { API_ID } from '../../hub/apps';
import { ImportError } from '../io';
import { normalizeValueSource } from './normalize';
import type { ValueSource } from './types';

const KIND = 'tech-lead-hub/api-value-sources';
const VERSION = 1;

export interface ValueSourcesExport {
  kind: typeof KIND;
  version: number;
  exportedAt: string;
  sources: ValueSource[];
}

export function exportValueSources(sources: readonly ValueSource[]): string {
  const doc: ValueSourcesExport = {
    kind: KIND,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    sources: [...sources],
  };
  return JSON.stringify(doc, null, 2);
}

export const VALUE_SOURCES_FILENAME = 'fuentes-de-valores.json';

/**
 * One source, **keeping the id the document brought**.
 *
 * This is the one place the value sources deliberately do the opposite of the
 * model library, which reissues identity on the way in. The reason is what the
 * id is *for*: a library entry's id is internal bookkeeping, while a source's id
 * is what every assignment in every contract points at. Reissuing it would
 * guarantee that a contract imported from the same machine arrives with every
 * assignment orphaned — which is exactly the repair this document exists to
 * perform (D16).
 *
 * The clash is handled where it belongs, in the merge: an id already taken by a
 * different source gets a fresh one there, so nothing is ever overwritten.
 */
function readable(raw: unknown): ValueSource | null {
  if (raw === null || typeof raw !== 'object') return null;
  const doc = raw as Record<string, unknown>;
  const id = typeof doc.id === 'string' && doc.id.trim() !== '' ? doc.id : uid('vsr');
  const source = normalizeValueSource({ ...doc, id });
  if (source === null) return null;
  // A source with no name cannot be matched against an assignment and cannot be
  // told apart in a list. It is not worth importing.
  return source.name.trim() === '' ? null : source;
}

/**
 * Read a value sources document.
 *
 * All or nothing, like the other two: the sources are built whole before any are
 * returned, so a document that breaks halfway leaves nothing half-imported.
 */
export function parseValueSourcesImport(text: string): ValueSource[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('El archivo no es un JSON válido.');
  }

  const foreign = foreignDocumentMessage(parsed, API_ID);
  if (foreign) throw new ImportError(foreign);

  if (parsed === null || typeof parsed !== 'object') {
    throw new ImportError('El archivo no contiene fuentes de valores.');
  }
  const doc = parsed as Record<string, unknown>;

  // Three documents of this application now, so «it is not mine» says nothing:
  // naming which of the three it is, is the whole point of the message.
  if (doc.kind === 'tech-lead-hub/api-contract') {
    throw new ImportError('Esto es un contrato, no unas fuentes de valores.');
  }
  if (doc.kind === 'tech-lead-hub/api-library') {
    throw new ImportError('Esto es una biblioteca de modelos, no unas fuentes de valores.');
  }
  if (doc.kind !== KIND) {
    throw new ImportError('El archivo no es un documento de fuentes de valores.');
  }
  if (!Array.isArray(doc.sources)) {
    throw new ImportError('El documento no contiene ninguna fuente.');
  }

  const sources = doc.sources.map(readable).filter((s): s is ValueSource => s !== null);
  if (sources.length === 0) {
    throw new ImportError('El documento no contiene ninguna fuente legible.');
  }
  return sources;
}
