/**
 * Health Hub's store: the folder's data, its inbox, and which panel is open.
 *
 * Only a folder can hold this data, so there are three places to be: no folder
 * at all, a folder being opened or impossible to read, and a folder in use. No
 * backend means the first; nothing is kept in the browser in that state, or
 * after disconnecting (`folder-persistence`, «Health Hub solo guarda en una
 * carpeta»).
 *
 * A vigilada linked to the collector's folder takes its figures from there
 * (health-colector-kibana, D4): they are derived here and never put in `data`,
 * so the autosave cannot write them into `obs-*`.
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
  type Catalogo,
  nuevaVersion,
  nuevaVigilada,
  type HealthData,
  type Metrica,
  type Observacion,
  type Vigilada,
} from './model';
import { ordenarPorSalud, salud, type Salud } from './trends';
import { healthFuente, type AppLeida, type LecturaFuente } from './fuente/connection.svelte';
import { catalogoEfectivo } from './fuente/catalog';
import { diaEn, diasCompletos } from './fuente/days';
import { datosHasta } from './fuente/rate';
import type { Despliegue } from './fuente/despliegues';
import { marcasDe, type Marca } from './marcas';

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

/** What the source gives a linked vigilada. */
export interface VinculoFuente {
  leida: AppLeida;
  /** Complete days, as observations, by the catalogue's metrics. */
  dias: Observacion[];
  /** `to` of the application, in ms. */
  hasta: number | null;
  avisos: string[];
}

/** Anything that can hand over the source's reading: the connection, or a test's stand-in. */
export interface OrigenFuente {
  readonly lectura: LecturaFuente | null;
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

  constructor(private origen: OrigenFuente | null = null) {}

  get lecturaFuente(): LecturaFuente | null {
    return this.origen?.lectura ?? null;
  }

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

  /** What the folder holds for a vigilada: what removing it deletes. */
  consolidadasDe(id: string): Observacion[] {
    return this.data.observaciones[id] ?? [];
  }

  /**
   * By vigilada id, what the source gives each linked one. Two vigiladas linked
   * to the same application: only the first in order takes it, the other is told.
   */
  vinculos: Map<string, VinculoFuente> = $derived.by(() => {
    const out = new Map<string, VinculoFuente>();
    const lectura = this.lecturaFuente;
    if (!lectura) return out;
    const { zona, metricas } = this.catalogo;
    const enCatalogo = new Set(metricas.map((m) => m.id));
    const tomadas = new Set<string>();
    for (const app of this.data.aplicaciones) {
      if (!app.fuente || tomadas.has(app.fuente)) continue;
      const leida = lectura.apps.find((a) => a.app.id === app.fuente);
      if (!leida) continue;
      tomadas.add(app.fuente);
      const hasta = datosHasta(leida.app);
      // `to` ends the last closed hour: the day is that of the hour before it.
      const capturado = diaEn((hasta ?? Date.now()) - 1, zona);
      const dias: Observacion[] = [];
      const avisos = [...leida.avisos];
      for (const [metrica, { serie }] of leida.series) {
        if (!enCatalogo.has(metrica)) {
          avisos.push(
            `La métrica «${metrica}» de la fuente no tiene clase (propia, cliente o peticiones): no se muestra. Añádela con su clase a catalogo.json.`,
          );
          continue;
        }
        dias.push(...diasCompletos(serie.horas, metrica, zona, capturado));
      }
      out.set(app.id, { leida, dias, hasta, avisos });
    }
    return out;
  });

  vinculoDe(id: string): VinculoFuente | null {
    return this.vinculos.get(id) ?? null;
  }

  /**
   * The deployments of a linked vigilada, newest first. `null` when it is not
   * linked or its source application has no deployments (health-despliegues).
   */
  desplieguesDe(id: string): Despliegue[] | null {
    const v = this.vinculos.get(id);
    return v?.leida.app.despliegues ? v.leida.despliegues : null;
  }

  /** Every mark of a vigilada: its manual releases and its deployments. */
  marcasDe(id: string): Marca[] {
    const app = this.vigilada(id);
    if (!app) return [];
    return marcasDe(app, this.desplieguesDe(id) ?? [], this.catalogo.zona);
  }

  /** Why a linked vigilada gets nothing from the source although it is connected. */
  sinDatosDeFuente(id: string): string | null {
    const app = this.vigilada(id);
    if (!app?.fuente || this.vinculos.has(id) || !this.lecturaFuente) return null;
    const otra = this.data.aplicaciones.find(
      (a) => a.id !== id && a.fuente === app.fuente && this.vinculos.has(a.id),
    );
    if (otra) return `«${otra.nombre}» ya toma los datos de «${app.fuente}» en la fuente.`;
    return `La fuente no tiene la aplicación «${app.fuente}».`;
  }

