/**
 * How an entry becomes data (health-hub, D5). Pure: no folder, no clock.
 *
 * The rule that makes repeating harmless: a value equal to the one stored, of
 * the same kind, leaves the stored row exactly as it was — capture date
 * included. `FileSync` then has no bytes to write, so a capture repeated, or
 * reprocessed after an interruption, changes nothing in git.
 */

import type { IsoDate } from '../model/types';
import { addDays } from '../time/timeline';
import type { Entrada, FilaEntrada } from './inbox';
import type { Observacion } from './model';

/**
 * How many days back a Kibana capture may speak for.
 *
 * Logs last 7 days, but the seventh may be partly expired already: its count
 * would come out low and overwrite a good value. So the oldest day is left out.
 */
export const VENTANA_CAPTURA = 6;

export type MotivoIgnorada =
  | 'dia-no-cerrado'
  | 'fuera-de-ventana'
  | 'aplicacion-desconocida'
  | 'metrica-desconocida'
  | 'exacto-existente'
  | 'captura-anterior';

export const MOTIVOS: Record<MotivoIgnorada, string> = {
  'dia-no-cerrado': 'el día de la captura aún no había terminado',
  'fuera-de-ventana': 'puede estar parcialmente caducado',
  'aplicacion-desconocida': 'la aplicación no existe',
  'metrica-desconocida': 'la métrica no existe',
  'exacto-existente': 'ya hay un valor exacto ese día',
  'captura-anterior': 'ya hay una captura más reciente de ese día',
};

export interface Conocidas {
  aplicaciones: ReadonlySet<string>;
  metricas: ReadonlySet<string>;
}

export interface Fusion {
  observaciones: Record<string, Observacion[]>;
  /** Rows that entered or replaced a value. */
  aplicadas: number;
  /** Rows equal to what was already there. */
  sinCambios: number;
  ignoradas: { fila: FilaEntrada; motivo: MotivoIgnorada }[];
}

/** Whether a row's day could be spoken for by this capture at all. */
export function motivoDelDia(fila: FilaEntrada, entrada: Entrada): MotivoIgnorada | null {
  if (fila.dia >= entrada.capturado) return 'dia-no-cerrado';
  if (entrada.fuente === 'kibana' && fila.dia < addDays(entrada.capturado, -VENTANA_CAPTURA)) {
    return 'fuera-de-ventana';
  }
  return null;
}

function aObservacion(fila: FilaEntrada, entrada: Entrada): Observacion {
  return {
    dia: fila.dia,
    metrica: fila.metrica,
    valor: fila.valor,
    fuente: entrada.fuente,
    capturado: entrada.capturado,
    ...(fila.estimado ? { estimado: true as const } : {}),
  };
}

type Resultado = 'aplica' | 'igual' | MotivoIgnorada;

function competir(actual: Observacion | undefined, nueva: Observacion): Resultado {
  if (!actual) return 'aplica';
  const actualEstimado = actual.estimado === true;
  const nuevaEstimada = nueva.estimado === true;
  if (actualEstimado !== nuevaEstimada) return nuevaEstimada ? 'exacto-existente' : 'aplica';
  if (actual.valor === nueva.valor) return 'igual';
  return nueva.capturado < actual.capturado ? 'captura-anterior' : 'aplica';
}

export function fusionar(
  observaciones: Record<string, Observacion[]>,
  entrada: Entrada,
  conocidas: Conocidas,
): Fusion {
  const out: Record<string, Observacion[]> = { ...observaciones };
  const copiadas = new Set<string>();
  let aplicadas = 0;
  let sinCambios = 0;
  const ignoradas: Fusion['ignoradas'] = [];

  for (const fila of entrada.filas) {
    const motivo: MotivoIgnorada | null = !conocidas.aplicaciones.has(fila.app)
      ? 'aplicacion-desconocida'
      : !conocidas.metricas.has(fila.metrica)
        ? 'metrica-desconocida'
        : motivoDelDia(fila, entrada);
    if (motivo) {
      ignoradas.push({ fila, motivo });
      continue;
    }

    const nueva = aObservacion(fila, entrada);
    const lista = out[fila.app] ?? [];
    const at = lista.findIndex((o) => o.dia === fila.dia && o.metrica === fila.metrica);
    const resultado = competir(lista[at], nueva);

    if (resultado === 'igual') {
      sinCambios++;
    } else if (resultado === 'aplica') {
      // Copied once per application, on first write, so the input stays untouched.
      if (!copiadas.has(fila.app)) {
        out[fila.app] = [...lista];
        copiadas.add(fila.app);
      }
      if (at === -1) out[fila.app].push(nueva);
      else out[fila.app][at] = nueva;
      aplicadas++;
    } else {
      ignoradas.push({ fila, motivo: resultado });
    }
  }

  return { observaciones: out, aplicadas, sinCambios, ignoradas };
}

/**
 * Whether an entry may enter without being looked at: exact numbers about
 * things that exist. Anything else — an estimate, a name nobody registered —
 * waits for a person, and nothing is created on its behalf.
 */
export function entraSola(entrada: Entrada, conocidas: Conocidas): boolean {
  return (
    entrada.fuente === 'kibana' &&
    entrada.filas.every(
      (f) => !f.estimado && conocidas.aplicaciones.has(f.app) && conocidas.metricas.has(f.metrica),
    )
  );
}

/** The most recent day an entry brings for a vigilada that its capture can speak for. */
export function ultimoDiaEntrada(entrada: Entrada, app: string): IsoDate | null {
  let ultimo: IsoDate | null = null;
  for (const fila of entrada.filas) {
    if (fila.app !== app || motivoDelDia(fila, entrada)) continue;
    if (ultimo === null || fila.dia > ultimo) ultimo = fila.dia;
  }
  return ultimo;
}
