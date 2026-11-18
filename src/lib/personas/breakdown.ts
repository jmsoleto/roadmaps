/**
 * What each figure of a sprint's summary is made of (personas-capacidad,
 * «Cada cifra se explica»; design D4).
 *
 * Not a second calculation: it reads the engine's matrix and groups it. That is
 * what makes an opened figure add up to the figure by construction rather than
 * by care — the day two components rounded differently, a hand-written sum would
 * stop matching, and an explanation that does not add up is worse than none.
 */

import type { IsoDate } from '../model/types';
import type { DayCause, SprintCapacity } from './capacity';
import { ABSENCE_LABEL } from './model';

export type Line =
  'theoretical' | 'holiday' | 'absence' | 'dedication' | 'available' | 'reserve' | 'planning';

export const LINES: readonly Line[] = [
  'theoretical',
  'holiday',
  'absence',
  'dedication',
  'available',
  'reserve',
  'planning',
];

export const LINE_LABEL: Record<Line, string> = {
  theoretical: 'Teóricas',
  holiday: 'Festivos',
  absence: 'Ausencias',
  dedication: 'Dedicación',
  available: 'Disponible',
  reserve: 'Reserva de incidencias',
  planning: 'Planificable',
};

/** Whether a line takes hours away, and is painted with a minus. */
export const IS_DISCOUNT: Record<Line, boolean> = {
  theoretical: false,
  holiday: true,
  absence: true,
  dedication: true,
  available: false,
  reserve: true,
  planning: false,
};

export interface Entry {
  personId: string;
  name: string;
  hours: number;
  /** For a day's discount: which day, and why. */
  date?: IsoDate;
  cause?: string;
  /** For the per-person lines: how the hours came about, in words. */
  detail?: string;
}

export function causeLabel(cause: DayCause | null): string {
  if (cause === null) return '';
  if (cause.kind === 'festivo') return cause.name;
  const type = ABSENCE_LABEL[cause.type];
  return cause.comment ? `${type} · ${cause.comment}` : type;
}

/** The team figure a line stands for. */
export function lineValue(c: SprintCapacity, line: Line): number {
  return c.team[line];
}

/**
 * The entries a line opens into.
 *
 * Holidays and absences open by person, date and cause; every other line by
 * person. The reserve is applied to the team's figure (BR-06), and it is shown
 * per person in proportion to each one's available hours, which is the only
 * split that adds up without inventing a rule.
 */
export function breakdown(c: SprintCapacity, line: Line): Entry[] {
  const fraction = c.team.incidentPercentage / 100;
  const out: Entry[] = [];
  for (const p of c.people) {
    const base = { personId: p.person.id, name: p.person.name };
    const t = p.totals;
    switch (line) {
      case 'holiday':
      case 'absence':
        for (const d of p.days) {
          const hours = line === 'holiday' ? d.holiday : d.absence;
          if (hours > 0) out.push({ ...base, hours, date: d.date, cause: causeLabel(d.cause) });
        }
        break;
      case 'theoretical': {
        const days = p.days.filter((d) => d.state !== 'finde').length;
        out.push({
          ...base,
          hours: t.theoretical,
          detail: `${days} días × ${p.person.hoursPerDay} h`,
        });
        break;
      }
      case 'dedication': {
        if (t.dedication === 0) break;
        const net = t.theoretical - t.holiday - t.absence;
        out.push({
          ...base,
          hours: t.dedication,
          detail: `al ${pct(p.dedication)}${p.overridden ? ' en este sprint' : ''} de ${hrs(net)}`,
        });
        break;
      }
      case 'available':
        out.push({
          ...base,
          hours: t.available,
          detail: `${hrs(t.theoretical)} − ${hrs(t.holiday)} − ${hrs(t.absence)} − ${hrs(t.dedication)}`,
        });
        break;
      case 'reserve':
        if (t.available * fraction > 0) out.push({ ...base, hours: t.available * fraction });
        break;
      case 'planning':
        out.push({ ...base, hours: t.available * (1 - fraction) });
        break;
    }
  }
  return out;
}

// The fraction back to the percentage that was typed; four decimals absorb
// the binary error of `/ 100` without cutting a `33,33 %`.
const pct = (f: number) => `${String(Math.round(f * 1e6) / 1e4).replace('.', ',')} %`;
const hrs = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
