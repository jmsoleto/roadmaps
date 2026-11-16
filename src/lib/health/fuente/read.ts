/**
 * Reading the collector's folder (health-colector-kibana, D2): pure functions
 * over the text of its files, so every rule of the contract has a test and the
 * connection only moves strings.
 *
 * ```
 * data/
 * ├─ index.json                                what exists; the only file read first
 * ├─ series/<app>/<métrica>/<YYYY-MM>.jsonl    one line per collector run:
 * │                                            {"run","from","step","v":[counts]}
 * └─ deployments/<app>/<YYYY-MM>.jsonl         one line per state of a deployment run
 *                                              (read by `despliegues.ts`)
 * ```
 *
 * Every instant is UTC. `v[i]` counts the logs of `[from + i·step, from + (i+1)·step)`.
 * The `dashboards` section and `kibana/` are the collector's older series and
 * are never read.
 */

export const FORMATO_FUENTE = 1;
export const INDEX_FILE = 'index.json';
export const SERIES_DIR = 'series';
/** The only bucket this reader accepts: an hour, aligned to the hour in UTC. */
export const STEP = 3600;
const HORA_MS = STEP * 1000;

export interface MetricaFuente {
  id: string;
  nombre: string;
  /** The query the collector actually runs: scope and query together. */
  consulta: string;
  /** End of the last closed bucket, in ms. */
  hasta: number;
  meses: string[];
}

/** `apps.<app>.deployments`: present only when the application has deployments. */
export interface DesplieguesFuente {
  /** The deployments repository, or `null` when the catalogue no longer declares one. */
  repo: string | null;
  /** Distinct runs, as the collector counted them. */
  count: number;
  /** Months with a file, sorted. Not necessarily consecutive. */
  meses: string[];
}

export interface AppFuente {
  id: string;
  nombre: string;
  /** Active metrics only: a removed one is never offered (health-colector, «Aplicaciones y métricas»). */
  metricas: MetricaFuente[];
  /** `null` when the application has no deployments (health-despliegues). */
  despliegues: DesplieguesFuente | null;
}

