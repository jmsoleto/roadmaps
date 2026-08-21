/**
 * Export/import of decisions as JSON.
 *
 * Same job `io/portability.ts` does for roadmaps, and deliberately a separate
 * document: a decisions file never carries roadmaps and a roadmap file never
 * carries decisions. The two apps do not know about each other, and their
 * backups should not either.
 *
 * The document is self-contained by construction: every derived reading — the
 * lifecycle, the outcome of recommendation against resolution — comes from the
 * fields already here, so nothing extra has to travel.
 *
 * When attachments arrive they add a manifest to this shape. Nothing is built
 * for them yet.
 */

import { uid } from '../util/id';
import { isIsoDate } from '../time/timeline';
import { isAxisId, isDirection } from './model/axes';
import type { Decision, Effect, Impact, Option, Recommendation, Resolution } from './model/types';

/** Marks the document as ours, and as *decisions* rather than roadmaps. */
const KIND = 'tech-lead-hub/decisions';
const VERSION = 1;

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

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const isoOrNull = (v: unknown): string | null => (isIsoDate(v) ? v : null);

const impact = (v: unknown): Impact | null =>
  v === 'alto' || v === 'medio' || v === 'bajo' ? v : null;

/**
 * Rebuild one alternative, keeping a map from its old id to the new one.
 *
 * Ids are reissued on import so that importing the same document twice produces
 * two independent sets rather than one overwriting the other. That means every
 * reference to an option — the recommendation, the resolution — has to be
 * rewritten through this map.
 */
function parseOption(raw: unknown, idMap: Map<string, string>): Option | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const text = str(o.text);
  const id = uid('opt');
  if (typeof o.id === 'string') idMap.set(o.id, id);

  const effects: Effect[] = Array.isArray(o.effects)
    ? o.effects.flatMap((e): Effect[] => {
        if (typeof e !== 'object' || e === null) return [];
        const r = e as Record<string, unknown>;
        if (!isAxisId(r.axis) || !isDirection(r.direction)) return [];
        return [{ axis: r.axis, direction: r.direction, note: str(r.note) }];
      })
    : [];

  return { id, text, effects };
}

function parseDecision(raw: unknown): Decision | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Record<string, unknown>;

  // A decision with neither text is not a decision; everything else may be blank.
  const origin = str(d.origin);
  const question = str(d.question);
  if (origin.trim() === '' && question.trim() === '') return null;

  const idMap = new Map<string, string>();
  const options = Array.isArray(d.options)
    ? d.options.flatMap((o) => {
        const parsed = parseOption(o, idMap);
        return parsed ? [parsed] : [];
      })
    : [];

  const rawRec = d.recommendation as Record<string, unknown> | null | undefined;
  let recommendation: Recommendation | null = null;
  if (rawRec && typeof rawRec === 'object') {
    const optionId = idMap.get(str(rawRec.optionId));
    const at = isoOrNull(rawRec.at);
    // A recommendation pointing at an alternative the document does not contain
    // would be a dangling reference; dropping it is better than importing one.
    if (optionId && at) recommendation = { optionId, why: str(rawRec.why), at };
  }

  const rawRes = d.resolution as Record<string, unknown> | null | undefined;
  let resolution: Resolution | null = null;
  if (rawRes && typeof rawRes === 'object') {
    const at = isoOrNull(rawRes.at);
    if (at) {
      const mapped = typeof rawRes.optionId === 'string' ? idMap.get(rawRes.optionId) : undefined;
      const text = str(rawRes.text);
      // Losing the option reference must not lose the resolution: it degrades
      // to a free-text answer, which is exactly what it now is.
      if (mapped) resolution = { optionId: mapped, text, at };
      else if (text.trim() !== '') resolution = { optionId: null, text, at };
    }
  }

  const raisedAt = isoOrNull(d.raisedAt);

  return {
    id: uid('dec'),
    origin,
    originContext: str(d.originContext),
    question,
    project: str(d.project),
    stakeholder: str(d.stakeholder),
    deadline: isoOrNull(d.deadline),
    impact: impact(d.impact),
    notes: str(d.notes),
    options,
    raisedAt,
    // Kept whether or not the decision was raised: recommending happens
    // *before* raising, and on a prepared decision it is simply still editable.
    recommendation,
    // A resolution on something never raised is incoherent, and the derived
    // lifecycle would read it as resolved without it ever having been asked.
    resolution: raisedAt === null ? null : resolution,
  };
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

  const decisions = d.decisions.flatMap((raw) => {
    const parsed = parseDecision(raw);
    return parsed ? [parsed] : [];
  });

  if (decisions.length === 0) {
    throw new ImportError('El documento no contiene ninguna decisión legible.');
  }
  return decisions;
}
