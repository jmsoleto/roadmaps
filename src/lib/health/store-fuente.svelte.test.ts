/**
 * Health Hub's store with the collector's folder connected (health-colector-kibana).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FolderDocBackend } from '../folder/doc-backend';
import type { FolderDir, PermissionState } from '../folder/fs';
import { MemoryDir } from '../folder/memory-fs';
import { HEALTH_FORMAT } from './folder-format';
import { FuenteConnection, type FuenteDeps } from './fuente/connection.svelte';
import { linea } from './fuente/fixtures';
import { datosIniciales, type HealthData, type Observacion } from './model';
import { HealthStore } from './store.svelte';

const H = 3_600_000;
const ZONA = 'Europe/Madrid';
const DESDE = Date.parse('2026-10-28T20:00:00Z');
const HASTA = Date.parse('2026-11-13T21:00:00Z');

const METRICAS = ['no-controlados', 'errores-50x', 'errores-404', 'errores-40x', 'peticiones'];

/** A collector folder with every hour from DESDE to HASTA, each metric at a fixed value. */
function colector(
  opciones: { hasta?: number; extra?: string[]; valor?: (m: string) => number } = {},
) {
  const hasta = opciones.hasta ?? HASTA;
  const metricas = [...METRICAS, ...(opciones.extra ?? [])];
  const valor = opciones.valor ?? ((m: string) => (m === 'peticiones' ? 1000 : 2));
  const raiz = new MemoryDir('data');
  const meta = (m: string) => ({
    name: m,
    query: `q:${m}`,
    effectiveQuery: `(alcance) AND (q:${m})`,
    step: 3600,
    from: new Date(DESDE).toISOString(),
    to: new Date(hasta).toISOString(),
    months: ['2026-10', '2026-11'],
  });
  raiz.put(
    'index.json',
    JSON.stringify({
      formatVersion: 1,
      apps: {
        'cex-es': {
          name: 'CEX ES',
          metrics: Object.fromEntries(metricas.map((m) => [m, meta(m)])),
        },
        mya: { name: 'MYA', metrics: { peticiones: meta('peticiones') } },
      },
    }),
  );
  const finOct = Date.parse('2026-11-01T00:00:00Z');
  for (const app of ['cex-es', 'mya']) {
    for (const m of app === 'mya' ? ['peticiones'] : metricas) {
      const horas = (a: number, b: number) => Array.from({ length: (b - a) / H }, () => valor(m));
      raiz.put(`series/${app}/${m}/2026-10.jsonl`, `${linea(DESDE, horas(DESDE, finOct))}\n`);
      raiz.put(`series/${app}/${m}/2026-11.jsonl`, `${linea(finOct, horas(finOct, hasta))}\n`);
    }
  }
  return raiz;
}

class Deps implements FuenteDeps {
  next: FolderDir | null = null;
  names = new Map<string, string>();
  handles = new Map<string, FolderDir>();
  permiso: PermissionState = 'granted';
  supports = () => true;
  pick = async () => this.next;
  connectedName = (k: string) => this.names.get(k) ?? null;
  loadHandle = async (k: string) => this.handles.get(k) ?? null;
  saveHandle = async (k: string, d: FolderDir, l: string) => {
    this.handles.set(k, d);
    this.names.set(k, l);
  };
  forgetHandle = async (k: string) => {
    this.handles.delete(k);
    this.names.delete(k);
  };
  query = async () => this.permiso;
  request = async () => this.permiso;
}

const obs = (dia: string, metrica: string, valor: number): Observacion => ({
  dia,
  metrica,
  valor,
  fuente: 'pantallazo',
  capturado: dia,
});

