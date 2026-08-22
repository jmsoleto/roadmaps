/**
 * Reading decisions written by an older version of this app (design decision D6).
 *
 * Same shape `normalizeBlockers` and `normalizeCompletion` use in Roadmaps: the
 * document is read and completed on the way in, at both doors — loading from the
 * store and importing a file — so nothing downstream has to know two formats.
 *
 * Two rules govern the conversion, and both exist to protect the record:
 *
 *  - **Nothing said is discarded.** What an axis declared becomes the text of
 *    its criterion, direction included, in words.
 *  - **Nothing unsaid is invented.** The value stays empty. Nobody wrote
 *    "140 k€" in the old model, and a plausible figure would later be shown to
 *    the business side as if the user had said it.
 *
 * Idempotent: normalising an already-current document changes nothing.
 */

import { isCriterionId, isRiskLevel, isAppraisal, type CriterionId } from './criteria';
import { isIsoDate } from '../../time/timeline';
import type {
  Assessment,
  AssessmentValue,
  CaptureSource,
  Decision,
  DecisionsData,
  Option,
} from './types';

/** The axes the previous model had, and the criterion each becomes. */
const AXIS_TO_CRITERION: Record<string, CriterionId> = {
  coste: 'coste',
  plazo: 'tiempo',
  riesgo: 'riesgo',
};

/** How a direction reads once it is a sentence rather than an arrow. */
const DIRECTION_WORD: Record<string, string> = {
  sube: 'sube',
  igual: 'se mantiene',
  baja: 'baja',
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Rebuild an assessment's value, keeping only what is well formed.
 *
 * A malformed value is dropped rather than guessed at; the text beside it
 * survives, which is the part that carries the meaning anyway.
 */
function normalizeValue(raw: unknown): AssessmentValue | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const v = raw as Record<string, unknown>;

  switch (v.kind) {
    case 'effort':
      if (typeof v.weeks !== 'number' || !Number.isFinite(v.weeks)) return null;
      return {
        kind: 'effort',
        weeks: v.weeks,
        people: typeof v.people === 'number' && Number.isFinite(v.people) ? v.people : null,
      };
    case 'money':
      return typeof v.amount === 'number' && Number.isFinite(v.amount)
        ? { kind: 'money', amount: v.amount }
        : null;
    case 'date':
      return isIsoDate(v.date) ? { kind: 'date', date: v.date } : null;
    case 'level':
      return isRiskLevel(v.level) ? { kind: 'level', level: v.level } : null;
    case 'appraisal':
      return isAppraisal(v.score) ? { kind: 'appraisal', score: v.score } : null;
    default:
      return null;
  }
}

/** An assessment already in the current shape, or `null` if it is not one. */
function currentAssessment(raw: unknown): Assessment | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (!isCriterionId(a.criterion)) return null;
  return { criterion: a.criterion, text: str(a.text), value: normalizeValue(a.value) };
}

/**
 * Convert one axis of the previous model into an assessment.
 *
 * The direction becomes words and the note follows it, so a bar that said
 * `coste ↑` with the note "lo asume la compañía" reads "sube · lo asume la
 * compañía". The value is deliberately left empty.
 */
function assessmentFromEffect(raw: unknown): Assessment | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const e = raw as Record<string, unknown>;
  const criterion = AXIS_TO_CRITERION[str(e.axis)];
  if (!criterion) return null;

  const word = DIRECTION_WORD[str(e.direction)] ?? '';
  const note = str(e.note).trim();
  const text = [word, note].filter((p) => p !== '').join(' · ');

  return { criterion, text, value: null };
}

function normalizeOption(raw: unknown): Option | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string') return null;

  // Current shape wins when both are present, so re-normalising never reverts
  // an option to what its long-gone axes used to say.
  const fromCurrent = Array.isArray(o.assessments)
    ? o.assessments.flatMap((a) => {
        const parsed = currentAssessment(a);
        return parsed ? [parsed] : [];
      })
    : [];

  const fromLegacy =
    fromCurrent.length === 0 && Array.isArray(o.effects)
      ? o.effects.flatMap((e) => {
          const parsed = assessmentFromEffect(e);
          return parsed ? [parsed] : [];
        })
      : [];

  const all = [...fromCurrent, ...fromLegacy];

  // At most one assessment per criterion: a document with two for the same one
  // is malformed, and the first is as good an answer as any.
  const seen = new Set<CriterionId>();
  const assessments = all.filter((a) => !seen.has(a.criterion) && seen.add(a.criterion));

  return { id: o.id, text: str(o.text), assessments };
}

const captureSource = (v: unknown): CaptureSource => (v === 'dictado' ? 'dictado' : 'tecleado');

export function normalizeDecision(raw: unknown): Decision | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.id !== 'string') return null;

  // `raisedAt` and `readyAt` mean the same thing — the instant the
  // recommendation stopped being arguable — so the old name simply carries over.
  const readyAt = isIsoDate(d.readyAt) ? d.readyAt : isIsoDate(d.raisedAt) ? d.raisedAt : null;

  const options = Array.isArray(d.options)
    ? d.options.flatMap((o) => {
        const parsed = normalizeOption(o);
        return parsed ? [parsed] : [];
      })
    : [];

  const rawRec = d.recommendation as Record<string, unknown> | null | undefined;
  const recommendation =
    rawRec &&
    typeof rawRec === 'object' &&
    typeof rawRec.optionId === 'string' &&
    isIsoDate(rawRec.at)
      ? { optionId: rawRec.optionId, why: str(rawRec.why), at: rawRec.at }
      : null;

  const rawRes = d.resolution as Record<string, unknown> | null | undefined;
  const resolution =
    rawRes && typeof rawRes === 'object' && isIsoDate(rawRes.at)
      ? {
          optionId: typeof rawRes.optionId === 'string' ? rawRes.optionId : null,
          text: str(rawRes.text),
          at: rawRes.at,
        }
      : null;

  return {
    id: d.id,
    origin: str(d.origin),
    originContext: str(d.originContext),
    capturedAt: isIsoDate(d.capturedAt) ? d.capturedAt : null,
    captureSource: captureSource(d.captureSource),
    question: str(d.question),
    project: str(d.project),
    stakeholder: str(d.stakeholder),
    deadline: isIsoDate(d.deadline) ? d.deadline : null,
    impact: d.impact === 'alto' || d.impact === 'medio' || d.impact === 'bajo' ? d.impact : null,
    notes: str(d.notes),
    internalNote: str(d.internalNote),
    options,
    readyAt,
    recommendation,
    // A resolution on something never declared ready would read as closed
    // without ever having been finished.
    resolution: readyAt === null ? null : resolution,
  };
}

/** Read a whole document, whichever version wrote it. */
export function normalizeDecisions(raw: unknown): DecisionsData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.decisions)) return null;

  return {
    decisions: d.decisions.flatMap((x) => {
      const parsed = normalizeDecision(x);
      return parsed ? [parsed] : [];
    }),
  };
}
