/**
 * Pasting a year's holidays (personas-hub, «Localidades y festivos»; D10).
 *
 * One holiday per line, written the way it comes out of a PDF, a web page or a
 * spreadsheet: `2026-12-08 Inmaculada`, `08/12/2026;Inmaculada`, a tab between
 * the two. Lines that cannot be read are given back as they were, so the person
 * sees which ones, and the rest still go in.
 */

import { formatIso, isIsoDate, parseIso } from '../time/timeline';
import type { IsoDate } from '../model/types';
import type { Holiday } from './model';

export interface PastedHolidays {
  holidays: Holiday[];
  /** The lines that were not understood, trimmed, in order. */
  rejected: string[];
}

const LINE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})(?:[\s;,]+(.*))?$/;

/** A real calendar day, or `null`: `2026-02-30` is not one. */
export function readDate(text: string): IsoDate | null {
  let iso = text;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (dmy) iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  if (!isIsoDate(iso)) return null;
  try {
    return formatIso(parseIso(iso)) === iso ? iso : null;
  } catch {
    return null;
  }
}

export function parseHolidays(text: string): PastedHolidays {
  const holidays: Holiday[] = [];
  const rejected: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;
    const m = LINE.exec(line);
    const date = m ? readDate(m[1]) : null;
    if (!m || date === null) {
      rejected.push(line);
      continue;
    }
    const name = (m[2] ?? '').trim().replace(/^[;,\s]+/, '');
    holidays.push({ date, name: name === '' ? 'Festivo' : name });
  }
  return { holidays, rejected };
}

/**
 * Add holidays to a location's list: a date it already has is not added again,
 * and the first of two equal dates in the paste wins.
 */
export function mergeHolidays(
  existing: readonly Holiday[],
  incoming: readonly Holiday[],
): { holidays: Holiday[]; added: number; repeated: number } {
  const dates = new Set(existing.map((h) => h.date));
  const holidays = [...existing];
  let added = 0;
  let repeated = 0;
  for (const h of incoming) {
    if (dates.has(h.date)) {
      repeated++;
      continue;
    }
    dates.add(h.date);
    holidays.push(h);
    added++;
  }
  holidays.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { holidays, added, repeated };
}

/** What the screen says after a paste. */
export function pasteNotice(added: number, repeated: number, rejected: string[]): string {
  const parts = [`${added} ${added === 1 ? 'festivo añadido' : 'festivos añadidos'}`];
  if (repeated > 0) parts.push(`${repeated} ya ${repeated === 1 ? 'estaba' : 'estaban'}`);
  if (rejected.length > 0) {
    parts.push(
      `${rejected.length === 1 ? 'no se entiende' : 'no se entienden'}: ${rejected
        .map((l) => `«${l}»`)
        .join(', ')}`,
    );
  }
  return parts.join(' · ');
}
