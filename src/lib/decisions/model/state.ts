/**
 * Pure derivations over a decision (no reactivity, easy to test).
 *
 * The lifecycle lives here and nowhere else. Nothing in the model stores it:
 * a decision's state is a reading of which fields are set plus today's date,
 * so it cannot disagree with the data it describes (D2).
 *
 * `today` is a parameter rather than a `todayIso()` call, the same shape
 * `getMetaWindow` uses in Roadmaps, so this file stays pure.
 */

import type { IsoDate } from '../../model/types';
import type { Decision, Option } from './types';

/**
 * Where a decision is in its life.
 *
 * `caducada` is derived and not stored for a second reason beyond D2: it
 * depends on *today*. Storing it would need a daily sweep nobody will run, and
 * a lapsed decision would stay lapsed after its deadline moved — when moving
 * the deadline is precisely how you revive it.
 */
export type DecisionState = 'borrador' | 'preparada' | 'planteada' | 'resuelta' | 'caducada';

export function decisionState(d: Decision, today: IsoDate): DecisionState {
  if (d.resolution !== null) return 'resuelta';
  if (d.question.trim() === '') return 'borrador';
  if (d.raisedAt === null) return 'preparada';
  // Lapsed only strictly after the deadline: a decision is not late on the very
  // day it is due.
  if (d.deadline !== null && d.deadline < today) return 'caducada';
  return 'planteada';
}

/** A decision still waiting for an answer, whatever stage it is at. */
export function isOpen(d: Decision, today: IsoDate): boolean {
  return decisionState(d, today) !== 'resuelta';
}

/** Captured but not yet translated into a question for the business side. */
export function isDraft(d: Decision): boolean {
  return d.resolution === null && d.question.trim() === '';
}

/**
 * How the resolution compared with what was recommended.
 *
 * `null` when there was no recommendation — a decision may be raised without
 * one, and requiring one would produce token recommendations that poison the
 * measure (D3).
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
 * Raising is the instant it stops being arguable: that is when you committed to
 * it in front of the business side. Between raising and resolving there may be
 * a week, and editing it in that window would be rewriting what you said while
 * already sensing which way the answer is going (D3).
 */
export function recommendationIsFrozen(d: Decision): boolean {
  return d.raisedAt !== null;
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
    const lapsedA = decisionState(a, today) === 'caducada';
    const lapsedB = decisionState(b, today) === 'caducada';
    if (lapsedA !== lapsedB) return lapsedA ? -1 : 1;

    if (a.deadline === null && b.deadline === null) return 0;
    if (a.deadline === null) return 1;
    if (b.deadline === null) return -1;
    return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0;
  };
}

/** Open decisions, most urgent first. */
export function openByUrgency(decisions: Decision[], today: IsoDate): Decision[] {
  return decisions.filter((d) => isOpen(d, today)).sort(byUrgency(today));
}

/** Days until a decision's deadline, negative once past. `null` without one. */
export function daysToDeadline(d: Decision, today: IsoDate): number | null {
  if (d.deadline === null) return null;
  const ms = Date.parse(`${d.deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