async function preparar(inicial: HealthData = datosIniciales(ZONA), fuente = colector()) {
  const dir = new MemoryDir('health');
  await new FolderDocBackend(dir, HEALTH_FORMAT, 'x').save(inicial);
  const deps = new Deps();
  const conn = new FuenteConnection(deps);
  deps.next = fuente;
  await conn.elegir();
  const store = new HealthStore(conn);
  store.useBackend(new FolderDocBackend(dir, HEALTH_FORMAT, 'x'));
  await store.init();
  store.hoy = '2026-11-14';
  dir.writes = [];
  return { dir, store, conn, fuente };
}

describe('Health Hub con la fuente conectada', () => {
  let ctx: Awaited<ReturnType<typeof preparar>>;

  beforeEach(async () => {
    ctx = await preparar();
  });

  it('ofrece las aplicaciones de la fuente que no están vinculadas', () => {
    expect(ctx.store.disponiblesEnFuente).toEqual([
      { id: 'cex-es', nombre: 'CEX ES' },
      { id: 'mya', nombre: 'MYA' },
    ]);
  });

  it('añadir desde la fuente crea solo el fichero de la aplicación, vinculada y con su nombre', async () => {
    const app = ctx.store.anadirDesdeFuente('cex-es')!;
    expect(app).toMatchObject({ id: 'cex-es', nombre: 'CEX ES', fuente: 'cex-es' });
    await ctx.store.flush();
    expect(ctx.dir.writes.sort()).toEqual(['app-cex-es.json', 'order.json']);
    expect(ctx.store.disponiblesEnFuente.map((a) => a.id)).toEqual(['mya']);
  });

  it('las cifras salen de la fuente, por días completos, y nunca se escriben en la carpeta', async () => {
    ctx.store.anadirDesdeFuente('cex-es');
    const filas = ctx.store.observacionesDe('cex-es').filter((o) => o.metrica === 'peticiones');
    // 28/10 starts at 20:00Z (partial) and 13/11 ends at 21:00Z (partial).
    expect(filas[0].dia).toBe('2026-10-29');
    expect(filas[filas.length - 1].dia).toBe('2026-11-12');
    expect(filas.find((o) => o.dia === '2026-11-10')?.valor).toBe(24_000);
    expect(filas.find((o) => o.dia === '2026-10-25')).toBeUndefined();
    await ctx.store.flush();
    expect(ctx.dir.writes.some((f) => f.startsWith('obs-'))).toBe(false);
    expect(ctx.store.consolidadasDe('cex-es')).toEqual([]);
  });

  it('la fuente prevalece sobre la carpeta, y la carpeta cubre los días que la fuente no tiene', async () => {
    const inicial: HealthData = {
      ...datosIniciales(ZONA),
      aplicaciones: [
        { id: 'cex-es', nombre: 'CEX ES', fuente: 'cex-es', consultas: {}, versiones: [] },
      ],
      observaciones: {
        'cex-es': [obs('2026-10-20', 'errores-50x', 7), obs('2026-11-10', 'errores-50x', 999)],
      },
    };
    const { store } = await preparar(inicial);
    const de50x = store.observacionesDe('cex-es').filter((o) => o.metrica === 'errores-50x');
    expect(de50x.find((o) => o.dia === '2026-10-20')?.valor).toBe(7);
    expect(de50x.find((o) => o.dia === '2026-11-10')?.valor).toBe(48);
    expect(store.consolidadasDe('cex-es')).toHaveLength(2);
  });

  it('tendencia y salud se calculan con los días de la fuente, con tasa', () => {
    ctx.store.anadirDesdeFuente('cex-es');
    const fila = ctx.store.filas.find((f) => f.id === 'cex-es')!;
    expect(fila.salud.estado).toBe('estable');
    expect(fila.salud.tendencias['errores-50x'].base).toBe('tasa');
  });

  it('la consulta de una métrica vinculada es la efectiva de la fuente', () => {
    ctx.store.anadirDesdeFuente('cex-es');
    expect(ctx.store.consultaDe('cex-es', 'errores-404')).toEqual({
      texto: '(alcance) AND (q:errores-404)',
      deFuente: true,
    });
  });

  it('una segunda aplicación vinculada a lo mismo no toma los datos, y se le dice', () => {
    ctx.store.anadirDesdeFuente('cex-es');
    const otra = ctx.store.crear('Copia')!;
    ctx.store.vincular(otra.id, 'cex-es');
    expect(ctx.store.vinculoDe(otra.id)).toBeNull();
    expect(ctx.store.sinDatosDeFuente(otra.id)).toBe(
      '«CEX ES» ya toma los datos de «cex-es» en la fuente.',
    );
  });

  it('desvincular devuelve la aplicación a las observaciones de la carpeta', () => {
    ctx.store.anadirDesdeFuente('cex-es');
    ctx.store.vincular('cex-es', null);
    expect(ctx.store.vigilada('cex-es')!.fuente).toBeUndefined();
    expect(ctx.store.observacionesDe('cex-es')).toEqual([]);
  });

  it('la nota se guarda recortada, y vacía se borra', () => {
    ctx.store.anadirDesdeFuente('mya');
    ctx.store.setNota('mya', '  La tasa es aproximada ');
    expect(ctx.store.vigilada('mya')!.nota).toBe('La tasa es aproximada');
    ctx.store.setNota('mya', ' ');
    expect('nota' in ctx.store.vigilada('mya')!).toBe(false);
  });

  it('avisa de una métrica de la fuente que no está en el catálogo, y no la usa', async () => {
    const { store } = await preparar(datosIniciales(ZONA), colector({ extra: ['errores-429'] }));
    store.anadirDesdeFuente('cex-es');
    expect(store.vinculoDe('cex-es')!.avisos).toContain(
      'La fuente tiene la métrica «errores-429», que no está en el catálogo: no se muestra.',
    );
    expect(store.observacionesDe('cex-es').some((o) => o.metrica === 'errores-429')).toBe(false);
  });

  it('el aviso de captura cuenta desde «datos hasta»: de hace 5 días, quedan 2', async () => {
    const { store } = await preparar(
      datosIniciales(ZONA),
      colector({ hasta: Date.parse('2026-11-09T10:00:00Z') }),
    );
    store.anadirDesdeFuente('cex-es');
    const cap = store.filas.find((f) => f.id === 'cex-es')!.salud.captura!;
    expect(cap.restantes).toBe(2);
    expect(cap.aviso).toBe(true);
  });

  it('«datos hasta» a medianoche cuenta el día anterior, que es el de su última hora', async () => {
    const { store } = await preparar(
      datosIniciales(ZONA),
      colector({ hasta: Date.parse('2026-11-09T23:00:00Z') }),
    );
    store.anadirDesdeFuente('cex-es');
    // 23:00Z is midnight of the 10th in Madrid: the last hour with data is on the 9th.
    expect(store.filas.find((f) => f.id === 'cex-es')!.salud.captura!.restantes).toBe(2);
  });

  it('recargar la fuente recoge una línea nueva', async () => {
    ctx.store.anadirDesdeFuente('cex-es');
    const antes = ctx.store.vinculoDe('cex-es')!.leida.series.get('peticiones')!.serie.horas.size;
    const ruta = 'series/cex-es/peticiones/2026-11.jsonl';
    ctx.fuente.put(ruta, `${ctx.fuente.read(ruta)}${linea(HASTA, [5])}\n`);
    await ctx.conn.recargar();
    expect(ctx.store.vinculoDe('cex-es')!.leida.series.get('peticiones')!.serie.horas.size).toBe(
      antes + 1,
    );
  });

  it('sin fuente conectada, una aplicación vinculada muestra solo lo de la carpeta', async () => {
    ctx.store.anadirDesdeFuente('cex-es');
    await ctx.conn.desconectar();
    expect(ctx.store.vinculoDe('cex-es')).toBeNull();
    expect(ctx.store.observacionesDe('cex-es')).toEqual([]);
  });
});