export type Indice =
  { kind: 'ok'; apps: AppFuente[]; avisos: string[] } | { kind: 'error'; motivo: string };

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** An ISO instant with «Z», in ms, or `null`. */
export function instante(v: unknown): number | null {
  if (typeof v !== 'string' || !ISO_Z.test(v)) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

export const MOTIVO_NO_INDICE =
  'Esta carpeta no tiene index.json. Elige la carpeta de datos del colector, la que contiene index.json (no series/ ni una carpeta por encima).';

/** `index.json`, read. `null` text means the file is not there. */
export function leerIndice(texto: string | null): Indice {
  if (texto === null) return { kind: 'error', motivo: MOTIVO_NO_INDICE };
  let raiz: unknown;
  try {
    raiz = JSON.parse(texto);
  } catch {
    return { kind: 'error', motivo: 'index.json no es un JSON válido.' };
  }
  if (!isObject(raiz)) return { kind: 'error', motivo: 'index.json no es un objeto.' };
  if (raiz.formatVersion !== FORMATO_FUENTE) {
    return {
      kind: 'error',
      motivo: `index.json usa el formato ${JSON.stringify(raiz.formatVersion ?? null)}, y Health Hub solo sabe leer el ${FORMATO_FUENTE}.`,
    };
  }
  if (!isObject(raiz.apps)) {
    return { kind: 'error', motivo: 'index.json no tiene la sección apps.' };
  }

  const avisos: string[] = [];
  const apps: AppFuente[] = [];
  for (const [id, app] of Object.entries(raiz.apps)) {
    if (!ID.test(id) || !isObject(app)) {
      avisos.push(`La aplicación «${id}» de la fuente no se puede leer.`);
      continue;
    }
    let despliegues: DesplieguesFuente | null = null;
    if (app.deployments !== undefined) {
      despliegues = leerDesplieguesIndice(app.deployments);
      if (despliegues === null) avisos.push(`${id}: sus despliegues no se pueden leer`);
    }
    // An application with deployments may come without metrics at all.
    if (!isObject(app.metrics) && !(app.metrics === undefined && despliegues !== null)) {
      avisos.push(`La aplicación «${id}» de la fuente no se puede leer.`);
      continue;
    }
    const metricas: MetricaFuente[] = [];
    for (const [mid, m] of Object.entries(isObject(app.metrics) ? app.metrics : {})) {
      if (isObject(m) && m.removed === true) continue;
      const leida = leerMetrica(mid, m);
      if (typeof leida === 'string') avisos.push(`${id}/${mid}: ${leida}`);
      else metricas.push(leida);
    }
    apps.push({
      id,
      nombre: typeof app.name === 'string' && app.name ? app.name : id,
      metricas,
      despliegues,
    });
  }
  return { kind: 'ok', apps, avisos };
}

function leerDesplieguesIndice(d: unknown): DesplieguesFuente | null {
  if (!isObject(d) || !Array.isArray(d.months)) return null;
  if (!d.months.every((x) => typeof x === 'string' && MES.test(x))) return null;
  return {
    repo: typeof d.repo === 'string' ? d.repo : null,
    count: Number.isInteger(d.count) && (d.count as number) >= 0 ? (d.count as number) : 0,
    meses: [...new Set(d.months as string[])].sort(),
  };
}

function leerMetrica(id: string, m: unknown): MetricaFuente | string {
  if (!ID.test(id) || !isObject(m)) return 'la métrica no se puede leer';
  if (m.step !== STEP) return `usa buckets de ${String(m.step)} s, y solo se leen los de ${STEP} s`;
  const consulta =
    typeof m.effectiveQuery === 'string'
      ? m.effectiveQuery
      : typeof m.query === 'string'
        ? m.query
        : null;
  const hasta = instante(m.to);
  const meses = Array.isArray(m.months) ? m.months : null;
  if (
    typeof m.name !== 'string' ||
    consulta === null ||
    hasta === null ||
    meses === null ||
    !meses.every((x) => typeof x === 'string' && MES.test(x))
  ) {
    return 'la métrica no se puede leer';
  }
  return { id, nombre: m.name, consulta, hasta, meses: [...(meses as string[])].sort() };
}

/** Where a metric's month lives, relative to the chosen folder. */
export const rutaSerie = (app: string, metrica: string, mes: string): string[] => [
  SERIES_DIR,
  app,
  metrica,
  `${mes}.jsonl`,
];

export interface Hueco {
  /** First hour without data, in ms. */
  desde: number;
  /** First hour with data again, in ms. */
  hasta: number;
}

export interface Serie {
  /** Count per hour, keyed by the hour's start in ms. A missing hour is «not measured». */
  horas: Map<number, number>;
  huecos: Hueco[];
  avisos: string[];
}

interface Linea {
  run: number;
  from: number;
  v: number[];
}

function leerLinea(texto: string): Linea | null {
  let l: unknown;
  try {
    l = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!isObject(l)) return null;
  const run = instante(l.run);
  const from = instante(l.from);
  if (run === null || from === null || from % HORA_MS !== 0 || l.step !== STEP) return null;
  if (!Array.isArray(l.v) || !l.v.every((x) => Number.isInteger(x) && x >= 0)) return null;
  return { run, from, v: l.v as number[] };
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : `${n} ${varios}`);

/**
 * One metric's months, read and expanded to hours.
 *
 * `textos` holds each month listed in `index.json`, `null` when its file is
 * missing. Lines are taken in order of `from`. The format promises no overlap;
 * if one appears anyway, the most recent run wins and it is reported, because
 * summing would count the same logs twice.
 */
export function leerSerie(etiqueta: string, textos: ReadonlyMap<string, string | null>): Serie {
  const avisos: string[] = [];
  const lineas: Linea[] = [];
  for (const [mes, texto] of [...textos].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (texto === null) {
      avisos.push(`${etiqueta}: falta el fichero ${mes}.jsonl`);
      continue;
    }
    let rotas = 0;
    for (const cruda of texto.split('\n')) {
      if (cruda.trim() === '') continue;
      const linea = leerLinea(cruda);
      if (linea) lineas.push(linea);
      else rotas++;
    }
    if (rotas > 0) {
      avisos.push(
        `${etiqueta}: se ${rotas === 1 ? 'saltó 1 línea ilegible' : `saltaron ${rotas} líneas ilegibles`} en ${mes}.jsonl`,
      );
    }
  }
  lineas.sort((a, b) => a.from - b.from || a.run - b.run);

  const horas = new Map<number, number>();
  const runDe = new Map<number, number>();
  let repetidas = 0;
  for (const { run, from, v } of lineas) {
    v.forEach((valor, i) => {
      const t = from + i * HORA_MS;
      const previo = runDe.get(t);
      if (previo !== undefined) {
        repetidas++;
        if (previo > run) return;
      }
      horas.set(t, valor);
      runDe.set(t, run);
    });
  }
  if (repetidas > 0) {
    avisos.push(
      `${etiqueta}: ${plural(repetidas, 'una hora aparece', 'horas aparecen')} en más de una ejecución; se usa la más reciente`,
    );
  }

  const huecos: Hueco[] = [];
  const orden = [...horas.keys()].sort((a, b) => a - b);
  for (let i = 1; i < orden.length; i++) {
    if (orden[i] - orden[i - 1] > HORA_MS) {
      huecos.push({ desde: orden[i - 1] + HORA_MS, hasta: orden[i] });
    }
  }
  if (huecos.length > 0) {
    const sinDato = huecos.reduce((n, h) => n + (h.hasta - h.desde) / HORA_MS, 0);
    avisos.push(
      `${etiqueta}: ${plural(huecos.length, 'un hueco', 'huecos')} sin datos (${plural(sinDato, '1 hora', 'horas')})`,
    );
  }
  return { horas: new Map(orden.map((t) => [t, horas.get(t)!])), huecos, avisos };
}
