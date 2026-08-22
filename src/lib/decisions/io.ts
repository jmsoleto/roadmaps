/**
 * Export/import of decisions as JSON.
 *
 * Same job `io/portability.ts` does for roadmaps, and deliberately a separate
 * document: a decisions file never carries roadmaps and a roadmap file never
 * carries decisions. The two apps do not know about each other, and their
 * backups should not either.
 *
 * The reading of a decision is **not** repeated here: it is `normalizeDecision`,
 * the same function the store uses on load. That is what makes a document
 * exported before the criteria model existed importable today without this file
 * knowing anything about the older shape (D6).
 *
 * What is this file's own job is identity: ids are reissued on the way in, so
 * importing the same document twice produces two independent sets rather than
 * one overwriting the other.
 */

import { uid } from '../util/id';
import { normalizeDecision } from './model/normalize';
import type { Decision } from './model/types';

/** Marks the document as ours, and as *decisions* rather than roadmaps. */
const KIND = 'tech-lead-hub/decisions';
const VERSION = 2;

export interface DecisionsExport {
  kind: typeof KIND;
  version: number;
  exportedAt: string;
  decisions: Decision[];
}

export function exportDecisions(decisions: Decision[]): string {
  const doc: DecisionsExport = {
    kind: KIND,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    decisions,
  };
  return JSON.stringify(doc, null, 2);
}

/**
 * Reissue every id in a decision, rewriting the references that point at them.
 *
 * The recommendation and the resolution both name an alternative, so remapping
 * the options without remapping those two would leave dangling references — and
 * a resolution that lost its option would silently stop being comparable to the
 * recommendation.
 */
function reissueIdentity(d: Decision): Decision {
  const idMap = new Map<string, string>();
  const options = d.options.map((o) => {
    const id = uid('opt');
    idMap.set(o.id, id);
    return { ...o, id };
  });

  const recommendation =
    d.recommendation && idMap.has(d.recommendation.optionId)
      ? { ...d.recommendation, optionId: idMap.get(d.recommendation.optionId)! }
      : null;

  let resolution = d.resolution;
  if (resolution && resolution.optionId !== null) {
    const mapped = idMap.get(resolution.optionId);
    // Losing the option reference must not lose the resolution: it degrades to
    // a free-text answer, which is exactly what it now is.
    resolution = mapped
      ? { ...resolution, optionId: mapped }
      : resolution.text.trim() !== ''
        ? { ...resolution, optionId: null }
        : null;
  }

  return { ...d, id: uid('dec'), options, recommendation, resolution };
}

/**
 * Stamp throwaway ids where a document has none.
 *
 * `normalizeDecision` rejects an entry without an id, and rightly so on the load
 * path: there, a missing id means the stored document is corrupt. On the import
 * path it means nothing — a hand-written file simply did not bother — and the
 * ids are reissued a moment later anyway.
 */
function withProvisionalIds(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const d = raw as Record<string, unknown>;
  const options = Array.isArray(d.options)
    ? d.options.map((o) =>
        typeof o === 'object' && o !== null && typeof (o as { id?: unknown }).id !== 'string'
          ? { ...o, id: uid('opt') }
          : o,
      )
    : d.options;
  return { ...d, id: typeof d.id === 'string' ? d.id : uid('dec'), options };
}

export class ImportError extends Error {}

/**
 * Parse a decisions document.
 *
 * All or nothing: a document that is not ours, or that contains no readable
 * decision, throws and leaves the store untouched.
 */
export function parseDecisionsImport(text: string): Decision[] {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new ImportError('El archivo no es un JSON válido.');
  }

  if (typeof doc !== 'object' || doc === null) {
    throw new ImportError('El archivo no contiene un documento de decisiones.');
  }
  const d = doc as Record<string, unknown>;

  // Naming the roadmap case explicitly: importing the wrong file into the wrong
  // app is the likeliest mistake, and "no es un documento de decisiones" alone
  // would leave the user guessing.
  if (Array.isArray(d.roadmaps) || d.roadmap !== undefined || Array.isArray(d.rows)) {
    throw new ImportError('Esto es un documento de roadmaps, no de decisiones.');
  }
  if (d.kind !== KIND) {
    throw new ImportError('El archivo no es un documento de decisiones.');
  }
  if (!Array.isArray(d.decisions)) {
    throw new ImportError('El documento no contiene decisiones.');
  }

  const decisions = d.decisions.flatMap((raw): Decision[] => {
    const parsed = normalizeDecision(withProvisionalIds(raw));
    if (!parsed) return [];
    // A decision with neither text is not a decision; everything else may be blank.
    if (parsed.origin.trim() === '' && parsed.question.trim() === '') return [];
    return [reissueIdentity(parsed)];
  });

  if (decisions.length === 0) {
    throw new ImportError('El documento no contiene ninguna decisión legible.');
  }
  return decisions;
}
