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

/*
 * ---- La convención: el fin de una fecha es inclusivo ----
 *
 * El último día nombrado forma parte del trabajo. Un item de lunes a viernes
 * ocupa cinco días y su barra cubre el viernes entero.
 *
 * Las dos funciones de abajo son **el** sitio donde esa convención vive, y esto
 * no es una preferencia de estilo: antes de existir estaba repetida en nueve
 * expresiones sueltas —dos `barGeom` (una por vista), tres topes de gesto, el
 * origen de las flechas, el centro del rombo, sus anclajes y el redondeo del
 * arrastre— que discrepaban entre sí sin que nada lo delatara. El `+1` no debe
 * volver a aparecer suelto en ninguna otra parte: quien necesite saber cuántos
 * días ocupa algo llama a `spanDays`, y quien necesite dónde termina su barra
 * llama a `endEdgeX`.
 */

/**
 * Días que ocupa el rango `[startIso, endIso]`, con el fin inclusivo.
 *
 * Un rango de un solo día vale 1, que es el item más corto legal. Un rango
 * invertido vale 0 y no un negativo: no es un error, es que no hay nada ahí.
 */
export function spanDays(startIso: IsoDate, endIso: IsoDate): number {
  return Math.max(0, dayIndex(startIso, endIso) + 1);
}

/**
 * Píxel donde termina el día `endIso`, medido desde `originIso`.
 *
 * Es el borde derecho de una barra que acaba ahí, y coincide exactamente con el
 * borde izquierdo del día siguiente. De aquí cuelga el origen de las flechas de
 * dependencia, para que ninguna arranque por dentro de la barra de la que sale.
 */
export function endEdgeX(endIso: IsoDate, originIso: IsoDate, dayW: number): number {
  return (dayIndex(originIso, endIso) + 1) * dayW;
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

/**
 * Días de lunes a viernes en `[a, b]`, con los dos extremos incluidos.
 *
 * Inclusiva por los dos lados porque es la convención que rige aquí (ver
 * `spanDays`), y 0 —no un negativo— cuando `b < a`: «no hay solape» es el caso
 * corriente y no un error. La mayoría de los items de un roadmap no tocan un
 * sprint dado, y quien pregunta quiere un sumando, no una excepción.
 *
 * En forma cerrada, no iterando día a día. El solape con un sprint nunca pasa de
 * 14 días, así que iterar sería igual de rápido; lo que se gana es que los casos
 * que fallan —empezar en sábado, terminar en domingo, un rango de un solo día
 * que cae en fin de semana— son aritmética que se prueba y no un bucle que hay
 * que recorrer con la cabeza (D6).
 *
 * Laborable es de lunes a viernes y nada más: no se descuentan festivos, porque
 * no hay fuente fiable y los autonómicos y locales darían cuentas distintas para
 * la misma pregunta. Es una decisión declarada, no una carencia.
 */
export function workdaysBetween(a: IsoDate, b: IsoDate): number {
  const total = spanDays(a, b);
  if (total === 0) return 0;

  const weeks = Math.floor(total / 7);
  const rest = total % 7;
  // Posición de `a` en una semana que empieza en lunes: 0 = lunes .. 6 = domingo.
  const from = (dow(a) + 6) % 7;

  // Semanas completas: cinco laborables cada una, empiecen donde empiecen.
  // Del resto, los que quedan antes del sábado, más los que ya han dado la
  // vuelta y caen sobre el lunes siguiente (nunca más de cinco).
  const beforeWeekend = Math.min(rest, Math.max(0, 5 - from));
  const afterWeekend = Math.max(0, rest - (7 - from));
  return weeks * 5 + beforeWeekend + afterWeekend;
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
