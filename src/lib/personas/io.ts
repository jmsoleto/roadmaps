/**
 * Personas Hub's document: all of it, restored only over nothing (personas-hub, D8).
 *
 * The ids travel, because the references between catalogues, people, absences
 * and sprints are the content. Reading goes through the same `normalize` as the
 * load, in its strict mode: anything that would fall out refuses the whole
 * document, since a restore that half-enters computes a different capacity
 * without saying so.
 */

import { foreignDocumentMessage } from '../hub/documents';
import { PERSONAS_ID } from '../hub/apps';
import type { PersonasData } from './model';
import { Inconsistent, normalize } from './normalize';

/** Marks the document as ours. Its version is the document's, not the store's. */
export const KIND = 'tech-lead-hub/personas';
const VERSION = 1;

export const FILENAME = 'personas.json';

export function exportPersonas(data: PersonasData): string {
  return JSON.stringify(
    { kind: KIND, version: VERSION, exportedAt: new Date().toISOString(), data },
    null,
    2,
  );
}

/**
 * Said after the download (D7): the warning first, because the bar truncates
 * from the right and what must survive is what the file contains.
 */
export const exportNotice = (): string => `contiene datos personales y de ausencias · ${FILENAME}`;

export class ImportError extends Error {}

export function parsePersonasImport(text: string): PersonasData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('El archivo no es un JSON válido.');
  }
  const foreign = foreignDocumentMessage(parsed, PERSONAS_ID);
  if (foreign) throw new ImportError(foreign);
  const doc = parsed as Record<string, unknown> | null;
  if (doc === null || typeof doc !== 'object' || doc.kind !== KIND) {
    throw new ImportError('El archivo no es un documento de Personas Hub.');
  }
  try {
    return normalize(doc.data, true);
  } catch (e) {
    if (e instanceof Inconsistent) {
      throw new ImportError(
        `El documento no se puede restaurar entero (${e.message}): no se ha cambiado nada.`,
      );
    }
    throw e;
  }
}
