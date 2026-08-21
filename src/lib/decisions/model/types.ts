/**
 * Canonical data model for Decisions.
 *
 * Two ideas carry this file, both inherited from `completion` in Roadmaps:
 *
 *  - **The state is never stored.** There is no `state: 'pendiente'` field
 *    beside `resolution`; the lifecycle is derived in `./state.ts` from which
 *    fields are set. A stored state admits combinations that mean nothing —
 *    resolved and pending at once — and every loader, importer and mutation
 *    would have to defend against them (D2).
 *  - **What must not be rewritten is frozen at the instant it stops being
 *    arguable.** The recommendation freezes when the decision is raised, not
 *    when it is resolved (D3).
 */

import type { IsoDate } from '../../model/types';
import type { AxisId, EffectDirection } from './axes';

/** What an alternative does to one axis of the trade-off. */
export interface Effect {
  axis: AxisId;
  direction: EffectDirection;
  /** Optional one-liner: *why* it moves that way. */
  note: string;
}

/** One of the alternatives on the table. */
export interface Option {
  id: string;
  text: string;
  /**
   * Declared effects, at most one per axis. Empty is a valid answer: a forced
   * axis is worse than a gap (D5).
   */
  effects: Effect[];
}

/**
 * What was recommended, and why, captured before the conversation.
 *
 * `at` is the instant it was frozen — the moment the decision was raised, not
 * the moment it was written. Together with `Resolution` it is what lets the app
 * say whether the recommendation held, which is the whole reason to record it.
 */
export interface Recommendation {
  optionId: string;
  why: string;
  /** The day it stopped being editable. */
  at: IsoDate;
}

/**
 * How the decision was closed.
 *
 * `optionId` is `null` when the answer was not one of the alternatives offered.
 * That is not a defect in the record: it says the framing was wrong, which is
 * information about whoever prepared the decision (D3).
 */
export interface Resolution {
  optionId: string | null;
  /** Free text. Required when `optionId` is null, optional otherwise. */
  text: string;
  at: IsoDate;
}

export type Impact = 'alto' | 'medio' | 'bajo';

export interface Decision {
  id: string;
  /**
   * The doubt as it was born, usually in technical language.
   *
   * May be empty for a decision that arose directly in a conversation with the
   * business side.
   */
  origin: string;
  /** Where it came from, e.g. "reunión equipo API · 12/08". Free text. */
  originContext: string;
  /**
   * The same question, phrased so that whoever decides can answer it.
   *
   * Empty means the decision is still a draft: captured, not yet translated.
   * That absence *is* the draft state — there is no flag beside it (D2).
   */
  question: string;

  /** Free text with suggestions, deliberately not a foreign key (D6). */
  project: string;
  /** Who decides, on the business side. */
  stakeholder: string;
  deadline: IsoDate | null;
  impact: Impact | null;
  notes: string;

  options: Option[];
  /**
   * The day the decision was put in front of the business, or `null`.
   *
   * An explicit gesture, never inferred: inferring it would freeze the
   * recommendation at an instant that did not happen.
   */
  raisedAt: IsoDate | null;
  recommendation: Recommendation | null;
  resolution: Resolution | null;
}

/** The full persisted state of the Decisions app. */
export interface DecisionsData {
  decisions: Decision[];
}

export const emptyDecisionsData = (): DecisionsData => ({ decisions: [] });
