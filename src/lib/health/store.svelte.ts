/**
 * Health Hub's store: the folder's data, its inbox, and which panel is open.
 *
 * Only a folder can hold this data, so there are three places to be: no folder
 * at all, a folder being opened or impossible to read, and a folder in use. No
 * backend means the first; nothing is kept in the browser in that state, or
 * after disconnecting (`folder-persistence`, «Health Hub solo guarda en una
 * carpeta»).
 *
 * `$state.raw` and immutable updates because of the size: a few years of
 * observations are tens of thousands of rows, and every one of them would
 * otherwise become a proxy for the benefit of nothing that edits a row in place.
 */

import { FolderDocBackend, type DataSource, type DocBackend } from '../folder/doc-backend';
import type { Unavailability } from '../folder/file-sync';
import type { FolderDir } from '../folder/fs';
import { isIsoDate, todayIso } from '../time/timeline';
import { borrarEntrada, leerBandeja, type Entrada, type LecturaEntrada } from './inbox';
import {
  entraSola,
  fusionar,
  MOTIVOS,
  ultimoDiaEntrada,
  type Conocidas,
  type Fusion,
  type MotivoIgnorada,
} from './merge';
import {
  datosIniciales,
  nuevaVersion,
  nuevaVigilada,
  type HealthData,
  type Metrica,
  type Observacion,
  type Vigilada,
} from './model';
import { ordenarPorSalud, salud, type Salud } from './trends';

const SAVE_DEBOUNCE_MS = 300;

export interface FilaPanel {
  id: string;
  nombre: string;
  app: Vigilada;
  salud: Salud;
}

/** Why rows of an entry stayed out, as a sentence. */
function textoIgnoradas(ignoradas: Fusion['ignoradas']): string {
  if (ignoradas.length === 0) return '';
  const cuentas = new Map<MotivoIgnorada, number>();
  for (const { motivo } of ignoradas) cuentas.set(motivo, (cuentas.get(motivo) ?? 0) + 1);
  const partes = [...cuentas].map(([motivo, n]) => `${n} porque ${MOTIVOS[motivo]}`);
  const filas = ignoradas.length === 1 ? '1 fila ignorada' : `${ignoradas.length} filas ignoradas`;
  return ` ${filas}: ${partes.join('; ')}.`;
}

export class HealthStore {
  private backend = $state.raw<DocBackend<HealthData> | null>(null);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Inbox work runs one at a time: two merges at once would each start from the same data. */
  private ocupado: Promise<unknown> = Promise.resolve();

  data = $state.raw<HealthData>(datosIniciales());
  bandeja = $state.raw<LecturaEntrada[]>([]);
  ready = $state<boolean>(true);
  unavailable = $state<{ reason: string; why?: Unavailability } | null>(null);
  saveError = $state<string | null>(null);
  /** What the last read of the inbox did, as a sentence for the panel. */
  aviso = $state<string | null>(null);
  recargando = $state<boolean>(false);
  /** The vigilada whose panel is open, or `null` for the global one. Never persisted. */
  abierta = $state<string | null>(null);
  /** The day the figures are computed for, refreshed on every way in. */
  hoy = $state<string>(todayIso());

  get source(): DataSource {
    return this.backend === null ? 'browser' : 'folder';
  }

  get sinCarpeta(): boolean {
    return this.backend === null;
  }

  private get dir(): FolderDir | null {
    return this.backend instanceof FolderDocBackend ? this.backend.dir : null;
  }

  get pending(): boolean {
    return this.saveTimer !== null || !!this.backend?.pending;
  }

  settled(): Promise<void> {
    return this.backend?.settled?.() ?? Promise.resolve();
  }

