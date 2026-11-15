/**
 * The catalogue the panels use when the collector's folder is connected
 * (health-colector-kibana, D8): the collector decides.
 *
 * Which metrics exist, their ids and their names come from `index.json`. The
 * one thing the collector does not say is a metric's class (own error, client
 * error, or requests), and Health Hub needs it to read a trend. It comes from
 * `catalogo.json` when the metric is listed there, which is how a new metric of
 * the collector gets a class without a change of code; otherwise from the
 * collector's known ids below. A metric with a class from neither is not shown,
 * and is reported: inventing one would decide how its rises are judged.
 *
 * The folder's own metrics stay only where the folder has data for them, so an
 * older catalogue (`500`, `400`, `403`) neither needs editing nor leaves empty
 * columns behind.
 */

import type { Catalogo, ClaseMetrica, Metrica } from '../model';
import type { LecturaFuente } from './connection.svelte';

/** The collector's metric ids, in the order the panels show them, with their class. */
export const CLASE_COLECTOR: Readonly<Record<string, ClaseMetrica>> = {
  'no-controlados': 'propia',
  'errores-50x': 'propia',
  'errores-404': 'cliente',
  'errores-40x': 'cliente',
  peticiones: 'peticiones',
};

const ORDEN_CLASE: readonly ClaseMetrica[] = ['propia', 'cliente', 'peticiones'];
const ORDEN_CONOCIDO = Object.keys(CLASE_COLECTOR);

export interface CatalogoEfectivo {
  catalogo: Catalogo;
  /** Metrics of the source with no class anywhere: not shown. */
  sinClase: string[];
}

/**
 * The catalogue for the panels. Without a source it is the folder's, as it is.
 * `conDatos` holds the metric ids the folder has observations for.
 */
export function catalogoEfectivo(
  propio: Catalogo,
  lectura: LecturaFuente | null,
  conDatos: ReadonlySet<string>,
): CatalogoEfectivo {
  if (!lectura) return { catalogo: propio, sinClase: [] };
  const propias = new Map(propio.metricas.map((m) => [m.id, m]));

  // Each metric once, named as the first application of the source names it.
  const deFuente = new Map<string, string>();
  for (const { app } of lectura.apps) {
    for (const m of app.metricas) if (!deFuente.has(m.id)) deFuente.set(m.id, m.nombre);
  }

  const metricas: Metrica[] = [];
  const sinClase: string[] = [];
  for (const [id, nombre] of deFuente) {
    const clase = propias.get(id)?.clase ?? CLASE_COLECTOR[id];
    if (clase) metricas.push({ id, nombre, clase });
    else sinClase.push(id);
  }
  for (const m of propio.metricas) {
    if (!deFuente.has(m.id) && conDatos.has(m.id)) metricas.push(m);
  }

  const rango = (id: string) => {
    const i = ORDEN_CONOCIDO.indexOf(id);
    return i === -1 ? ORDEN_CONOCIDO.length : i;
  };
  const orden = new Map(metricas.map((m, i) => [m.id, i]));
  metricas.sort(
    (a, b) =>
      ORDEN_CLASE.indexOf(a.clase) - ORDEN_CLASE.indexOf(b.clase) ||
      rango(a.id) - rango(b.id) ||
      orden.get(a.id)! - orden.get(b.id)!,
  );
  return { catalogo: { zona: propio.zona, metricas }, sinClase };
}
