/**
 * How Personas Hub writes its numbers (personas-capacidad, «Precisión y redondeo»).
 *
 * The engine never rounds (BR-10); this is the only place that does, and only
 * for the eye. One decimal at most, with the Spanish comma, and no locale API:
 * `toLocaleString` would put a thousands separator in `1.200 h` on some engines
 * and not on others, and these figures are compared across screens.
 */

/** `469.2` → `469,2`; `80` → `80`; never `-0`. */
export function fmtNumber(n: number): string {
  const r = Math.round(n * 10) / 10;
  const v = Object.is(r, -0) || Math.abs(r) < 1e-9 ? 0 : r;
  // A real minus sign, as in the discounts: `−16`, not `-16`.
  return String(v).replace('.', ',').replace('-', '−');
}

export const fmtHours = (n: number): string => `${fmtNumber(n)} h`;

/** A discount, with a real minus sign: `−24 h`. Zero is `0 h`, not `−0 h`. */
export const fmtDiscount = (n: number): string =>
  Math.round(n * 10) === 0 ? '0 h' : `−${fmtNumber(n)} h`;

/** A percentage as it was typed: `33.3` → `33,3 %`. */
export const fmtPercent = (p: number): string => `${String(p).replace('.', ',')} %`;

/** What a person typed for a number, read with either decimal mark. */
export function parseNumber(text: string): number | null {
  // Either minus: the one the keyboard types and the one these screens print.
  const t = text.trim().replace(',', '.').replace('−', '-');
  if (t === '' || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** `2026-12-08` → `8 dic`. */
export function fmtDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** `2026-12-08` → `mar 8`. For the matrix's column heads. */
export function fmtWeekday(iso: string): { weekday: string; day: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], day: d };
}

/** `30 nov – 11 dic 2026`; the year once, at the end. */
export function fmtRange(start: string, end: string): string {
  const year = end.slice(0, 4);
  const startYear = start.slice(0, 4);
  return `${fmtDay(start)}${startYear !== year ? ` ${startYear}` : ''} – ${fmtDay(end)} ${year}`;
}
