/**
 * Health Hub's data: the applications being watched, what is measured in them,
 * and one value per application, metric and day.
 *
 * The field names are the ones in the folder files, in Spanish, because those
 * files are read by people in a diff and written by agents: `entrada-*.json` is
 * a documented contract, and translating at the edge would mean two
 * vocabularies for one thing.
 *
 * A word that needs care: an **application** is one of the hub's (Roadmaps,
 * Links…), a **vigilada** is one whose errors are measured here.
 */

import type { IsoDate } from '../model/types';

export type ClaseMetrica = 'propia' | 'cliente' | 'peticiones';
export type Fuente = 'kibana' | 'pantallazo';

export interface Metrica {
  id: string;
  nombre: string;
  clase: ClaseMetrica;
}

export interface Catalogo {
  /** The time zone every day in this folder is measured in. */
  zona: string;
  metricas: Metrica[];
}

export interface VersionSubida {
  id: string;
  version: string;
  dia: IsoDate;
  nota?: string;
}

export interface Vigilada {
  id: string;
  nombre: string;
  /**
   * The collector application this vigilada reads its figures from
   * (health-colector-kibana, D5). Absent when it is fed only by its folder.
   */
  fuente?: string;
  /** Free text shown beside its rates: caveats nobody can compute. Never interpreted. */
  nota?: string;
  /** The text of the query behind each metric, by metric id. Never interpreted. */
  consultas: Record<string, string>;
  versiones: VersionSubida[];
}

/**
 * One measured day. No observation means «not measured»; `valor: 0` means
 * «measured, none» (`health-hub`, «Observaciones diarias»).
 */
export interface Observacion {
  dia: IsoDate;
  metrica: string;
  valor: number;
  fuente: Fuente;
  capturado: IsoDate;
  estimado?: true;
}

export interface HealthData {
  catalogo: Catalogo;
  aplicaciones: Vigilada[];
  /** By vigilada id. */
  observaciones: Record<string, Observacion[]>;
}

const CLASES: readonly ClaseMetrica[] = ['propia', 'cliente', 'peticiones'];

export const isClase = (v: unknown): v is ClaseMetrica =>
  typeof v === 'string' && (CLASES as readonly string[]).includes(v);

export const isFuente = (v: unknown): v is Fuente => v === 'kibana' || v === 'pantallazo';

/** The metrics a new folder starts with. */
export function metricasIniciales(): Metrica[] {
  return [
    { id: 'no-controlados', nombre: 'No controlados', clase: 'propia' },
    { id: 'errores-50x', nombre: '50x', clase: 'propia' },
    { id: 'errores-404', nombre: '404', clase: 'cliente' },
    { id: 'errores-40x', nombre: '40x (sin 404)', clase: 'cliente' },
    { id: 'peticiones', nombre: 'Peticiones', clase: 'peticiones' },
  ];
}

function zonaLocal(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** What a folder holds the moment it is connected. */
export function datosIniciales(zona: string = zonaLocal()): HealthData {
  return {
    catalogo: { zona, metricas: metricasIniciales() },
    aplicaciones: [],
    observaciones: {},
  };
}

export const ID_VIGILADA = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * A short, readable id for a vigilada, fixed at creation.
 *
 * Readable because an agent has to write it in an `entrada-*.json` and a person
 * has to find it in a file name; fixed so that renaming touches one file instead
 * of moving the whole history.
 */
export function idParaNombre(nombre: string, ocupados: Iterable<string>): string {
  const base =
    nombre
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'aplicacion';
  const usados = new Set(ocupados);
  if (!usados.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidato = `${base}-${n}`;
    if (!usados.has(candidato)) return candidato;
  }
}

export function nuevaVigilada(nombre: string, ocupados: Iterable<string>): Vigilada {
  return {
    id: idParaNombre(nombre, ocupados),
    nombre: nombre.trim(),
    consultas: {},
    versiones: [],
  };
}

export function nuevaVersion(version: string, dia: IsoDate, nota?: string): VersionSubida {
  const azar = Math.random().toString(16).slice(2, 7);
  const texto = nota?.trim();
  return {
    id: `v-${Date.now()}-${azar}`,
    version: version.trim(),
    dia,
    ...(texto ? { nota: texto } : {}),
  };
}
