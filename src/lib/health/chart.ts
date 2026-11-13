/**
 * The geometry of the evolution chart (health-hub, D9). Pure: series in, numbers
 * and path strings out, so a gap that has to cut a line can be tested without
 * drawing one.
 *
 * Each day is a point or nothing. A missing day never becomes a zero: the line
 * stops there and starts again after it.
 */

import type { IsoDate } from '../model/types';
import { addDays, dayIndex, MONTHS_ES, parseIso } from '../time/timeline';
import type { Observacion } from './model';
import { VENTANA } from './trends';

export type Periodo = '30' | '90' | '365' | 'todo';

export const PERIODOS: readonly { id: Periodo; label: string }[] = [
  { id: '30', label: '30 días' },
  { id: '90', label: '90 días' },
  { id: '365', label: '1 año' },
  { id: 'todo', label: 'todo' },
];

export interface Punto {
  dia: IsoDate;
  valor: number | null;
  estimado: boolean;
  /** The mean of the 7 days ending here, or `null` unless all 7 were measured. */
  media: number | null;
}

/** The days a period covers, ending at `hasta`. `null` with nothing to show. */
export function rango(
  periodo: Periodo,
  primero: IsoDate | null,
  hasta: IsoDate | null,
): { desde: IsoDate; hasta: IsoDate } | null {
  if (primero === null || hasta === null) return null;
  if (periodo === 'todo') return { desde: primero, hasta };
  return { desde: addDays(hasta, -(Number(periodo) - 1)), hasta };
}

export function puntos(
  filas: readonly Observacion[],
  metrica: string,
  desde: IsoDate,
  hasta: IsoDate,
): Punto[] {
  const dias = new Map<IsoDate, Observacion>();
  for (const f of filas) if (f.metrica === metrica) dias.set(f.dia, f);

  const n = dayIndex(desde, hasta) + 1;
  const out: Punto[] = [];
  for (let i = 0; i < n; i++) {
    const dia = addDays(desde, i);
    const o = dias.get(dia);
    let suma = 0;
    let completa = true;
    for (let k = 0; k < VENTANA && completa; k++) {
      const previa = dias.get(addDays(dia, -k));
      if (previa) suma += previa.valor;
      else completa = false;
    }
    out.push({
      dia,
      valor: o ? o.valor : null,
      estimado: o?.estimado === true,
      media: completa ? suma / VENTANA : null,
    });
  }
  return out;
}

/** A top for the axis at 1, 2 or 5 × 10ⁿ, and its three divisions. */
export function escalaY(maximo: number): { tope: number; ticks: number[] } {
  if (maximo <= 0) return { tope: 1, ticks: [0, 1] };
  const paso10 = 10 ** Math.floor(Math.log10(maximo / 3));
  const paso = [1, 2, 5, 10].map((m) => m * paso10).find((p) => p * 3 >= maximo) ?? paso10 * 10;
  const entero = Math.max(paso, 1);
  const n = Math.ceil(maximo / entero);
  return { tope: n * entero, ticks: Array.from({ length: n + 1 }, (_, i) => i * entero) };
}

export interface Tramo {
  /** Index of the first and last point. */
  desde: number;
  hasta: number;
  estimado: boolean;
}

/**
 * The stretches of the daily line: broken wherever a day is missing, and by
 * kind, since a segment touching an estimate is drawn as one.
 */
export function tramos(pts: readonly Punto[]): Tramo[] {
  const out: Tramo[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    if (pts[i].valor === null || pts[i + 1].valor === null) continue;
    const estimado = pts[i].estimado || pts[i + 1].estimado;
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.hasta === i && ultimo.estimado === estimado) ultimo.hasta = i + 1;
    else out.push({ desde: i, hasta: i + 1, estimado });
  }
  return out;
}

/** Points with no line through them: a measured day between two missing ones. */
export function aislados(pts: readonly Punto[]): number[] {
  const out: number[] = [];
  pts.forEach((p, i) => {
    if (p.valor !== null && pts[i - 1]?.valor == null && pts[i + 1]?.valor == null) out.push(i);
  });
  return out;
}

/** The stretches where the moving mean exists. */
export function tramosMedia(pts: readonly Punto[]): { desde: number; hasta: number }[] {
  const out: { desde: number; hasta: number }[] = [];
  pts.forEach((p, i) => {
    if (p.media === null) return;
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.hasta === i - 1) ultimo.hasta = i;
    else out.push({ desde: i, hasta: i });
  });
  return out.filter((t) => t.hasta > t.desde);
}

export function pathDe(
  desde: number,
  hasta: number,
  x: (i: number) => number,
  y: (i: number) => number,
): string {
  const partes: string[] = [];
  for (let i = desde; i <= hasta; i++) {
    partes.push(`${i === desde ? 'M' : 'L'}${x(i).toFixed(1)} ${y(i).toFixed(1)}`);
  }
  return partes.join(' ');
}

export interface TickMes {
  indice: number;
  etiqueta: string;
}

/** The first of each month in range, thinned so that labels fit. */
export function ticksMes(pts: readonly Punto[], maximo = 8): TickMes[] {
  const todos: TickMes[] = [];
  pts.forEach((p, i) => {
    if (!p.dia.endsWith('-01')) return;
    const fecha = new Date(parseIso(p.dia));
    const mes = MONTHS_ES[fecha.getUTCMonth()];
    const etiqueta = fecha.getUTCMonth() === 0 ? `${mes} ${fecha.getUTCFullYear()}` : mes;
    todos.push({ indice: i, etiqueta });
  });
  const salto = Math.ceil(todos.length / maximo) || 1;
  return todos.filter((_, i) => i % salto === 0);
}

const NUMERO = new Intl.NumberFormat('es-ES');

export const formatoNumero = (n: number): string => NUMERO.format(Math.round(n));

/** Short form for an axis: 1,2 M, 45 k. */
export function formatoEje(n: number): string {
  if (n >= 1_000_000) return `${NUMERO.format(+(n / 1_000_000).toFixed(1))} M`;
  if (n >= 1_000) return `${NUMERO.format(+(n / 1_000).toFixed(1))} k`;
  return NUMERO.format(n);
}

export function formatoVariacion(v: number | null): string {
  if (v === null) return 'nuevo';
  const pct = Math.round(v * 100);
  if (pct === 0) return '= 0 %';
  return `${pct > 0 ? '▲ +' : '▼ −'}${Math.abs(pct)} %`;
}
