/**
 * What the numbers say: trend, health, before/after a release, and how long
 * until data starts being lost (health-hub, D6). Pure, and it never reads the
 * clock: `hoy` is an argument, so a test can stand on any day.
 *
 * Whole weeks are compared because a week is the period errors repeat over: any
 * shorter window would read a weekend as a change. And a window missing a day
 * gives no percentage at all rather than one computed on less, since «not
 * measured» is not zero.
 */

import type { IsoDate } from '../model/types';
import { addDays, dayIndex } from '../time/timeline';
import type { Tone } from '../hub/types';
import type { Catalogo, ClaseMetrica, Metrica, Observacion } from './model';
import { abreComparacion, sinDuplicados, type Marca } from './marcas';

/** Minimum variation for a metric of the application's own errors to count. */
export const UMBRAL_PROPIA = 0.2;
/** Client errors move more without meaning much: only an abrupt change counts. */
export const UMBRAL_CLIENTE = 0.5;
/** Minimum change in the weekly count, so that going from 4 to 8 is not an alarm. */
export const MINIMO_ABSOLUTO = 20;
/** Days compared on each side. */
export const VENTANA = 7;
/** Days after the last one with data until the first is lost. */
export const DIAS_RETENCION = 7;
/** Days left at which the capture warning appears. */
export const DIAS_AVISO = 2;

export type EstadoTendencia = 'sube' | 'baja' | 'estable' | 'sin-datos';

export interface Tendencia {
  estado: EstadoTendencia;
  /** The count of the most recent window, or `null` if it is incomplete. */
  recuento: number | null;
  /** The variation compared on, or `null` with no data or nothing to divide by. */
  variacion: number | null;
  /** What was compared: errors per request, or the plain count. */
  base: 'tasa' | 'recuento';
  /** Whether any value in the windows is an estimate. */
  estimado: boolean;
}

export type EstadoSalud =
  'empeora' | 'sin-captura' | 'vigilar' | 'sin-datos' | 'estable' | 'mejora';

export const ETIQUETA_SALUD: Record<EstadoSalud, string> = {
  empeora: 'Empeora',
  'sin-captura': 'Sin captura',
  vigilar: 'Vigilar',
  'sin-datos': 'Sin datos',
  estable: 'Estable',
  mejora: 'Mejora',
};

export const TONO_SALUD: Record<EstadoSalud, Tone> = {
  empeora: 'danger',
  'sin-captura': 'danger',
  vigilar: 'warn',
  'sin-datos': 'neutral',
  estable: 'neutral',
  mejora: 'neutral',
};

/** Worst first: the order of the global panel. */
export const ORDEN_SALUD: readonly EstadoSalud[] = [
  'empeora',
  'sin-captura',
  'vigilar',
  'sin-datos',
  'estable',
  'mejora',
];

export interface Captura {
  /** Days left before data starts being lost; negative once it has. */
  restantes: number;
  /** Days already lost. */
  perdidos: number;
  tono: Tone;
  /** Whether it has anything to warn about. */
  aviso: boolean;
}

export interface Salud {
  estado: EstadoSalud;
  /** The names of the metrics that explain the state. */
  motivo: string[];
  tendencias: Record<string, Tendencia>;
  captura: Captura | null;
  ultimoDia: IsoDate | null;
}

/** Values by day, for one metric. */
type PorDia = Map<IsoDate, Observacion>;

export function indexar(filas: readonly Observacion[]): Map<string, PorDia> {
  const out = new Map<string, PorDia>();
  for (const fila of filas) {
    let dias = out.get(fila.metrica);
    if (!dias) out.set(fila.metrica, (dias = new Map()));
    dias.set(fila.dia, fila);
  }
  return out;
}

export function ultimoDiaDe(filas: readonly Observacion[]): IsoDate | null {
  let ultimo: IsoDate | null = null;
  for (const fila of filas) if (ultimo === null || fila.dia > ultimo) ultimo = fila.dia;
  return ultimo;
}

interface Ventana {
  suma: number;
  completa: boolean;
  faltan: number;
  estimado: boolean;
}

