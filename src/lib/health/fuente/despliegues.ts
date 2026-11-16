/**
 * Production deployments from the collector's folder (health-despliegues, D2):
 * pure functions over the text of `deployments/<app>/<YYYY-MM>.jsonl`.
 *
 * A deployment is a run, keyed by `runId`, never by its version. A run has one
 * line per state it went through (a retry, the GDV read later): the last one
 * is the current state. Every line of a run lives in the same month, the UTC
 * month of `requestedAt`, which is why the place of a deployment in time
 * (`finishedAt`) says nothing about which file holds it.
 *
 * Every text here comes from GitHub or Jira and is kept as is. It is never
 * escaped here and never interpreted anywhere: the view prints it as text.
 */

import { instante } from './read';

export const DEPLOYMENTS_DIR = 'deployments';

/** Where a month of an application's deployments lives, relative to the chosen folder. */
export const rutaDespliegues = (app: string, mes: string): string[] => [
  DEPLOYMENTS_DIR,
  app,
  `${mes}.jsonl`,
];

export type Tipo = 'release' | 'rollback';
export type Resultado = 'success' | 'failure' | 'cancelled';
export type EstadoGdv = 'pending' | 'not-found' | 'unavailable' | 'not-applicable';

export type Gdv =
  | {
      status: 'found';
      key: string | null;
      url: string | null;
      summary: string | null;
      releaseNotes: string | null;
      releaseNotesTruncated: boolean;
      /** What Jira declares, in ms. Another clock than `finishedAt`. */
      deployedAt: number | null;
      release: { key: string | null; summary: string | null } | null;
    }
  | { status: EstadoGdv };

export interface Componente {
  name: string;
  version: string | null;
}

export interface Despliegue {
  runId: number;
  attempt: number | null;
  kind: Tipo;
  result: Resultado;
  version: string | null;
  crq: string | null;
  /** Instants in ms. Only `finishedAt` places a deployment in time. */
  requestedAt: number | null;
  startedAt: number | null;
  finishedAt: number;
  plannedFrom: number | null;
  plannedTo: number | null;
  actor: string | null;
  runUrl: string | null;
  originBranch: string | null;
  components: Componente[];
  rollbackOf: number | null;
  gdv: Gdv;
  collectedAt: number | null;
}

export interface Despliegues {
  /** The current state of each run, newest `finishedAt` first. */
  despliegues: Despliegue[];
  avisos: string[];
}

const TIPOS: readonly string[] = ['release', 'rollback'];
const RESULTADOS: readonly string[] = ['success', 'failure', 'cancelled'];
const ESTADOS_GDV: readonly string[] = ['pending', 'not-found', 'unavailable', 'not-applicable'];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const entero = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;

function leerGdv(g: unknown): Gdv {
  if (!isObject(g)) return { status: 'unavailable' };
  if (g.status === 'found') {
    const r = g.release;
    return {
      status: 'found',
      key: texto(g.key),
      url: texto(g.url),
      summary: texto(g.summary),
      releaseNotes: texto(g.releaseNotes),
      releaseNotesTruncated: g.releaseNotesTruncated === true,
      deployedAt: instante(g.deployedAt),
      release: isObject(r) ? { key: texto(r.key), summary: texto(r.summary) } : null,
    };
  }
  // A state this reader does not know carries no content either: treat it as
  // «could not read Jira», which may still change. Never an error.
  return {
    status: ESTADOS_GDV.includes(g.status as string) ? (g.status as EstadoGdv) : 'unavailable',
  };
}

/**
 * One line, or `null` when it cannot place a deployment: not JSON, no positive
 * integer `runId`, no valid `finishedAt`, or a `kind` or `result` this reader
 * does not know. Any other field of the wrong type is only unknown (`null`):
 * the deployment is still shown.
 */
