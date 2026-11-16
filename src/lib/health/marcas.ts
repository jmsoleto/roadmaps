/**
 * What a chart marks as a release (health-despliegues, D3): the releases
 * someone registered by hand, and the deployments the collector read. Both are
 * a `Marca`, so the comparison, the «another release in the window» warning and
 * the latest version work the same for either.
 *
 * ```
 * VersionSubida (folder, a day) ──┐
 *                                 ├─▶ Marca { id, version, dia, … } ─▶ charts, comparison
 * Despliegue (source, an instant) ┘        dia = finishedAt in the catalogue's zone
 * ```
 */

import type { IsoDate } from '../model/types';
import type { Despliegue } from './fuente/despliegues';
import { diaEn } from './fuente/days';
import type { VersionSubida, Vigilada } from './model';

export type Marca =
  | { origen: 'manual'; id: string; version: string; dia: IsoDate; v: VersionSubida }
  | {
      origen: 'despliegue';
      /** `run-<runId>`: never clashes with the id of a manual release. */
      id: string;
      version: string | null;
      dia: IsoDate;
      /** `finishedAt`, in ms. */
      instante: number;
      d: Despliegue;
    };

export const idDespliegue = (runId: number): string => `run-${runId}`;

export const marcaManual = (v: VersionSubida): Marca => ({
  origen: 'manual',
  id: v.id,
  version: v.version,
  dia: v.dia,
  v,
});

export const marcaDespliegue = (d: Despliegue, zona: string): Marca => ({
  origen: 'despliegue',
  id: idDespliegue(d.runId),
  version: d.version,
  dia: diaEn(d.finishedAt, zona),
  instante: d.finishedAt,
  d,
});

/** Every mark of an application: its manual releases and its deployments. */
export function marcasDe(
  app: Pick<Vigilada, 'versiones'>,
  despliegues: readonly Despliegue[],
  zona: string,
): Marca[] {
  return [...app.versiones.map(marcaManual), ...despliegues.map((d) => marcaDespliegue(d, zona))];
}

/** A failed or cancelled deployment changed nothing in production: it is shown, never compared. */
export function abreComparacion(m: Marca): boolean {
  return m.origen === 'manual' || m.d.result === 'success';
}

/** Whether a deployment is hidden by «ocultar fallidos y cancelados». */
export const esFallido = (d: Despliegue): boolean => d.result !== 'success';

/** What a mark is called on screen. A deployment with no version is named by its run. */
export function nombreMarca(m: Marca): string {
  if (m.version !== null) return m.version;
  return m.origen === 'despliegue' ? `run ${m.d.runId}` : '';
}

/**
 * Same release registered by hand and deployed: same version, same day. Used
 * only so the window warning does not count one release twice. A deployment
 * with no version is never the same as anything.
 */
function claveMisma(m: Marca): string | null {
  return m.version === null ? null : `${m.version}\u0000${m.dia}`;
}

/** `otras`, without the ones that are `sel` itself or the same release as another one. */
export function sinDuplicados(sel: Marca, otras: readonly Marca[]): Marca[] {
  const vistas = new Set<string>();
  const propia = claveMisma(sel);
  if (propia !== null) vistas.add(propia);
  const out: Marca[] = [];
  for (const m of otras) {
    const k = claveMisma(m);
    if (k !== null) {
      if (vistas.has(k)) continue;
      vistas.add(k);
    }
    out.push(m);
  }
  return out;
}

export interface UltimaVersion {
  version: string;
  dia: IsoDate;
  origen: 'manual' | 'despliegue';
}

/**
 * The latest version of an application (health-hub, «Panel global»): the
 * latest manual release or the latest successful release deployed. On the same
 * day the deployment wins, since it carries the hour.
 */
export function ultimaVersion(
  versiones: readonly VersionSubida[],
  ultimoRelease: Despliegue | null,
  zona: string,
): UltimaVersion | null {
  let manual: VersionSubida | null = null;
  for (const v of versiones) if (!manual || v.dia > manual.dia) manual = v;
  const desplegada: UltimaVersion | null = ultimoRelease
    ? {
        version: ultimoRelease.version ?? `run ${ultimoRelease.runId}`,
        dia: diaEn(ultimoRelease.finishedAt, zona),
        origen: 'despliegue',
      }
    : null;
  if (!manual) return desplegada;
  if (!desplegada || manual.dia > desplegada.dia) {
    return { version: manual.version, dia: manual.dia, origen: 'manual' };
  }
  return desplegada;
}
