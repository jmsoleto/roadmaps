/**
 * What the presentation phase is allowed to show, and what the two charts draw
 * (design decisions D1, D2 and D3).
 *
 * The important part of this file is what it leaves out. The presentation is
 * built from an explicit subset of a decision rather than from the decision
 * itself, so projecting the technical doubt, the internal note or the written
 * argument for the recommendation would take a code change — not a slip in a
 * meeting.
 *
 * Pure, with `today` as a parameter, like every other derivation here.
 */

import type { IsoDate } from '../model/types';
import type { Decision, Option } from './model/types';
import { CRITERIA, type CriterionId } from './model/criteria';

/** The letter an alternative is known by while it is on screen. */
export const optionLetter = (i: number): string => String.fromCharCode(65 + i);

/** One criterion of one alternative, as the room sees it. */
export interface PresentedAssessment {
  criterion: CriterionId;
  label: string;
  text: string;
  /** Rendered magnitude, or `null` when nobody quantified it. */
  value: string | null;
}

export interface PresentedOption {
  id: string;
  letter: string;
  text: string;
  recommended: boolean;
  assessments: PresentedAssessment[];
}

/**
 * Everything the presentation may show, and nothing else.
 *
 * Note the absences: no `origin`, no `originContext`, no `internalNote`, and no
 * `recommendation.why`. The recommendation is *marked* — whoever decides has a
 * right to know what you think — but the argument is spoken, not projected.
 */
export interface Presentable {
  id: string;
  question: string;
  project: string;
  stakeholder: string;
  deadline: IsoDate | null;
  options: PresentedOption[];
  resolution: Decision['resolution'];
}

function renderValue(o: Option, criterion: CriterionId): string | null {
  const value = o.assessments.find((a) => a.criterion === criterion)?.value ?? null;
  if (!value) return null;
  switch (value.kind) {
    case 'effort':
      return value.people === null
        ? `${value.weeks} sem`
        : `${value.weeks} sem · ${value.people} ${value.people === 1 ? 'dev' : 'devs'}`;
    case 'money':
      return formatMoney(value.amount);
    case 'date':
      return formatMonth(value.date);
    case 'level':
      return value.level;
    case 'appraisal':
      return `${value.score} de 5`;
  }
}

export function presentableOf(d: Decision): Presentable {
  return {
    id: d.id,
    question: d.question,
    project: d.project,
    stakeholder: d.stakeholder,
    deadline: d.deadline,
    options: d.options.map((o, i) => ({
      id: o.id,
      letter: optionLetter(i),
      text: o.text,
      recommended: d.recommendation?.optionId === o.id,
      assessments: CRITERIA.map((c) => ({
        criterion: c.id,
        label: c.label,
        text: o.assessments.find((a) => a.criterion === c.id)?.text ?? '',
        value: renderValue(o, c.id),
      })).filter((a) => a.text.trim() !== '' || a.value !== null),
    })),
    resolution: d.resolution,
  };
}

// ---- chart data ----

/**
 * An alternative a chart could not place.
 *
 * Declared beside the chart rather than dropped, and never drawn at the origin:
 * a point at zero effort would read as "this one is free", which is a lie the
 * room would believe.
 */
export interface Unplotted {
  letter: string;
  text: string;
}

export interface EffortBenefitPoint {
  id: string;
  letter: string;
  text: string;
  recommended: boolean;
  /** Weeks of effort. */
  weeks: number;
  /** Declared appraisal, 1..5. */
  score: number;
}

export interface EffortBenefit {
  points: EffortBenefitPoint[];
  unplotted: Unplotted[];
  maxWeeks: number;
}

export function effortBenefit(d: Decision): EffortBenefit {
  const points: EffortBenefitPoint[] = [];
  const unplotted: Unplotted[] = [];

  d.options.forEach((o, i) => {
    const effort = o.assessments.find((a) => a.criterion === 'esfuerzo')?.value;
    const benefit = o.assessments.find((a) => a.criterion === 'beneficio')?.value;
    const letter = optionLetter(i);

    if (effort?.kind === 'effort' && benefit?.kind === 'appraisal') {
      points.push({
        id: o.id,
        letter,
        text: o.text,
        recommended: d.recommendation?.optionId === o.id,
        weeks: effort.weeks,
        score: benefit.score,
      });
    } else {
      unplotted.push({ letter, text: o.text });
    }
  });

  return { points, unplotted, maxWeeks: Math.max(1, ...points.map((p) => p.weeks)) };
}

export interface TimelinePoint {
  id: string;
  letter: string;
  text: string;
  recommended: boolean;
  date: IsoDate;
}

export interface Timeline {
  points: TimelinePoint[];
  unplotted: Unplotted[];
  /** Span the axis covers, already stretched to contain today. */
  from: IsoDate;
  to: IsoDate;
}

export function timeline(d: Decision, today: IsoDate): Timeline {
  const points: TimelinePoint[] = [];
  const unplotted: Unplotted[] = [];

  d.options.forEach((o, i) => {
    const when = o.assessments.find((a) => a.criterion === 'tiempo')?.value;
    const letter = optionLetter(i);
    if (when?.kind === 'date') {
      points.push({
        id: o.id,
        letter,
        text: o.text,
        recommended: d.recommendation?.optionId === o.id,
        date: when.date,
      });
    } else {
      unplotted.push({ letter, text: o.text });
    }
  });

  // The axis always contains today, so "how far off is this" is readable
  // without anyone having to find the present on it.
  const dates = [today, ...points.map((p) => p.date)].sort();
  return { points, unplotted, from: dates[0], to: dates[dates.length - 1] };
}

/** Where a date sits on the axis, 0 to 1. Both ends equal means everything at 0. */
export function positionOn(from: IsoDate, to: IsoDate, date: IsoDate): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  const x = Date.parse(`${date}T00:00:00Z`);
  if (b === a) return 0;
  return Math.min(1, Math.max(0, (x - a) / (b - a)));
}

/** Month boundaries between the two ends, for the axis ticks. */
export function monthTicks(from: IsoDate, to: IsoDate): { date: IsoDate; label: string }[] {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const out: { date: IsoDate; label: string }[] = [];

  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  // A long span would crowd the axis with a tick a pixel apart; every other
  // month keeps it readable without changing what it says.
  const months =
    (end.getUTCFullYear() - cursor.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - cursor.getUTCMonth());
  const step = months > 14 ? 3 : months > 7 ? 2 : 1;

  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    out.push({ date: iso, label: MONTHS_SHORT[cursor.getUTCMonth()] });
    cursor.setUTCMonth(cursor.getUTCMonth() + step);
  }
  return out;
}

const MONTHS_SHORT = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

function formatMonth(iso: IsoDate): string {
  const [y, m] = iso.split('-');
  return `${MONTHS_SHORT[Number(m) - 1].toLowerCase()} '${y.slice(2)}`;
}

function formatMoney(amount: number): string {
  if (amount >= 1000) return `${Math.round(amount / 1000)} k€`;
  return `${amount} €`;
}
