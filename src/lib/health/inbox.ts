/**
 * The inbox: what an agent, or a person, leaves in the folder as a proposal
 * (health-hub, D1 and D4).
 *
 * `entrada-*.json` is the contract with whoever captures. An agent only has to
 * write this format; the application decides what becomes data. Each file is
 * read on its own: unlike the data, a broken one is rejected by name and leaves
 * everything else standing, because a botched file from an LLM is an ordinary
 * event here and not a sign that the folder is damaged.
 *
 * ```json
 * {
 *   "format": 1,
 *   "fuente": "kibana",
 *   "capturado": "2026-11-07",
 *   "zona": "Europe/Madrid",
 *   "filas": [{ "app": "pedidos", "metrica": "500", "dia": "2026-11-05", "valor": 340 }]
 * }
 * ```
 */

import { isObject } from '../folder/canonical';
import { readAll, removeFile, type FolderDir } from '../folder/fs';
import type { IsoDate } from '../model/types';
import { isIsoDate } from '../time/timeline';
import { isFuente, type Fuente } from './model';

export const FORMATO_ENTRADA = 1;

const ES_ENTRADA = /^entrada-.*\.json$/;

export const isEntryFile = (name: string): boolean => ES_ENTRADA.test(name);

export interface FilaEntrada {
  app: string;
  metrica: string;
  dia: IsoDate;
  valor: number;
  estimado: boolean;
}

export interface Entrada {
  fichero: string;
  fuente: Fuente;
  capturado: IsoDate;
  zona: string;
  filas: FilaEntrada[];
}

export type LecturaEntrada =
  { kind: 'valida'; entrada: Entrada } | { kind: 'rechazada'; fichero: string; motivo: string };

function leerFila(v: unknown, fuente: Fuente): FilaEntrada | string {
  if (!isObject(v)) return 'no es un objeto';
  if (typeof v.app !== 'string' || v.app === '') return 'no dice de qué aplicación es';
  if (typeof v.metrica !== 'string' || v.metrica === '') return 'no dice de qué métrica es';
  if (!isIsoDate(v.dia)) return 'su día no es una fecha AAAA-MM-DD';
  if (!Number.isInteger(v.valor) || (v.valor as number) < 0) {
    return 'su valor no es un entero no negativo';
  }
  if (v.estimado !== undefined && typeof v.estimado !== 'boolean') {
    return '«estimado» no es verdadero o falso';
  }
  return {
    app: v.app,
    metrica: v.metrica,
    dia: v.dia,
    valor: v.valor as number,
    // A number read off a picture is an estimate, whatever the file says.
    estimado: fuente === 'pantallazo' || v.estimado === true,
  };
}

/** One inbox file, to an entry or to the reason it was rejected. */
export function leerEntrada(fichero: string, texto: string, zona: string): LecturaEntrada {
  const rechazada = (motivo: string): LecturaEntrada => ({ kind: 'rechazada', fichero, motivo });

  let v: unknown;
  try {
    v = JSON.parse(texto);
  } catch {
    return rechazada('no es JSON válido');
  }
  if (!isObject(v)) return rechazada('no es un objeto JSON');
  if (v.format !== FORMATO_ENTRADA) return rechazada(`«format» debe ser ${FORMATO_ENTRADA}`);
  if (!isFuente(v.fuente)) return rechazada('«fuente» debe ser kibana o pantallazo');
  if (!isIsoDate(v.capturado)) return rechazada('«capturado» no es una fecha AAAA-MM-DD');
  if (typeof v.zona !== 'string') return rechazada('falta la zona horaria');
  if (v.zona !== zona) {
    return rechazada(
      `su zona horaria es ${v.zona} y la del catálogo es ${zona}: sus días no serían comparables`,
    );
  }
  if (!Array.isArray(v.filas) || v.filas.length === 0) return rechazada('no trae filas');

  const filas: FilaEntrada[] = [];
  const vistas = new Set<string>();
  for (let i = 0; i < v.filas.length; i++) {
    const fila = leerFila(v.filas[i], v.fuente);
    if (typeof fila === 'string') return rechazada(`la fila ${i + 1} ${fila}`);
    const clave = `${fila.app}|${fila.metrica}|${fila.dia}`;
    if (vistas.has(clave)) {
      return rechazada(
        `repite ${fila.metrica} de ${fila.app} el ${fila.dia}, con lo que se contradice`,
      );
    }
    vistas.add(clave);
    filas.push(fila);
  }
  return {
    kind: 'valida',
    entrada: { fichero, fuente: v.fuente, capturado: v.capturado, zona: v.zona, filas },
  };
}

/** Every inbox file of the folder, read one by one, in name order. */
export async function leerBandeja(dir: FolderDir, zona: string): Promise<LecturaEntrada[]> {
  const todos = await readAll(dir);
  return [...todos]
    .filter(([name]) => isEntryFile(name))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([name, texto]) => leerEntrada(name, texto, zona));
}

export async function borrarEntrada(dir: FolderDir, fichero: string): Promise<void> {
  if (!isEntryFile(fichero)) throw new Error(`«${fichero}» no es de la bandeja`);
  await removeFile(dir, fichero);
}