function ventana(dias: PorDia | undefined, desde: IsoDate, longitud: number): Ventana {
  let suma = 0;
  let faltan = 0;
  let estimado = false;
  for (let i = 0; i < longitud; i++) {
    const o = dias?.get(addDays(desde, i));
    if (!o) {
      faltan++;
      continue;
    }
    suma += o.valor;
    if (o.estimado) estimado = true;
  }
  return { suma, completa: faltan === 0, faltan, estimado };
}

const umbralDe = (clase: ClaseMetrica): number =>
  clase === 'cliente' ? UMBRAL_CLIENTE : UMBRAL_PROPIA;

/** The variation from `antes` to `despues`, per thousand requests when both sides have them. */
function variacionEntre(
  antes: Ventana,
  despues: Ventana,
  pAntes: Ventana | null,
  pDespues: Ventana | null,
): { variacion: number | null; base: 'tasa' | 'recuento' } {
  const conTasa =
    pAntes !== null &&
    pDespues !== null &&
    pAntes.completa &&
    pDespues.completa &&
    pAntes.suma > 0 &&
    pDespues.suma > 0;
  const a = conTasa ? antes.suma / pAntes.suma : antes.suma;
  const d = conTasa ? despues.suma / pDespues.suma : despues.suma;
  return { variacion: a === 0 ? null : (d - a) / a, base: conTasa ? 'tasa' : 'recuento' };
}

const SIN_DATOS: Tendencia = {
  estado: 'sin-datos',
  recuento: null,
  variacion: null,
  base: 'recuento',
  estimado: false,
};

/** The last 7 days ending at `fin`, against the 7 before them. */
export function tendencia(
  indice: Map<string, PorDia>,
  metrica: Metrica,
  fin: IsoDate | null,
  idPeticiones: string | null,
): Tendencia {
  if (fin === null) return SIN_DATOS;
  const desde = addDays(fin, -(VENTANA - 1));
  const desdeAnterior = addDays(desde, -VENTANA);
  const dias = indice.get(metrica.id);
  const reciente = ventana(dias, desde, VENTANA);
  const anterior = ventana(dias, desdeAnterior, VENTANA);
  if (!reciente.completa || !anterior.completa) return SIN_DATOS;

  const peticiones =
    idPeticiones !== null && metrica.id !== idPeticiones ? indice.get(idPeticiones) : undefined;
  const { variacion, base } = variacionEntre(
    anterior,
    reciente,
    peticiones ? ventana(peticiones, desdeAnterior, VENTANA) : null,
    peticiones ? ventana(peticiones, desde, VENTANA) : null,
  );

  const cambio = reciente.suma - anterior.suma;
  const estimado = reciente.estimado || anterior.estimado;
  const resultado = (estado: EstadoTendencia): Tendencia => ({
    estado,
    recuento: reciente.suma,
    variacion,
    base,
    estimado,
  });

  if (Math.abs(cambio) < MINIMO_ABSOLUTO) return resultado('estable');
  // From zero there is nothing to divide by: reaching the minimum is a rise, with no percentage.
  if (variacion === null) return resultado('sube');
  const umbral = umbralDe(metrica.clase);
  if (variacion >= umbral) return resultado('sube');
  if (variacion <= -umbral) return resultado('baja');
  return resultado('estable');
}

/** How long until data starts being lost, or `null` if nobody has started capturing. */
export function captura(ultimo: IsoDate | null, hoy: IsoDate): Captura | null {
  if (ultimo === null) return null;
  const restantes = dayIndex(hoy, ultimo) + DIAS_RETENCION;
  return {
    restantes,
    perdidos: restantes < 0 ? -restantes : 0,
    tono: restantes <= 0 ? 'danger' : restantes <= DIAS_AVISO ? 'warn' : 'neutral',
    aviso: restantes <= DIAS_AVISO,
  };
}

export function textoCaptura(c: Captura): string {
  if (c.perdidos > 0) {
    return c.perdidos === 1 ? 'se ha perdido 1 día' : `se han perdido ${c.perdidos} días`;
  }
  if (c.restantes === 0) return 'hoy es el último día para capturar sin perder datos';
  return c.restantes === 1 ? 'queda 1 día' : `quedan ${c.restantes} días`;
}

export function idPeticionesDe(catalogo: Catalogo): string | null {
  return catalogo.metricas.find((m) => m.clase === 'peticiones')?.id ?? null;
}

