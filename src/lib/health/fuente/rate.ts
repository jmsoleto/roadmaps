/**
 * Rates and freshness from the collector's figures (health-colector-kibana, D6–D7).
 */

import type { AppFuente } from './read';

/**
 * Errors over requests of the same range. `null` when the requests add up to
 * 0: there is no rate then, and it must never be drawn as 0 %.
 */
export function tasa(errores: number, peticiones: number): number | null {
  return peticiones > 0 ? errores / peticiones : null;
}

/**
 * The rate of every hour, keyed like the series. An hour missing from either
 * side has no rate, like an hour with no requests.
 */
export function tasaPorHora(
  errores: ReadonlyMap<number, number>,
  peticiones: ReadonlyMap<number, number>,
): Map<number, number | null> {
  const out = new Map<number, number | null>();
  for (const [t, e] of errores) {
    const p = peticiones.get(t);
    out.set(t, p === undefined ? null : tasa(e, p));
  }
  return out;
}

/**
 * How far an application's data goes, in ms: the oldest `to` of its active
 * metrics, the one point every metric has reached. `null` without metrics.
 */
export function datosHasta(app: AppFuente): number | null {
  if (app.metricas.length === 0) return null;
  return Math.min(...app.metricas.map((m) => m.hasta));
}
