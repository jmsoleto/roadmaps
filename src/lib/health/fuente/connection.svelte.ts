/**
 * Health Hub's second folder: the collector's data, read only
 * (health-colector-kibana, D1).
 *
 * Not a participant of `FolderConnection`: that one looks for `<folder>/health/`
 * and its marker, and can write the browser's data into it. The source has
 * neither: its root is the folder the user picks, `index.json` is what makes it
 * valid, and nothing is ever written to it. What it shares with the other
 * connections is what knows no application: the remembered handle and the
 * permission, here asked for reading only.
 *
 * ```
 * elegir ─▶ picker (read) ─▶ index.json ─┬─ válido ─▶ remember ─▶ lista
 *                                        └─ no ─────▶ message; nothing remembered
 * arranque ─▶ handle? ─▶ permiso? ─┬─ granted ─▶ read ─▶ lista | no-valida
 *                                  └─ prompt ──▶ permiso (a click re-activates)
 * ```
 */

import { pickFolder, readText, subfolder, supportsFolders, type FolderDir } from '../../folder/fs';
import type { PermissionState } from '../../folder/fs';
import { connectedName, forgetHandle, loadHandle, saveHandle } from '../../folder/handles';
import { queryPermission, requestPermission } from '../../folder/permission';
import {
  INDEX_FILE,
  leerIndice,
  leerSerie,
  rutaSerie,
  type AppFuente,
  type MetricaFuente,
  type Serie,
} from './read';
import { leerDespliegues, rutaDespliegues, type Despliegue } from './despliegues';

/** The key the source's handle is remembered under, beside the applications'. */
export const FUENTE_KEY = 'health-fuente';

export interface SerieLeida {
  metrica: MetricaFuente;
  serie: Serie;
}

export interface AppLeida {
  app: AppFuente;
  /** By metric id. */
  series: Map<string, SerieLeida>;
  /** Current state of each run, newest first; empty when the application has none. */
  despliegues: Despliegue[];
  /** What reading its series found: gaps, skipped lines, missing months. */
  avisos: string[];
}

export interface LecturaFuente {
  apps: AppLeida[];
  /** About `index.json` itself: applications or metrics it could not read. */
  avisos: string[];
}

export type EstadoFuente =
  | { kind: 'sin-fuente' }
  | { kind: 'abriendo'; nombre: string }
  | { kind: 'permiso'; nombre: string }
  | { kind: 'no-valida'; nombre: string; motivo: string }
  | { kind: 'lista'; nombre: string; lectura: LecturaFuente };

export interface FuenteDeps {
  supports(): boolean;
  pick(): Promise<FolderDir | null>;
  connectedName(key: string): string | null;
  loadHandle(key: string): Promise<FolderDir | null>;
  saveHandle(key: string, dir: FolderDir, label: string): Promise<void>;
  forgetHandle(key: string): Promise<void>;
  query(dir: FolderDir): Promise<PermissionState>;
  request(dir: FolderDir): Promise<PermissionState>;
}

export const fuenteBrowserDeps: FuenteDeps = {
  supports: supportsFolders,
  pick: () => pickFolder('read'),
  connectedName,
  loadHandle,
  saveHandle,
  forgetHandle,
  query: (dir) => queryPermission(dir, 'read'),
  request: (dir) => requestPermission(dir, 'read'),
};

/** A file below `dir`, or `null` when it or any folder on the way is missing. */
async function leerRuta(dir: FolderDir, ruta: string[]): Promise<string | null> {
  let actual: FolderDir | null = dir;
  for (const parte of ruta.slice(0, -1)) {
    actual = await subfolder(actual, parte);
    if (!actual) return null;
  }
  return readText(actual, ruta[ruta.length - 1]);
}

/**
 * Read the whole source: `index.json`, then every listed month of every
 * active metric and of every application's deployments. Only reads, and only
 * those files.
 */
export async function leerFuente(
  dir: FolderDir,
): Promise<{ kind: 'ok'; lectura: LecturaFuente } | { kind: 'error'; motivo: string }> {
  const indice = leerIndice(await readText(dir, INDEX_FILE));
  if (indice.kind === 'error') return indice;
  const apps: AppLeida[] = [];
  for (const app of indice.apps) {
    const series = new Map<string, SerieLeida>();
    const avisos: string[] = [];
    for (const metrica of app.metricas) {
      const textos = new Map<string, string | null>();
      for (const mes of metrica.meses) {
        textos.set(mes, await leerRuta(dir, rutaSerie(app.id, metrica.id, mes)));
      }
      const serie = leerSerie(`${app.id}/${metrica.id}`, textos);
      series.set(metrica.id, { metrica, serie });
      avisos.push(...serie.avisos);
    }
    // Every listed month, whatever is on screen: the file is the month of
    // `requestedAt`, and a run may finish weeks later (health-despliegues, D1).
    let despliegues: Despliegue[] = [];
    if (app.despliegues) {
      const textos = new Map<string, string | null>();
      for (const mes of app.despliegues.meses) {
        textos.set(mes, await leerRuta(dir, rutaDespliegues(app.id, mes)));
      }
      const leidos = leerDespliegues(app.id, textos);
      despliegues = leidos.despliegues;
      avisos.push(...leidos.avisos);
    }
    apps.push({ app, series, despliegues, avisos });
  }
  return { kind: 'ok', lectura: { apps, avisos: indice.avisos } };
}