/**
 * The state of a vigilada: the first rule that holds.
 *
 * Client errors can reach «vigilar» and never «empeora»: a scanner hitting an
 * endpoint raises the 403s without the application having got any worse.
 */
export function salud(
  filas: readonly Observacion[],
  catalogo: Catalogo,
  hoy: IsoDate,
  ultimoPendiente: IsoDate | null = null,
): Salud {
  const indice = indexar(filas);
  const ultimoDia = ultimoDiaDe(filas);
  const idPeticiones = idPeticionesDe(catalogo);

  const tendencias: Record<string, Tendencia> = {};
  for (const m of catalogo.metricas) {
    tendencias[m.id] = tendencia(indice, m, ultimoDia, idPeticiones);
  }

  // What is waiting in the inbox has not been lost, so it counts for the capture.
  const conPendiente =
    ultimoPendiente !== null && (ultimoDia === null || ultimoPendiente > ultimoDia)
      ? ultimoPendiente
      : ultimoDia;
  const cap = captura(conPendiente, hoy);

  const propias = catalogo.metricas.filter((m) => m.clase === 'propia');
  const clientes = catalogo.metricas.filter((m) => m.clase === 'cliente');
  const conEstado = (lista: Metrica[], estado: EstadoTendencia) =>
    lista.filter((m) => tendencias[m.id].estado === estado).map((m) => m.nombre);

  const base = { tendencias, captura: cap, ultimoDia };
  if (propias.every((m) => tendencias[m.id].estado === 'sin-datos')) {
    return { ...base, estado: 'sin-datos', motivo: [] };
  }
  if (cap !== null && cap.perdidos > 0) return { ...base, estado: 'sin-captura', motivo: [] };
  const suben = conEstado(propias, 'sube');
  if (suben.length > 0) return { ...base, estado: 'empeora', motivo: suben };
  const clienteSube = conEstado(clientes, 'sube');
  if (clienteSube.length > 0) return { ...base, estado: 'vigilar', motivo: clienteSube };
  const bajan = conEstado(propias, 'baja');
  if (bajan.length > 0) return { ...base, estado: 'mejora', motivo: bajan };
  return { ...base, estado: 'estable', motivo: [] };
}

export function ordenarPorSalud<T extends { nombre: string; salud: { estado: EstadoSalud } }>(
  filas: readonly T[],
): T[] {
  return [...filas].sort((a, b) => {
    const rango = ORDEN_SALUD.indexOf(a.salud.estado) - ORDEN_SALUD.indexOf(b.salud.estado);
    return rango !== 0 ? rango : a.nombre.localeCompare(b.nombre, 'es');
  });
}

// ---- before and after a release ----

export type ComparacionMetrica =
  | {
      kind: 'completa';
      metrica: Metrica;
      mediaAntes: number;
      mediaDespues: number;
      variacion: number | null;
      base: 'tasa' | 'recuento';
      estimado: boolean;
    }
  /** The week after has not finished: this many days to go. */
  | { kind: 'pendiente'; metrica: Metrica; quedan: number }
  /** Some day is not measured, and no amount of waiting will fix it. */
  | { kind: 'insuficiente'; metrica: Metrica; faltan: number };

export interface Comparacion {
  metricas: ComparacionMetrica[];
  /**
   * Other releases in either window, which is why the effect cannot be
   * attributed to one: manual ones and successful deployments, each release
   * once (health-hub, «Comparación antes y después de una subida»).
   */
  otras: Marca[];
}

/**
 * The 7 days before a release against the 7 after, without the day itself: it
 * mixes hours from both sides. It states what happened around the release, and
 * cannot say the release caused it. `marcas` are every mark of the application,
 * for the warning; a failed deployment never opens a comparison, so asking for
 * one is a mistake of the caller and gives no metrics.
 */
