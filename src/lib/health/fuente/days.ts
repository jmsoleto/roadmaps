/**
 * From the collector's hours to the days Health Hub measures
 * (health-colector-kibana, D3).
 *
 * A day counts only when every one of its hours has data: 24 on most days, 23
 * and 25 when the clocks change. A partial day would be a low figure that the
 * trend reads as an improvement, so it stays «not measured» here and is still
 * visible in the hourly view. Every offset in use is a whole number of hours,
 * so a complete day is exact, and nothing is ever marked estimated.
 */

import type { IsoDate } from '../../model/types';
import type { Observacion } from '../model';

const HORA_MS = 3_600_000;

const formatos = new Map<string, Intl.DateTimeFormat>();

function formato(zona: string): Intl.DateTimeFormat {
  let f = formatos.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: zona,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatos.set(zona, f);
  }
  return f;
}

/** The calendar day an instant falls on, in a time zone. */
export function diaEn(t: number, zona: string): IsoDate {
  return formato(zona).format(new Date(t)) as IsoDate;
}

/**
 * The start of every hour of a day, in ms. Hours are taken from a window wide
 * enough for any offset in use (−12 to +14), and kept when they fall on that day.
 */
export function horasDelDia(dia: IsoDate, zona: string): number[] {
  const medianocheUtc = Date.parse(`${dia}T00:00:00Z`);
  const out: number[] = [];
  for (let t = medianocheUtc - 14 * HORA_MS; t < medianocheUtc + 38 * HORA_MS; t += HORA_MS) {
    if (diaEn(t, zona) === dia) out.push(t);
  }
  return out;
}

/** One observation per complete day of a metric's hours. */
export function diasCompletos(
  horas: ReadonlyMap<number, number>,
  metrica: string,
  zona: string,
  capturado: IsoDate,
): Observacion[] {
  const porDia = new Map<IsoDate, number>();
  for (const t of horas.keys()) {
    const dia = diaEn(t, zona);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  const out: Observacion[] = [];
  for (const dia of [...porDia.keys()].sort()) {
    const esperadas = horasDelDia(dia, zona);
    if (porDia.get(dia) !== esperadas.length) continue;
    const valor = esperadas.reduce((s, t) => s + horas.get(t)!, 0);
    out.push({ dia, metrica, valor, fuente: 'kibana', capturado });
  }
  return out;
}