  /** Point the store at a folder, or at none. The caller flushes first and runs `init()` after. */
  useBackend(backend: DocBackend<HealthData> | null): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.backend = backend;
  }

  /** Say «opening» before the folder connection has found its handle. */
  expectFolder(): void {
    this.ready = false;
  }

  async init(): Promise<void> {
    this.saveError = null;
    this.aviso = null;
    this.hoy = todayIso();
    const backend = this.backend;
    if (!backend) {
      this.data = datosIniciales();
      this.bandeja = [];
      this.unavailable = null;
      this.abierta = null;
      this.ready = true;
      return;
    }
    this.ready = false;
    await this.leer(backend);
    this.ready = true;
    if (this.abierta !== null && !this.vigilada(this.abierta)) this.abierta = null;
  }

  private async leer(backend: DocBackend<HealthData>): Promise<void> {
    const out = await backend.load();
    if (out.kind === 'unavailable') {
      this.data = datosIniciales();
      this.bandeja = [];
      this.unavailable = { reason: out.reason, why: out.why };
      return;
    }
    this.data = out.kind === 'loaded' ? out.data : datosIniciales();
    this.unavailable = null;
    await this.procesarBandeja();
  }

  /** Nothing may be created or written over data that has not been read. */
  private get down(): boolean {
    return this.backend === null || !this.ready || this.unavailable !== null;
  }

  // ---- reading ----

  vigilada(id: string): Vigilada | null {
    return this.data.aplicaciones.find((a) => a.id === id) ?? null;
  }

  observacionesDe(id: string): Observacion[] {
    return this.data.observaciones[id] ?? [];
  }

  get metricas(): Metrica[] {
    return this.data.catalogo.metricas;
  }

  get conocidas(): Conocidas {
    return {
      aplicaciones: new Set(this.data.aplicaciones.map((a) => a.id)),
      metricas: new Set(this.data.catalogo.metricas.map((m) => m.id)),
    };
  }

  /** Every vigilada with its health, worst first. */
  filas: FilaPanel[] = $derived.by(() => {
    const entradas = this.bandeja.flatMap((l) => (l.kind === 'valida' ? [l.entrada] : []));
    return ordenarPorSalud(
      this.data.aplicaciones.map((app) => {
        let pendiente: string | null = null;
        for (const entrada of entradas) {
          const dia = ultimoDiaEntrada(entrada, app.id);
          if (dia !== null && (pendiente === null || dia > pendiente)) pendiente = dia;
        }
        return {
          id: app.id,
          nombre: app.nombre,
          app,
          salud: salud(this.observacionesDe(app.id), this.data.catalogo, this.hoy, pendiente),
        };
      }),
    );
  });

  get abiertaVigilada(): Vigilada | null {
    return this.abierta === null ? null : this.vigilada(this.abierta);
  }

  // ---- navigation ----

  /** Entering the application: the global panel, with the figures of today. */
  home(): void {
    this.abierta = null;
    this.hoy = todayIso();
  }

  abrir(id: string | null): void {
    if (id !== null && !this.vigilada(id)) return;
    this.abierta = id;
  }

  // ---- editing ----

  crear(nombre: string): Vigilada | null {
    if (this.down || nombre.trim() === '') return null;
    const app = nuevaVigilada(
      nombre,
      this.data.aplicaciones.map((a) => a.id),
    );
    this.data = { ...this.data, aplicaciones: [...this.data.aplicaciones, app] };
    this.abierta = app.id;
    this.schedule();
    return app;
  }

  private cambiar(id: string, fn: (app: Vigilada) => Vigilada): void {
    if (this.down) return;
    this.data = {
      ...this.data,
      aplicaciones: this.data.aplicaciones.map((a) => (a.id === id ? fn(a) : a)),
    };
    this.schedule();
  }

  renombrar(id: string, nombre: string): void {
    const limpio = nombre.trim();
    if (limpio === '') return;
    this.cambiar(id, (a) => ({ ...a, nombre: limpio }));
  }

  /** Takes its data with it; the screen has already said how much. */
  eliminar(id: string): void {
    if (this.down) return;
    const observaciones = { ...this.data.observaciones };
    delete observaciones[id];
    this.data = {
      ...this.data,
      aplicaciones: this.data.aplicaciones.filter((a) => a.id !== id),
      observaciones,
    };
    if (this.abierta === id) this.abierta = null;
    this.schedule();
  }

  setConsulta(id: string, metrica: string, texto: string): void {
    this.cambiar(id, (a) => {
      const consultas = { ...a.consultas };
      if (texto.trim() === '') delete consultas[metrica];
      else consultas[metrica] = texto.trim();
      return { ...a, consultas };
    });
  }

  addVersion(id: string, version: string, dia: string, nota?: string): void {
    if (version.trim() === '' || !isIsoDate(dia)) return;
    this.cambiar(id, (a) => ({
      ...a,
      versiones: [...a.versiones, nuevaVersion(version, dia, nota)],
    }));
  }

  updateVersion(id: string, versionId: string, version: string, dia: string, nota?: string): void {
    if (version.trim() === '' || !isIsoDate(dia)) return;
    const texto = nota?.trim();
    this.cambiar(id, (a) => ({
      ...a,
      versiones: a.versiones.map((v) => {
        if (v.id !== versionId) return v;
        const editada = { ...v, version: version.trim(), dia };
        if (texto) editada.nota = texto;
        else delete editada.nota;
        return editada;
      }),
    }));
  }

  deleteVersion(id: string, versionId: string): void {
    this.cambiar(id, (a) => ({ ...a, versiones: a.versiones.filter((v) => v.id !== versionId) }));
  }

  // ---- the inbox ----

  /** What applying an entry would do, for the review to show. */
  previsualizar(entrada: Entrada): Fusion {
    return fusionar(this.data.observaciones, entrada, this.conocidas);
  }

  private enCola<T>(fn: () => Promise<T>): Promise<T> {
    const siguiente = this.ocupado.then(fn, fn);
    this.ocupado = siguiente.catch(() => undefined);
    return siguiente;
  }

  /**
   * Write the data and wait until it is on disk. Only then may an entry go: a
   * cut between the two reads the entry again next time, to no effect.
   */
  private async escribir(): Promise<boolean> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      await this.backend!.save(this.data);
      await this.backend!.settled?.();
      this.saveError = null;
      return true;
    } catch (e) {
      this.saveError = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  private async procesarBandeja(): Promise<void> {
    const dir = this.dir;
    if (!dir) return;
    let lecturas: LecturaEntrada[];
    try {
      lecturas = await leerBandeja(dir, this.data.catalogo.zona);
    } catch (e) {
      this.saveError = `No se pudo leer la bandeja: ${e instanceof Error ? e.message : String(e)}`;
      return;
    }

    const conocidas = this.conocidas;
    const solas: Entrada[] = [];
    const resto: LecturaEntrada[] = [];
    for (const l of lecturas) {
      if (l.kind === 'valida' && entraSola(l.entrada, conocidas)) solas.push(l.entrada);
      else resto.push(l);
    }
    this.bandeja = resto;
    if (solas.length === 0) return;

    // Oldest capture first, so the newest wins as it would have on arrival.
    solas.sort((a, b) => (a.capturado < b.capturado ? -1 : a.capturado > b.capturado ? 1 : 0));
    let observaciones = this.data.observaciones;
    let aplicadas = 0;
    const ignoradas: Fusion['ignoradas'] = [];
    for (const entrada of solas) {
      const f = fusionar(observaciones, entrada, conocidas);
      observaciones = f.observaciones;
      aplicadas += f.aplicadas;
      ignoradas.push(...f.ignoradas);
    }

    if (aplicadas > 0) {
      this.data = { ...this.data, observaciones };
      if (!(await this.escribir())) return;
    }
    for (const entrada of solas) await borrarEntrada(dir, entrada.fichero);

    const capturas = solas.length === 1 ? '1 captura' : `${solas.length} capturas`;
    const filas = aplicadas === 1 ? '1 fila consolidada' : `${aplicadas} filas consolidadas`;
    this.aviso = `${capturas}: ${filas}.${textoIgnoradas(ignoradas)}`;
  }

  /** Apply an entry that was waiting for review. */
  aplicarEntrada(fichero: string): Promise<void> {
    return this.enCola(async () => {
      const dir = this.dir;
      const l = this.bandeja.find((e) => e.kind === 'valida' && e.entrada.fichero === fichero);
      if (!dir || l?.kind !== 'valida' || this.down) return;
      const f = this.previsualizar(l.entrada);
      if (f.aplicadas > 0) {
        this.data = { ...this.data, observaciones: f.observaciones };
        if (!(await this.escribir())) return;
      }
      await borrarEntrada(dir, fichero);
      this.bandeja = this.bandeja.filter((e) => e !== l);
      const filas = f.aplicadas === 1 ? '1 fila consolidada' : `${f.aplicadas} filas consolidadas`;
      this.aviso = `${fichero}: ${filas}.${textoIgnoradas(f.ignoradas)}`;
    });
  }

  /** Throw an inbox file away, at the user's request. */
  descartarEntrada(fichero: string): Promise<void> {
    return this.enCola(async () => {
      const dir = this.dir;
      if (!dir) return;
      await borrarEntrada(dir, fichero);
      this.bandeja = this.bandeja.filter(
        (e) => (e.kind === 'valida' ? e.entrada.fichero : e.fichero) !== fichero,
      );
    });
  }

  /** Read the folder again and process the inbox, for what appeared with the app open. */
  recargar(): Promise<void> {
    return this.enCola(async () => {
      const backend = this.backend;
      if (!backend || !this.ready) return;
      await this.flush();
      // What could not be written is still only here: reading would lose it.
      if (this.saveError !== null) return;
      this.recargando = true;
      this.aviso = null;
      this.hoy = todayIso();
      try {
        await this.leer(backend);
        if (this.abierta !== null && !this.vigilada(this.abierta)) this.abierta = null;
        if (this.aviso === null && !this.unavailable) {
          this.aviso = 'Carpeta releída: nada nuevo que consolidar.';
        }
      } finally {
        this.recargando = false;
      }
    });
  }

  // ---- persistence ----

  private schedule(): void {
    if (this.down) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.down) return;
    await this.escribir();
  }
}

export const health = new HealthStore();