export function leerLineaDespliegue(cruda: string): Despliegue | null {
  let l: unknown;
  try {
    l = JSON.parse(cruda);
  } catch {
    return null;
  }
  if (!isObject(l)) return null;
  const runId = entero(l.runId);
  const finishedAt = instante(l.finishedAt);
  if (runId === null || finishedAt === null) return null;
  if (!TIPOS.includes(l.kind as string) || !RESULTADOS.includes(l.result as string)) return null;
  const components = Array.isArray(l.components)
    ? l.components.flatMap((c) =>
        isObject(c) && typeof c.name === 'string'
          ? [{ name: c.name, version: texto(c.version) }]
          : [],
      )
    : [];
  return {
    runId,
    attempt: entero(l.attempt),
    kind: l.kind as Tipo,
    result: l.result as Resultado,
    version: texto(l.version),
    crq: texto(l.crq),
    requestedAt: instante(l.requestedAt),
    startedAt: instante(l.startedAt),
    finishedAt,
    plannedFrom: instante(l.plannedFrom),
    plannedTo: instante(l.plannedTo),
    actor: texto(l.actor),
    runUrl: texto(l.runUrl),
    originBranch: texto(l.originBranch),
    components,
    rollbackOf: l.kind === 'rollback' ? entero(l.rollbackOf) : null,
    gdv: leerGdv(l.gdv),
    collectedAt: instante(l.collectedAt),
  };
}

/**
 * An application's months, read. `textos` holds each month listed in
 * `index.json`, `null` when its file is missing. The last line of a run wins:
 * the greatest `collectedAt`, and on a tie the later line.
 */
export function leerDespliegues(
  etiqueta: string,
  textos: ReadonlyMap<string, string | null>,
): Despliegues {
  const avisos: string[] = [];
  const porRun = new Map<number, Despliegue>();
  for (const [mes, contenido] of [...textos].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (contenido === null) {
      avisos.push(`${etiqueta}: falta el fichero de despliegues ${mes}.jsonl`);
      continue;
    }
    const rotas: number[] = [];
    contenido.split('\n').forEach((cruda, i) => {
      if (cruda.trim() === '') return;
      const d = leerLineaDespliegue(cruda);
      if (!d) {
        rotas.push(i + 1);
        return;
      }
      const previo = porRun.get(d.runId);
      if (!previo || (d.collectedAt ?? -Infinity) >= (previo.collectedAt ?? -Infinity)) {
        porRun.set(d.runId, d);
      }
    });
    if (rotas.length > 0) {
      avisos.push(
        `${etiqueta}: se ${rotas.length === 1 ? 'saltó 1 línea ilegible' : `saltaron ${rotas.length} líneas ilegibles`} en los despliegues de ${mes}.jsonl (${rotas.length === 1 ? 'línea' : 'líneas'} ${rotas.join(', ')})`,
      );
    }
  }
  const despliegues = [...porRun.values()].sort(
    (a, b) => b.finishedAt - a.finishedAt || b.runId - a.runId,
  );
  return { despliegues, avisos };
}

/** The last release that reached production: a successful `release`, by `finishedAt`. */
export function ultimoRelease(despliegues: readonly Despliegue[]): Despliegue | null {
  let ultimo: Despliegue | null = null;
  for (const d of despliegues) {
    if (d.kind === 'release' && d.result === 'success') {
      if (!ultimo || d.finishedAt > ultimo.finishedAt) ultimo = d;
    }
  }
  return ultimo;
}

/** A successful rollback after `release`, the latest one, if there is any. */
export function rollbackPosterior(
  despliegues: readonly Despliegue[],
  release: Despliegue,
): Despliegue | null {
  let ultimo: Despliegue | null = null;
  for (const d of despliegues) {
    if (d.kind === 'rollback' && d.result === 'success' && d.finishedAt > release.finishedAt) {
      if (!ultimo || d.finishedAt > ultimo.finishedAt) ultimo = d;
    }
  }
  return ultimo;
}

/** How long a `not-found` GDV keeps being retried after its run finished. */
export const REINTENTO_NOT_FOUND_MS = 7 * 24 * 3_600_000;

/** Whether the GDV of `d` may still change in a later collection. */
export function gdvPuedeCambiar(d: Despliegue, ahora: number): boolean {
  const s = d.gdv.status;
  if (s === 'pending' || s === 'unavailable') return true;
  return s === 'not-found' && ahora - d.finishedAt < REINTENTO_NOT_FOUND_MS;
}

/** Only `https:` links are offered; anything else is shown without a link. */
export function enlaceSeguro(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
