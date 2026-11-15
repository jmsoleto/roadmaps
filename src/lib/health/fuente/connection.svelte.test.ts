import { describe, it, expect, beforeEach } from 'vitest';
import type { FolderDir, PermissionState } from '../../folder/fs';
import { MemoryDir } from '../../folder/memory-fs';
import { FUENTE_KEY, FuenteConnection, type FuenteDeps } from './connection.svelte';
import { indiceReal, linea } from './fixtures';

const H = 3_600_000;
const T0 = Date.parse('2026-11-06T20:00:00Z');

/** A collector folder: `index.json`, every listed series, and what must be ignored. */
function carpetaColector(): MemoryDir {
  const raiz = new MemoryDir('data');
  raiz.put('index.json', JSON.stringify(indiceReal()));
  for (const [app, metricas] of [
    ['cex-es', ['no-controlados', 'errores-50x', 'errores-404', 'errores-40x', 'peticiones']],
    ['mya', ['no-controlados', 'peticiones']],
  ] as const) {
    for (const m of metricas)
      raiz.put(`series/${app}/${m}/2026-11.jsonl`, `${linea(T0, [1, 2, 3])}\n`);
  }
  raiz.put('kibana/viejo/2026-11-13.json', '{ esto no se lee');
  raiz.put('README.md', '# datos');
  raiz.put('.git/HEAD', 'ref: refs/heads/data');
  return raiz;
}

class Deps implements FuenteDeps {
  next: FolderDir | null = null;
  handles = new Map<string, FolderDir>();
  names = new Map<string, string>();
  permiso: PermissionState = 'granted';
  concede: PermissionState = 'granted';
  supports = () => true;
  pick = async () => this.next;
  connectedName = (k: string) => this.names.get(k) ?? null;
  loadHandle = async (k: string) => this.handles.get(k) ?? null;
  saveHandle = async (k: string, d: FolderDir, label: string) => {
    this.handles.set(k, d);
    this.names.set(k, label);
  };
  forgetHandle = async (k: string) => {
    this.handles.delete(k);
    this.names.delete(k);
  };
  query = async () => this.permiso;
  request = async () => this.concede;
}

describe('la conexión con la fuente', () => {
  let deps: Deps;
  let conn: FuenteConnection;
  let carpeta: MemoryDir;

  beforeEach(() => {
    deps = new Deps();
    conn = new FuenteConnection(deps);
    carpeta = carpetaColector();
  });

  it('elegir la carpeta de datos la recuerda y lee sus aplicaciones y series', async () => {
    deps.next = carpeta;
    expect(await conn.elegir()).toEqual({ ok: true });
    expect(deps.names.get(FUENTE_KEY)).toBe('data');
    const l = conn.lectura!;
    expect(l.apps.map((a) => a.app.id)).toEqual(['cex-es', 'mya']);
    expect([...l.apps[0].series.get('peticiones')!.serie.horas.values()]).toEqual([1, 2, 3]);
    expect(l.apps[0].avisos).toEqual([]);
  });

  it('elegir series/ no recuerda nada y pide la carpeta que contiene index.json', async () => {
    deps.next = carpeta.dir('series');
    const r = await conn.elegir();
    expect(r.ok).toBe(false);
    expect(!r.ok && r.motivo).toMatch(/contiene index\.json/);
    expect(deps.names.size).toBe(0);
    expect(conn.estado.kind).toBe('sin-fuente');
  });

  it('elegir una carpeta por encima tampoco busca index.json más abajo', async () => {
    const arriba = new MemoryDir('customer-health-viewer');
    arriba.children.set('data', carpeta);
    deps.next = arriba;
    expect((await conn.elegir()).ok).toBe(false);
    expect(deps.names.size).toBe(0);
  });

  it('cancelar el selector no es un error', async () => {
    deps.next = null;
    expect(await conn.elegir()).toEqual({ ok: false, motivo: null });
  });

  it('nada de lo que hace escribe ni borra en la fuente', async () => {
    const antes = carpeta.snapshot();
    deps.next = carpeta;
    await conn.elegir();
    await conn.recargar();
    await conn.start();
    await conn.desconectar();
    expect(carpeta.writes).toEqual([]);
    expect(carpeta.removals).toEqual([]);
    expect(carpeta.snapshot()).toEqual(antes);
  });

  it('un mes que falta es un aviso, no un fallo', async () => {
    carpeta.dir('series/mya/peticiones').children.delete('2026-11.jsonl');
    deps.next = carpeta;
    await conn.elegir();
    const mya = conn.lectura!.apps[1];
    expect(mya.avisos).toEqual(['mya/peticiones: falta el fichero 2026-11.jsonl']);
    expect(mya.series.get('peticiones')!.serie.horas.size).toBe(0);
  });

  it('recargar recoge una línea nueva sin volver a elegir', async () => {
    deps.next = carpeta;
    await conn.elegir();
    deps.next = null;
    carpeta.put(
      'series/cex-es/peticiones/2026-11.jsonl',
      `${linea(T0, [1, 2, 3])}\n${linea(T0 + 3 * H, [4])}\n`,
    );
    await conn.recargar();
    expect([...conn.lectura!.apps[0].series.get('peticiones')!.serie.horas.values()]).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('al arrancar con la fuente recordada y el permiso, la lee', async () => {
    await deps.saveHandle(FUENTE_KEY, carpeta, 'data');
    expect(conn.recordada).toBe(true);
    await conn.start();
    expect(conn.estado.kind).toBe('lista');
  });

  it('al arrancar sin permiso espera un gesto, y reactivar la lee', async () => {
    await deps.saveHandle(FUENTE_KEY, carpeta, 'data');
    deps.permiso = 'prompt';
    await conn.start();
    expect(conn.estado).toEqual({ kind: 'permiso', nombre: 'data' });
    expect(await conn.reactivar()).toBe(true);
    expect(conn.estado.kind).toBe('lista');
  });

  it('sin fuente recordada, arrancar no lee nada', async () => {
    expect(conn.recordada).toBe(false);
    await conn.start();
    expect(conn.estado.kind).toBe('sin-fuente');
  });

  it('desconectar la olvida', async () => {
    deps.next = carpeta;
    await conn.elegir();
    await conn.desconectar();
    expect(deps.names.size).toBe(0);
    expect(conn.estado.kind).toBe('sin-fuente');
  });
});