export class FuenteConnection {
  estado = $state.raw<EstadoFuente>({ kind: 'sin-fuente' });
  recargando = $state(false);
  /** Why the last folder chosen was refused, until another is chosen or the message is closed. */
  rechazo = $state<string | null>(null);
  private dir: FolderDir | null = null;

  constructor(private deps: FuenteDeps = fuenteBrowserDeps) {}

  get supported(): boolean {
    return this.deps.supports();
  }

  /** The reading, when there is one to show. */
  get lectura(): LecturaFuente | null {
    return this.estado.kind === 'lista' ? this.estado.lectura : null;
  }

  /** Whether a source is remembered: the boot answers this without waiting. */
  get recordada(): boolean {
    return this.deps.connectedName(FUENTE_KEY) !== null;
  }

  /** Boot. Never prompts: a missing permission waits for a click on `reactivar`. */
  async start(): Promise<void> {
    const nombre = this.deps.connectedName(FUENTE_KEY);
    if (nombre === null) {
      this.dir = null;
      this.estado = { kind: 'sin-fuente' };
      return;
    }
    this.estado = { kind: 'abriendo', nombre };
    let handle: FolderDir | null = null;
    try {
      handle = await this.deps.loadHandle(FUENTE_KEY);
    } catch {
      handle = null;
    }
    if (!handle) {
      this.dir = null;
      this.estado = {
        kind: 'no-valida',
        nombre,
        motivo: `No se encuentra la conexión con «${nombre}». Desconecta la fuente y vuelve a elegirla.`,
      };
      return;
    }
    this.dir = handle;
    let permiso: PermissionState;
    try {
      permiso = await this.deps.query(handle);
    } catch (e) {
      this.estado = {
        kind: 'no-valida',
        nombre,
        motivo: `No se pudo comprobar el acceso: ${mensaje(e)}`,
      };
      return;
    }
    if (permiso === 'granted') await this.leer(nombre);
    else this.estado = { kind: 'permiso', nombre };
  }

  /** «Reactivar». Must run inside the click that asked for it. */
  async reactivar(): Promise<boolean> {
    if (this.estado.kind !== 'permiso' || !this.dir) return false;
    const nombre = this.estado.nombre;
    if ((await this.deps.request(this.dir)) !== 'granted') return false;
    await this.leer(nombre);
    return true;
  }

  /**
   * Ask for the source's folder. A folder that is not the collector's data is
   * refused with a message and nothing is remembered.
   */
  async elegir(): Promise<
    { ok: true } | { ok: false; motivo: string } | { ok: false; motivo: null }
  > {
    const elegida = await this.deps.pick();
    if (!elegida) return { ok: false, motivo: null };
    let leida;
    try {
      leida = await leerFuente(elegida);
    } catch (e) {
      leida = {
        kind: 'error' as const,
        motivo: `No se pudo leer «${elegida.name}»: ${mensaje(e)}`,
      };
    }
    if (leida.kind === 'error') {
      this.rechazo = leida.motivo;
      return { ok: false, motivo: leida.motivo };
    }
    this.rechazo = null;
    await this.deps.saveHandle(FUENTE_KEY, elegida, elegida.name);
    this.dir = elegida;
    this.estado = { kind: 'lista', nombre: elegida.name, lectura: leida.lectura };
    return { ok: true };
  }

  /** «Recargar»: read the same folder again, without picking it. */
  async recargar(): Promise<void> {
    if (!this.dir || (this.estado.kind !== 'lista' && this.estado.kind !== 'no-valida')) return;
    this.recargando = true;
    try {
      await this.leer(this.estado.nombre);
    } finally {
      this.recargando = false;
    }
  }

  /** Forget the source. Health Hub's own folder is not touched, nor the source. */
  async desconectar(): Promise<void> {
    await this.deps.forgetHandle(FUENTE_KEY);
    this.rechazo = null;
    this.dir = null;
    this.estado = { kind: 'sin-fuente' };
  }

  private async leer(nombre: string): Promise<void> {
    const dir = this.dir!;
    try {
      const leida = await leerFuente(dir);
      this.estado =
        leida.kind === 'ok'
          ? { kind: 'lista', nombre, lectura: leida.lectura }
          : { kind: 'no-valida', nombre, motivo: leida.motivo };
    } catch (e) {
      this.estado = {
        kind: 'no-valida',
        nombre,
        motivo: `No se pudo leer «${nombre}»: ${mensaje(e)}`,
      };
    }
  }
}

const mensaje = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const healthFuente = new FuenteConnection();
