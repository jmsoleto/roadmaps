/**
 * Day <-> date conversion layer.
 *
 * The original HTML stored dates as integer day offsets from a hardcoded
 * 2026-01-01 origin. Here dates are absolute ISO days (design decision D2),
 * and the day <-> pixel math is done relative to a roadmap's own `startDate`.
 *
 * All arithmetic is in UTC so calendar-day math never drifts across DST.
 */

import type { IsoDate } from '../model/types';

const MS_PER_DAY = 86_400_000;

export const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a string in ISO `YYYY-MM-DD` day form — the one place that decides. */
export function isIsoDate(v: unknown): v is IsoDate {
  return typeof v === 'string' && ISO_RE.test(v);
}

/** Parse an ISO `YYYY-MM-DD` day into a UTC-midnight epoch millisecond value. */
export function parseIso(iso: IsoDate): number {
  if (!isIsoDate(iso)) throw new Error(`invalid ISO date: ${iso}`);
  const [y, m, d] = iso.split('-').map(Number);
  const ts = Date.UTC(y, m - 1, d);
  if (Number.isNaN(ts)) throw new Error(`invalid ISO date: ${iso}`);
  return ts;
}

/** Format a UTC-midnight epoch millisecond value as an ISO `YYYY-MM-DD` day. */
export function formatIso(ts: number): IsoDate {
  const d = new Date(ts);
  const y = d.getUTCFullYear().toString().padStart(4, '0');
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Return a new ISO day `n` days after `iso` (n may be negative). */
export function addDays(iso: IsoDate, n: number): IsoDate {
  return formatIso(parseIso(iso) + n * MS_PER_DAY);
}

/** Whole-day offset of `iso` from `origin` (origin -> 0, next day -> 1, ...). */
export function dayIndex(origin: IsoDate, iso: IsoDate): number {
  return Math.round((parseIso(iso) - parseIso(origin)) / MS_PER_DAY);
}

/** The ISO day at integer offset `n` from `origin` (inverse of `dayIndex`). */
export function dateFromDay(origin: IsoDate, n: number): IsoDate {
  return formatIso(parseIso(origin) + n * MS_PER_DAY);
}

/** Pixel x-position of a day offset, given the pixel-per-day zoom. */
export function dayToX(dayOffset: number, dayW: number): number {
  return dayOffset * dayW;
}

/** Human label like "3 mar" for a given ISO day (matches the original `fmtDate`). */
export function fmtDate(iso: IsoDate): string {
  const d = new Date(parseIso(iso));
  return `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`;
}

/** UTC day-of-week: 0 = Sunday .. 6 = Saturday. */
export function dayOfWeek(iso: IsoDate): number {
  return new Date(parseIso(iso)).getUTCDay();
}

const dow = dayOfWeek;

/** Today as an ISO day, from the local calendar (what the user sees as "hoy"). */
export function todayIso(): IsoDate {
  const now = new Date();
  return formatIso(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** True for Saturday and Sunday. */
export function isWeekend(iso: IsoDate): boolean {
  const w = dow(iso);
  return w === 0 || w === 6;
}

/** Snap to the nearest workday: Saturday -> Friday, Sunday -> Monday. */
export function snapToWorkday(iso: IsoDate): IsoDate {
  const w = dow(iso);
  if (w === 6) return addDays(iso, -1);
  if (w === 0) return addDays(iso, 1);
  return iso;
}

/** Snap forward to a workday: Saturday -> Monday, Sunday -> Monday. */
export function snapForward(iso: IsoDate): IsoDate {
  const w = dow(iso);
  if (w === 6) return addDays(iso, 2);
  if (w === 0) return addDays(iso, 1);
  return iso;
}
