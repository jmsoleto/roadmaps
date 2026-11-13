/**
 * Health Hub as files in a folder (health-hub, D2 and D3).
 *
 * ```
 * health/
 * ├─ tech-lead-hub.json        the marker: { "app": "health", "format": 1 }
 * ├─ catalogo.json             { zona, metricas }
 * ├─ order.json                { "aplicaciones": ["pedidos", …] }
 * ├─ app-pedidos.json          { id, nombre, consultas, versiones }
 * ├─ obs-pedidos-2026-11.json  one month's observations, one per line
 * └─ entrada-*.json            the inbox: not this document's (see `inbox.ts`)
 * ```
 *
 * The inbox is deliberately not claimed here. `FileSync` reads all or nothing,
 * which is right for the data and wrong for a file an agent may have botched:
 * a bad entry must leave the panels standing.
 */

import {
  attempt,
  canonicalizer,
  inOrder,
  isObject,
  json,
  layout,
  units,
  Unreadable,
} from '../folder/canonical';
import type { FileFormat, FileMap } from '../folder/file-sync';
import { MARKER_FILE, markerText } from '../folder/marker';
import { isIsoDate } from '../time/timeline';
import {
  datosIniciales,
  ID_VIGILADA,
  isClase,
  isFuente,
  type Catalogo,
  type HealthData,
  type Observacion,
  type VersionSubida,
  type Vigilada,
} from './model';

export const APP_ID = 'health';
export const FORMAT = 1;
export const CATALOG_FILE = 'catalogo.json';
export const ORDER_FILE = 'order.json';

type Kind = 'catalogo' | 'metrica' | 'vigilada' | 'version' | 'fila';

const { canon, text } = canonicalizer<Kind>({
  order: {
    catalogo: ['zona', 'metricas'],
    metrica: ['id', 'nombre', 'clase'],
    vigilada: ['id', 'nombre', 'consultas', 'versiones'],
    version: ['id', 'version', 'dia', 'nota'],
    fila: ['dia', 'metrica', 'valor', 'fuente', 'capturado', 'estimado'],
  },
  holds: {
    catalogo: { metricas: 'metrica' },
    vigilada: { versiones: 'version' },
  },
});

const ES_APP = /^app-([a-z0-9-]+)\.json$/;
const ES_OBS = /^obs-([a-z0-9-]+)-(\d{4}-\d{2})\.json$/;

export const isAppFile = (name: string): boolean => ES_APP.test(name);
export const isObsFile = (name: string): boolean => ES_OBS.test(name);

export const fileForApp = (id: string): string => `app-${id}.json`;
export const fileForObs = (id: string, mes: string): string => `obs-${id}-${mes}.json`;

const porDiaYMetrica = (a: Observacion, b: Observacion): number =>
  a.dia === b.dia
    ? a.metrica < b.metrica
      ? -1
      : a.metrica > b.metrica
        ? 1
        : 0
    : a.dia < b.dia
      ? -1
      : 1;

/**
 * One observation per line (D3).
 *
 * Not the two-space layout of every other file: at seven lines a day, a capture
 * would be a wall of diff in which the one day that changed cannot be found.
 */
function obsText(app: string, mes: string, filas: Observacion[]): string {
  const lineas = [...filas]
    .sort(porDiaYMetrica)
    .map((f) => `    ${JSON.stringify(canon(f, 'fila'))}`);
  return [
    '{',
    `  "app": ${JSON.stringify(app)},`,
    `  "mes": ${JSON.stringify(mes)},`,
    '  "filas": [',
    lineas.join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');
}

function serializarVigilada(app: Vigilada): string {
  const versiones = [...app.versiones].sort((a, b) =>
    a.dia === b.dia ? (a.id < b.id ? -1 : 1) : a.dia < b.dia ? -1 : 1,
  );
  return text({ ...app, versiones }, 'vigilada');
}

function esCatalogo(v: unknown): v is Catalogo {
  if (!isObject(v) || typeof v.zona !== 'string' || !Array.isArray(v.metricas)) return false;
  const vistos = new Set<unknown>();
  return v.metricas.every((m) => {
    if (!isObject(m) || typeof m.id !== 'string' || typeof m.nombre !== 'string') return false;
    if (!isClase(m.clase) || vistos.has(m.id)) return false;
    vistos.add(m.id);
    return true;
  });
}

function esVersion(v: unknown): v is VersionSubida {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.version === 'string' &&
    isIsoDate(v.dia) &&
    (v.nota === undefined || typeof v.nota === 'string')
  );
}

