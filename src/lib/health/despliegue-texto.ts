/**
 * How a deployment is named on screen (health-despliegues, D4): a glyph per
 * result and kind, so they can be told apart without colour, and the words for
 * each state. Instants are shown in the user's own zone; days, in the
 * catalogue's, like every other day of Health Hub.
 */

import type { Despliegue, EstadoGdv, Resultado } from './fuente/despliegues';

/** ● success, ✕ failure, ○ cancelled; a rollback is ↶ whatever its result, with it beside. */
export function glifo(d: Despliegue): string {
  const r = d.result === 'success' ? '●' : d.result === 'failure' ? '✕' : '○';
  return d.kind === 'rollback' ? `↶${d.result === 'success' ? '' : r}` : r;
}

export const TEXTO_RESULTADO: Record<Resultado, string> = {
  success: 'con éxito',
  failure: 'fallido',
  cancelled: 'cancelado',
};

export const textoTipo = (d: Despliegue): string =>
  d.kind === 'rollback' ? 'rollback' : 'release';

/** «release 0.0.543 con éxito». */
export const describir = (d: Despliegue): string =>
  `${textoTipo(d)} ${d.version ?? `run ${d.runId}`} ${TEXTO_RESULTADO[d.result]}`;

const LOCAL = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** An instant in the user's own zone: «lun, 3 nov 2026, 2:24». */
export const horaLocal = (t: number): string => LOCAL.format(new Date(t));

/** Why there is no content from Jira. `cambia`: it may still arrive in a later collection. */
export function textoGdv(status: EstadoGdv, cambia: boolean): string {
  switch (status) {
    case 'pending':
      return 'GDV aún sin leer';
    case 'unavailable':
      return 'no se pudo leer Jira; se reintentará';
    case 'not-found':
      return cambia ? 'GDV no encontrada todavía' : 'sin GDV identificable';
    case 'not-applicable':
      return 'sin GDV (no aplica)';
  }
}

/** A day's deployments summed up by glyph: «●2 ✕1». */
export function resumenGlifos(lista: readonly Despliegue[]): string {
  const cuenta = new Map<string, number>();
  for (const d of lista) cuenta.set(glifo(d), (cuenta.get(glifo(d)) ?? 0) + 1);
  return [...cuenta].map(([g, n]) => (n === 1 ? g : `${g}${n}`)).join(' ');
}
