/**
 * Human phrasing for the hub's "último acceso".
 *
 * `now` is a parameter rather than a `Date.now()` call so this stays pure and
 * testable, the same way `getMetaWindow` takes `today`.
 */

const pad = (n: number) => String(n).padStart(2, '0');

const startOfDay = (ts: number): number => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const clock = (ts: number): string => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Phrase a past instant relative to `now`.
 *
 * Days are counted as calendar days apart, not as elapsed 24-hour spans: at
 * 00:30 the previous evening is "ayer", which is what a person would say, while
 * an elapsed-hours count would call it "hace 6 horas".
 */
export function formatRelative(then: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);

  if (days <= 0) return `hoy ${clock(then)}`;
  if (days === 1) return `ayer ${clock(then)}`;
  if (days < 7) return `hace ${days} días`;

  const d = new Date(then);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_LONG_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** The landing's eyebrow date, e.g. "miércoles 20 de agosto". */
export function formatLongDate(ts: number): string {
  const d = new Date(ts);
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG_ES[d.getMonth()]}`;
}
