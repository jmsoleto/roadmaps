/**
 * Canonical data model for Decisions.
 *
 * Three ideas carry this file, the first two inherited from `completion` in
 * Roadmaps and the third from the phases this app is built around:
 *
 *  - **The state is never stored.** There is no `phase` field; the lifecycle is
 *    derived in `./state.ts` from which fields are set. A stored state admits
 *    combinations that mean nothing and every loader would have to defend
 *    against them.
 *  - **What must not be rewritten freezes at the instant it stops being
 *    arguable.** For a recommendation that instant is when the study is
 *    declared finished — `readyAt` — not when the decision reaches the room.
 *  - **Text always, value when there is one.** An assessment says its sentence
 *    even when nobody has quantified it.
 */

import type { IsoDate } from '../../model/types';
import type { CriterionId, RiskLevel } from './criteria';
import type { Attachment } from './attachments';

/**
 * What one alternative is worth on one criterion.
 *
 * `text` is what gets read out loud; `value` is what a chart can draw. Either
 * may be absent — an assessment with only a sentence is complete for the room
 * and merely invisible to a chart.
 *
 * `value` is typed by the criterion's `kind`:
 *   effort    → `{ weeks, people }`
 *   money     → `number` (the amount)
 *   date      → `IsoDate`
 *   level     → `RiskLevel`
 *   appraisal → 1..5
 *   none      → always `null`
 */
export type AssessmentValue =
  | { kind: 'effort'; weeks: number; people: number | null }
  | { kind: 'money'; amount: number }
  | { kind: 'date'; date: IsoDate }
  | { kind: 'level'; level: RiskLevel }
  | { kind: 'appraisal'; score: number };

export interface Assessment {
  criterion: CriterionId;
  text: string;
  value: AssessmentValue | null;
}

/** One of the alternatives on the table. */
export interface Option {
  id: string;
  text: string;
  /** At most one assessment per criterion. Empty is a valid answer. */
  assessments: Assessment[];
}

/**
 * What was recommended, and why, captured during the study.
 *
 * `at` is the instant it was frozen: the day the study was closed. Together
 * with `Resolution` it is what lets the app say whether the recommendation
 * held, which is the whole reason to record it.
 */
export interface Recommendation {
  optionId: string;
  /** The argument said out loud. Not the internal note. */
  why: string;
  /** The day it stopped being editable. */
  at: IsoDate;
}

/**
 * How the decision was closed.
 *
 * `optionId` is `null` when the answer was not one of the alternatives offered.
 * That is not a defect in the record: it says the framing was wrong, which is
 * information about whoever prepared the decision.
 */
export interface Resolution {
  optionId: string | null;
  /** Free text. Required when `optionId` is null, optional otherwise. */
  text: string;
  at: IsoDate;
}

export type Impact = 'alto' | 'medio' | 'bajo';

/** How the captured text got in. */
export type CaptureSource = 'tecleado' | 'dictado';

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
  /** When it was captured, and by which route the text got in. */
  capturedAt: IsoDate | null;
  captureSource: CaptureSource;
  /**
   * The same question, phrased so that whoever decides can answer it.
   *
   * Empty means the decision is still in phase 1: captured, not yet translated.
   * That absence *is* the phase — there is no flag beside it.
   *
   * It is also the only one of the decision's texts that the presentation phase
   * shows. Everything else here is working material.
   */
  question: string;

  /** Free text with suggestions, deliberately not a foreign key. */
  project: string;
  /** Who decides, on the business side. */
  stakeholder: string;
  deadline: IsoDate | null;
  impact: Impact | null;
  notes: string;
  /**
   * What is thought and not said: that team A will not make it, that the
   * vendor is on the way out.
   *
   * A field of its own, apart from the recommendation's `why`, precisely so it
   * cannot be projected by accident. `why` is the argument spoken in the room;
   * this never leaves the study.
   */
  internalNote: string;

  /**
   * Visual support for the study: diagrams, screenshots.
   *
   * Only the fiches. The bytes live in their own object store, keyed by the
   * fiche's id, so writing text never rewrites an image (D1). A fiche whose
   * bytes are missing is not an error — it is what an imported document
   * produces, and it is shown as a declared absence.
   */
  attachments: Attachment[];

  options: Option[];
  /**
   * The day the study was declared finished, or `null` while it is open.
   *
   * An explicit gesture, never inferred: it is the one transition the data
   * cannot imply, because having three alternatives written down does not mean
   * the thinking is done. Freezing the recommendation hangs off it.
   */
  readyAt: IsoDate | null;
  recommendation: Recommendation | null;
  resolution: Resolution | null;
}

/** The full persisted state of the Decisions app. */
export interface DecisionsData {
  decisions: Decision[];
}

export const emptyDecisionsData = (): DecisionsData => ({ decisions: [] });