export function compararMarca(
  marca: Marca,
  marcas: readonly Marca[],
  filas: readonly Observacion[],
  catalogo: Catalogo,
  hoy: IsoDate,
): Comparacion {
  if (!abreComparacion(marca)) return { metricas: [], otras: [] };
  const indice = indexar(filas);
  const idPeticiones = idPeticionesDe(catalogo);
  const desdeAntes = addDays(marca.dia, -VENTANA);
  const desdeDespues = addDays(marca.dia, 1);
  const finDespues = addDays(marca.dia, VENTANA);

  const metricas = catalogo.metricas.map((metrica): ComparacionMetrica => {
    const dias = indice.get(metrica.id);
    const antes = ventana(dias, desdeAntes, VENTANA);
    const despues = ventana(dias, desdeDespues, VENTANA);
    // The last closed day is yesterday.
    const quedan = dayIndex(addDays(hoy, -1), finDespues);
    if (quedan > 0) return { kind: 'pendiente', metrica, quedan };
    if (!antes.completa || !despues.completa) {
      return { kind: 'insuficiente', metrica, faltan: antes.faltan + despues.faltan };
    }
    const peticiones =
      idPeticiones !== null && metrica.id !== idPeticiones ? indice.get(idPeticiones) : undefined;
    const { variacion, base } = variacionEntre(
      antes,
      despues,
      peticiones ? ventana(peticiones, desdeAntes, VENTANA) : null,
      peticiones ? ventana(peticiones, desdeDespues, VENTANA) : null,
    );
    return {
      kind: 'completa',
      metrica,
      mediaAntes: antes.suma / VENTANA,
      mediaDespues: despues.suma / VENTANA,
      variacion,
      base,
      estimado: antes.estimado || despues.estimado,
    };
  });

  const enVentana = marcas.filter(
    (m) => m.id !== marca.id && abreComparacion(m) && m.dia >= desdeAntes && m.dia <= finDespues,
  );
  return { metricas, otras: sinDuplicados(marca, enVentana) };
}

// ---- around a deployment, by the hour ----

/** Hours compared on each side of a deployment in the hourly view (health-despliegues, D5). */
export const VENTANA_HORAS = 24;
const HORA_MS = 3_600_000;

export type ComparacionHoras =
  | {
      kind: 'completa';
      antes: number;
      despues: number;
      variacion: number | null;
      base: 'tasa' | 'recuento';
      /** By the trend's rule: enough of a change, and enough of a rise. */
      sube: boolean;
    }
  /** The 24 hours after have not all been collected yet: this many to go. */
  | { kind: 'pendiente'; quedan: number }
  /** Some hour has no data, and it will not come back. */
  | { kind: 'insuficiente'; faltan: number };

function ventanaHoras(horas: ReadonlyMap<number, number> | undefined, desde: number): Ventana {
  let suma = 0;
  let faltan = 0;
  for (let i = 0; i < VENTANA_HORAS; i++) {
    const v = horas?.get(desde + i * HORA_MS);
    if (v === undefined) faltan++;
    else suma += v;
  }
  return { suma, completa: faltan === 0, faltan, estimado: false };
}

/**
 * The 24 whole hours before the hour a deployment finished in, against the 24
 * after it, without that hour: it mixes both sides. `hasta` is the end of the
 * last hour collected. Like the comparison by days, it describes what
 * coincided in time, never a cause.
 */
export function compararHoras(
  instante: number,
  horas: ReadonlyMap<number, number> | undefined,
  peticiones: ReadonlyMap<number, number> | null,
  clase: ClaseMetrica,
  hasta: number,
): ComparacionHoras {
  const h0 = Math.floor(instante / HORA_MS) * HORA_MS;
  const desdeAntes = h0 - VENTANA_HORAS * HORA_MS;
  const desdeDespues = h0 + HORA_MS;
  const finDespues = desdeDespues + VENTANA_HORAS * HORA_MS;
  if (finDespues > hasta) {
    return { kind: 'pendiente', quedan: Math.ceil((finDespues - hasta) / HORA_MS) };
  }
  const antes = ventanaHoras(horas, desdeAntes);
  const despues = ventanaHoras(horas, desdeDespues);
  if (!antes.completa || !despues.completa) {
    return { kind: 'insuficiente', faltan: antes.faltan + despues.faltan };
  }
  const { variacion, base } = variacionEntre(
    antes,
    despues,
    peticiones ? ventanaHoras(peticiones, desdeAntes) : null,
    peticiones ? ventanaHoras(peticiones, desdeDespues) : null,
  );
  const cambio = despues.suma - antes.suma;
  const sube = cambio >= MINIMO_ABSOLUTO && (variacion === null || variacion >= umbralDe(clase));
  return { kind: 'completa', antes: antes.suma, despues: despues.suma, variacion, base, sube };
}