  private mezcladas: Map<string, Observacion[]> = $derived.by(() => {
    const out = new Map<string, Observacion[]>();
    for (const [id, v] of this.vinculos) {
      const deFuente = new Set(v.dias.map((o) => `${o.metrica}|${o.dia}`));
      const propias = this.consolidadasDe(id).filter((o) => !deFuente.has(`${o.metrica}|${o.dia}`));
      out.set(id, [...v.dias, ...propias]);
    }
    return out;
  });

  /** Every day of a vigilada: the source's where it has them, the folder's elsewhere. */
  observacionesDe(id: string): Observacion[] {
    return this.mezcladas.get(id) ?? this.consolidadasDe(id);
  }

  /** The query behind a metric: the source's, read only, when the vigilada is linked. */
  consultaDe(id: string, metrica: string): { texto: string; deFuente: boolean } | null {
    const v = this.vinculos.get(id);
    const deFuente = v?.leida.series.get(metrica)?.metrica.consulta;
    if (deFuente !== undefined) return { texto: deFuente, deFuente: true };
    const propia = this.vigilada(id)?.consultas[metrica];
    return propia ? { texto: propia, deFuente: false } : null;
  }

  /** Applications of the source no vigilada is linked to: what can be added with a gesture. */
  get disponiblesEnFuente(): { id: string; nombre: string }[] {
    const lectura = this.lecturaFuente;
    if (!lectura) return [];
    const vinculadas = new Set(this.data.aplicaciones.map((a) => a.fuente).filter(Boolean));
    return lectura.apps
      .filter((a) => !vinculadas.has(a.app.id))
      .map((a) => ({ id: a.app.id, nombre: a.app.nombre }));
  }

  /**
   * The catalogue the panels use: the collector's when it is connected, the
   * folder's otherwise (health-colector-kibana, D8). Never written.
   */
  private efectivo = $derived.by(() => {
    const conDatos = new Set<string>();
    for (const filas of Object.values(this.data.observaciones)) {
      for (const f of filas) conDatos.add(f.metrica);
    }
    return catalogoEfectivo(this.data.catalogo, this.lecturaFuente, conDatos);
  });

  get catalogo(): Catalogo {
    return this.efectivo.catalogo;
  }

  get metricas(): Metrica[] {
    return this.catalogo.metricas;
  }

  /** A metric as an application names it: the source's name when it is linked. */
  nombreMetrica(id: string, metrica: Metrica): string {
    return this.vinculos.get(id)?.leida.series.get(metrica.id)?.metrica.nombre ?? metrica.nombre;
  }

  get conocidas(): Conocidas {
    return {
      aplicaciones: new Set(this.data.aplicaciones.map((a) => a.id)),
      metricas: new Set(this.metricas.map((m) => m.id)),
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
        // A linked vigilada has lost nothing up to its «datos hasta», complete or not.
        const hasta = this.vinculos.get(app.id)?.hasta;
        if (hasta !== undefined && hasta !== null) {
          // `to` is where the last closed hour ends, so its day is the hour before's.
          const dia = diaEn(hasta - 1, this.catalogo.zona);
          if (pendiente === null || dia > pendiente) pendiente = dia;
        }
        return {
          id: app.id,
          nombre: app.nombre,
          app,
          salud: salud(this.observacionesDe(app.id), this.catalogo, this.hoy, pendiente),
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

  /** Add an application of the source as a vigilada, linked to it, with the source's name. */
  anadirDesdeFuente(fuenteId: string): Vigilada | null {
    if (this.down) return null;
    const leida = this.lecturaFuente?.apps.find((a) => a.app.id === fuenteId);
    if (!leida || this.data.aplicaciones.some((a) => a.fuente === fuenteId)) return null;
    const app: Vigilada = {
      ...nuevaVigilada(
        leida.app.nombre,
        this.data.aplicaciones.map((a) => a.id),
      ),
      fuente: fuenteId,
    };
    this.data = { ...this.data, aplicaciones: [...this.data.aplicaciones, app] };
    this.schedule();
    return app;
  }

  /** Link a vigilada to an application of the source, or unlink it with `null`. */
  vincular(id: string, fuenteId: string | null): void {
    this.cambiar(id, (a) => {
      const resto = { ...a };
      delete resto.fuente;
      return fuenteId ? { ...resto, fuente: fuenteId } : resto;
    });
  }

  setNota(id: string, texto: string): void {
    const limpio = texto.trim();
    this.cambiar(id, (a) => {
      const resto = { ...a };
      delete resto.nota;
      return limpio ? { ...resto, nota: limpio } : resto;
    });
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

export const health = new HealthStore(healthFuente);
