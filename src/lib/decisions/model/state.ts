/**
 * Pure derivations over a decision (no reactivity, easy to test).
 *
 * The lifecycle lives here and nowhere else. Nothing in the model stores it: a
 * decision's phase is a reading of which fields are set plus today's date, so it
 * cannot disagree with the data it describes.
 *
 * `today` is a parameter rather than a `todayIso()` call, the same shape
 * `getMetaWindow` uses in Roadmaps, so this file stays pure.
 */

import type { IsoDate } from '../../model/types';
import type { Decision, Option } from './types';

/**
 * Where a decision is in its life.
 *
 * The three phases are the spine of the app: capture it where it comes up,
 * study it alone until the business side can answer it, put it in front of them
 * and decide. `cerrada` and `caducada` are outcomes rather than phases.
 *
 * `caducada` is derived and not stored for a reason beyond the general one: it
 * depends on *today*. Storing it would need a daily sweep nobody will run, and a
 * lapsed decision would stay lapsed after its deadline moved — when moving the
 * deadline is precisely how you revive it.
 */
export type Phase = 'captura' | 'estudio' | 'lista' | 'cerrada' | 'caducada';

/** The three phases in order, for anything that renders a stepper. */
export const PHASES = [
  { id: 'captura', n: 1, label: 'captura' },
  { id: 'estudio', n: 2, label: 'estudio y evaluación' },
  { id: 'lista', n: 3, label: 'presentación y decisión' },
] as const;

export function phaseOf(d: Decision, today: IsoDate): Phase {
  if (d.resolution !== null) return 'cerrada';
  if (d.question.trim() === '') return 'captura';
  if (d.readyAt === null) return 'estudio';
  // Lapsing only reaches phase 3: a decision still being studied was never put
  // in front of anyone, so it cannot have expired on them.
  if (d.deadline !== null && d.deadline < today) return 'caducada';
  return 'lista';
}

/** Which of the three phases a decision sits in, whatever its outcome. */
export function phaseNumber(d: Decision, today: IsoDate): 1 | 2 | 3 {
  const phase = phaseOf(d, today);
  if (phase === 'captura') return 1;
  if (phase === 'estudio') return 2;
  return 3;
}

/**
 * A decision still waiting for an answer, whatever phase it is at.
 *
 * Deliberately not a function of today: an open decision is one with no
 * resolution, and letting a date into that reading would make "open" and
 * "lapsed" overlap.
 */
export function isOpen(d: Decision): boolean {
  return d.resolution === null;
}

/** Captured but not yet translated into a question for the business side. */
export function isCaptured(d: Decision): boolean {
  return d.resolution === null && d.question.trim() === '';
}

/**
 * What the study has and has not got, for the phase-2 closing panel.
 *
 * Shown, never enforced beyond the translation: sometimes you present with what
 * you have, and blocking the gate would produce fields filled in for the sake of
 * it — which is what ruins the value of the record.
 */
export interface StudyChecklist {
  translated: boolean;
  options: number;
  assessed: number;
  recommended: boolean;
}

export function studyChecklist(d: Decision): StudyChecklist {
  return {
    translated: d.question.trim() !== '',
    options: d.options.length,
    assessed: d.options.filter((o) => o.assessments.some((a) => a.text.trim() !== '' || a.value))
      .length,
    recommended: d.recommendation !== null,
  };
}

/**
 * Whether the study may be closed.
 *
 * Only the translation is required: without a question there is nothing to
 * present. Everything else is shown as pending and left to the user.
 */
export function canMarkReady(d: Decision): boolean {
  return d.resolution === null && d.readyAt === null && d.question.trim() !== '';
}

/**
 * How the resolution compared with what was recommended.
 *
 * `null` when there was no recommendation — a decision may reach phase 3
 * without one, and requiring one would produce token recommendations that
 * poison the measure.
 */
export type Outcome = 'coincidió' | 'se decidió otra' | 'fuera de las alternativas';

export function outcome(d: Decision): Outcome | null {
  if (d.resolution === null || d.recommendation === null) return null;
  if (d.resolution.optionId === null) return 'fuera de las alternativas';
  return d.resolution.optionId === d.recommendation.optionId ? 'coincidió' : 'se decidió otra';
}

/**
 * Whether the recommendation may still be changed.
 *
 * Closing the study is the instant it stops being arguable: that is when you
 * committed to it, before walking into the room. Between closing the study and
 * presenting it there may be a week, and editing it in that window would be
 * rewriting what you concluded with the meeting already booked.
 */
export function recommendationIsFrozen(d: Decision): boolean {
  return d.readyAt !== null;
}

/** The alternative a decision was resolved into, when it was one of them. */
export function resolvedOption(d: Decision): Option | null {
  if (d.resolution === null || d.resolution.optionId === null) return null;
  return d.options.find((o) => o.id === d.resolution!.optionId) ?? null;
}

export function recommendedOption(d: Decision): Option | null {
  if (d.recommendation === null) return null;
  return d.options.find((o) => o.id === d.recommendation!.optionId) ?? null;
}

/**
 * Order for the open decisions: what most needs looking at, first.
 *
 * Lapsed ones lead, then the nearest deadline, then the ones with no date at
 * all. Undated last rather than first because a decision nobody put a date on
 * is, by that very fact, the one nobody is waiting for.
 */
export function byUrgency(today: IsoDate) {
  return (a: Decision, b: Decision): number => {
    const lapsedA = phaseOf(a, today) === 'caducada';
    const lapsedB = phaseOf(b, today) === 'caducada';
    if (lapsedA !== lapsedB) return lapsedA ? -1 : 1;

    if (a.deadline === null && b.deadline === null) return 0;
    if (a.deadline === null) return 1;
    if (b.deadline === null) return -1;
    return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0;
  };
}

/** Open decisions, most urgent first. */
export function openByUrgency(decisions: Decision[], today: IsoDate): Decision[] {
  return decisions.filter(isOpen).sort(byUrgency(today));
}

/** Days until a decision's deadline, negative once past. `null` without one. */
export function daysToDeadline(d: Decision, today: IsoDate): number | null {
  if (d.deadline === null) return null;
  const ms = Date.parse(`${d.deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
