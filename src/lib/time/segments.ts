/**
 * Sprint and quarter segment computation.
 *
 * Segments are returned in day-offset space relative to a roadmap's own
 * `startDate` (so `start`/`end` are integer day offsets, 0 = the window's
 * first day). This replaces the original code's reliance on a fixed
 * 2026-01-01 origin while keeping the absolute sprint numbering intact.
 */

import type { IsoDate } from '../model/types';
import { dayIndex, MONTHS_ES } from './timeline';
import { SPRINT_LEN, SPRINT_ANCHOR_DATE, SPRINT_ANCHOR_NUM } from '../config';

export interface MonthSegment {
  start: number;
  end: number;
  label: string;
  yearStart: boolean;
}

export interface WeekendSpan {
  start: number;
}

/** Month header segments over `[0, windowDays)`, in day-offset space. */
export function getMonthSegments(startDate: IsoDate, windowDays: number): MonthSegment[] {
  const y0 = Number(startDate.slice(0, 4));
  const m0 = Number(startDate.slice(5, 7)) - 1;
  const segments: MonthSegment[] = [];
  let y = y0;
  let m = m0;
  for (;;) {
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const start = dayIndex(startDate, first);
    if (start >= windowDays) break;
    const nextY = m === 11 ? y + 1 : y;
    const nextM = m === 11 ? 0 : m + 1;
    const nextFirst = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`;
    const end = Math.min(dayIndex(startDate, nextFirst), windowDays);
    const yearStart = m === 0;
    const label = yearStart ? `ENE ${y}` : `${MONTHS_ES[m]} '${String(y).slice(2)}`;
    if (end > 0) segments.push({ start: Math.max(start, 0), end, label, yearStart });
    y = nextY;
    m = nextM;
  }
  return segments;
}

export interface SprintSegment {
  start: number;
  end: number;
  num: number;
}

export interface QuarterSegment {
  start: number;
  end: number;
  q: number;
  year: number;
}

/** Sprint segments covering `[0, windowDays)`, numbered from the absolute anchor. */
export function getSprintSegments(startDate: IsoDate, windowDays: number): SprintSegment[] {
  const segments: SprintSegment[] = [];
  // Anchor expressed as a day offset from this roadmap's start.
  let idx = dayIndex(startDate, SPRINT_ANCHOR_DATE);
  let num = SPRINT_ANCHOR_NUM;
  // Walk back until we cover day 0.
  while (idx > -SPRINT_LEN) {
    idx -= SPRINT_LEN;
    num -= 1;
  }
  // Walk forward covering the whole visible range.
  while (idx < windowDays) {
    const end = Math.min(idx + SPRINT_LEN, windowDays);
    if (end > 0) segments.push({ start: Math.max(idx, 0), end, num });
    idx += SPRINT_LEN;
    num += 1;
  }
  return segments;
}

/**
 * Quarter segments (meta view). Q1 starts 1 Mar, Q2 1 Jun, Q3 1 Sep, Q4 1 Dec
 * (Q4 crosses the year end). Returned in day-offset space over `[0, windowDays)`.
 */
export function getQuarterSegments(startDate: IsoDate, windowDays: number): QuarterSegment[] {
  const startYear = Number(startDate.slice(0, 4));
  const endYear = startYear + Math.ceil(windowDays / 365) + 2;

  const boundaries: { date: IsoDate; q: number; year: number }[] = [];
  for (let y = startYear - 1; y <= endYear; y++) {
    boundaries.push({ date: `${y}-03-01`, q: 1, year: y });
    boundaries.push({ date: `${y}-06-01`, q: 2, year: y });
    boundaries.push({ date: `${y}-09-01`, q: 3, year: y });
    boundaries.push({ date: `${y}-12-01`, q: 4, year: y });
  }
  boundaries.sort((a, b) => (a.date < b.date ? -1 : 1));

  const segments: QuarterSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const b = boundaries[i];
    const next = boundaries[i + 1];
    const startIdx = dayIndex(startDate, b.date);
    const endIdx = dayIndex(startDate, next.date);
    if (endIdx <= 0 || startIdx >= windowDays) continue;
    segments.push({
      start: Math.max(startIdx, 0),
      end: Math.min(endIdx, windowDays),
      q: b.q,
      year: b.year,
    });
  }
  return segments;
}