function esFila(v: unknown): v is Observacion {
  return (
    isObject(v) &&
    isIsoDate(v.dia) &&
    typeof v.metrica === 'string' &&
    Number.isInteger(v.valor) &&
    (v.valor as number) >= 0 &&
    isFuente(v.fuente) &&
    isIsoDate(v.capturado) &&
    (v.estimado === undefined || v.estimado === true)
  );
}

/** A month's file: everything in it must agree with its name, or a save could lose it. */
function leerObs(files: FileMap, name: string, conocidas: Set<string>): [string, Observacion[]] {
  const [, app, mes] = ES_OBS.exec(name)!;
  const v = json(files, name);
  if (!isObject(v) || v.app !== app || v.mes !== mes || !Array.isArray(v.filas)) {
    throw new Unreadable(name);
  }
  // Observations of a vigilada with no file: the next save would delete them.
  if (!conocidas.has(app)) throw new Unreadable(name);
  const vistas = new Set<string>();
  for (const f of v.filas) {
    if (!esFila(f) || !f.dia.startsWith(`${mes}-`)) throw new Unreadable(name);
    const clave = `${f.metrica}|${f.dia}`;
    if (vistas.has(clave)) throw new Unreadable(name);
    vistas.add(clave);
  }
  return [app, v.filas as Observacion[]];
}

export const HEALTH_FORMAT: FileFormat<HealthData> = {
  owns: (name) =>
    name === MARKER_FILE ||
    name === CATALOG_FILE ||
    name === ORDER_FILE ||
    isAppFile(name) ||
    isObsFile(name),

  serialize(data: HealthData): FileMap {
    const files: FileMap = new Map();
    files.set(MARKER_FILE, markerText(APP_ID, FORMAT));
    files.set(CATALOG_FILE, text(data.catalogo, 'catalogo'));
    files.set(ORDER_FILE, layout({ aplicaciones: data.aplicaciones.map((a) => a.id) }));
    for (const app of data.aplicaciones) {
      files.set(fileForApp(app.id), serializarVigilada(app));
      const porMes = new Map<string, Observacion[]>();
      for (const fila of data.observaciones[app.id] ?? []) {
        const mes = fila.dia.slice(0, 7);
        const lista = porMes.get(mes);
        if (lista) lista.push(fila);
        else porMes.set(mes, [fila]);
      }
      for (const [mes, filas] of porMes)
        files.set(fileForObs(app.id, mes), obsText(app.id, mes, filas));
    }
    return files;
  },

  parse: (files) =>
    attempt(() => {
      const catalogoLeido = json(files, CATALOG_FILE);
      if (catalogoLeido !== undefined && !esCatalogo(catalogoLeido)) {
        throw new Unreadable(CATALOG_FILE);
      }
      const order = json(files, ORDER_FILE);
      if (order !== undefined && (!isObject(order) || !Array.isArray(order.aplicaciones))) {
        throw new Unreadable(ORDER_FILE);
      }

      const byId = units<Vigilada>(files, isAppFile, (v) => {
        return (
          typeof v.nombre === 'string' &&
          typeof v.id === 'string' &&
          ID_VIGILADA.test(v.id) &&
          isObject(v.consultas) &&
          Array.isArray(v.versiones) &&
          v.versiones.every(esVersion)
        );
      });
      for (const [id] of byId) {
        if (!files.has(fileForApp(id))) throw new Unreadable(fileForApp(id));
      }

      const observaciones: Record<string, Observacion[]> = {};
      const conocidas = new Set(byId.keys());
      for (const name of [...files.keys()].filter(isObsFile).sort()) {
        const [app, filas] = leerObs(files, name, conocidas);
        (observaciones[app] ??= []).push(...filas);
      }

      return {
        // A folder whose first write was cut short: the same catalogue it would have got.
        catalogo: catalogoLeido === undefined ? datosIniciales().catalogo : catalogoLeido,
        aplicaciones: inOrder(order ? (order.aplicaciones as unknown[]) : [], byId),
        observaciones,
      };
    }),

  // Never «empty»: a folder with no vigiladas still has its catalogue, and `empty`
  // carries no data. It is a team's folder, and it loads as what it is.
  isEmpty: () => false,

  // Removing a vigilada takes its files with it, after the screen has asked.
  deletable: (name) => isAppFile(name) || isObsFile(name),
};
