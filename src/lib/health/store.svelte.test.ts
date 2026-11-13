/**
 * Health Hub's store and its connection, over a folder in memory.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FolderDocBackend } from '../folder/doc-backend';
import type { FolderDeps } from '../folder/connection.svelte';
import { readAll, removeFile, subfolder, writeText, type FolderDir } from '../folder/fs';
import { MARKER_FILE } from '../folder/marker';
import { MemoryDir } from '../folder/memory-fs';
import { addDays, todayIso } from '../time/timeline';
import { HEALTH_FORMAT } from './folder-format';
import { HealthFolder } from './folder.svelte';
import { datosIniciales, type HealthData } from './model';
import { HealthStore } from './store.svelte';

const ZONA = 'Europe/Madrid';
const HOY = todayIso();
const AYER = addDays(HOY, -1);

function datos(): HealthData {
  return {
    ...datosIniciales(ZONA),
    aplicaciones: [{ id: 'pedidos', nombre: 'Pedidos', consultas: {}, versiones: [] }],
  };
}

function entrada(filas: unknown[], extra: object = {}) {
  return JSON.stringify({
    format: 1,
    fuente: 'kibana',
    capturado: HOY,
    zona: ZONA,
    filas,
    ...extra,
  });
}

const fila = (dia: string, valor: number, metrica = '500', app = 'pedidos') => ({
  app,
  metrica,
  dia,
  valor,
});

/** A folder with the data already in it, and a store reading it. */
async function preparar(inicial: HealthData = datos()) {
  const dir = new MemoryDir('health');
  await new FolderDocBackend(dir, HEALTH_FORMAT, 'x').save(inicial);
  const store = new HealthStore();
  store.useBackend(new FolderDocBackend(dir, HEALTH_FORMAT, 'x'));
  return { dir, store };
}

const fotos = (m: Map<string, string>) => Object.fromEntries(m);

describe('la bandeja al leer la carpeta', () => {
  it('consolida sola una captura exacta y la borra, y dice cuántas filas', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 340)]));
    await store.init();

    expect(store.observacionesDe('pedidos')[0]).toMatchObject({ dia: AYER, valor: 340 });
    expect((await readAll(dir)).has('entrada-1.json')).toBe(false);
    expect(store.aviso).toContain('1 fila consolidada');
    expect(store.bandeja).toEqual([]);
  });

  it('los datos quedan escritos, en el fichero de su mes', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 340)]));
    await store.init();
    expect((await readAll(dir)).get(`obs-pedidos-${AYER.slice(0, 7)}.json`)).toContain(
      '"valor":340',
    );
  });

  it('dice qué filas ha ignorado y por qué', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 1), fila(HOY, 1)]));
    await store.init();
    expect(store.aviso).toMatch(/1 fila ignorada: 1 porque el día de la captura/);
  });

  it('deja un pantallazo pendiente de revisión, sin tocar los datos', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 340)], { fuente: 'pantallazo' }));
    await store.init();
    expect(store.observacionesDe('pedidos')).toEqual([]);
    expect(store.bandeja).toHaveLength(1);
    expect((await readAll(dir)).has('entrada-1.json')).toBe(true);
  });

  it('deja pendiente una captura con una aplicación desconocida, y no la crea', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 1), fila(AYER, 1, '500', 'otra')]));
    await store.init();
    expect(store.bandeja).toHaveLength(1);
    expect(store.observacionesDe('pedidos')).toEqual([]);
    expect(store.vigilada('otra')).toBeNull();
  });

  it('un JSON roto queda rechazado y el resto funciona', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', '{ roto');
    await writeText(dir, 'entrada-2.json', entrada([fila(AYER, 340)]));
    await store.init();
    expect(store.unavailable).toBeNull();
    expect(store.bandeja.map((e) => e.kind)).toEqual(['rechazada']);
    expect(store.observacionesDe('pedidos')).toHaveLength(1);
    expect((await readAll(dir)).has('entrada-1.json')).toBe(true);
  });

  it('una zona horaria distinta queda rechazada', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 340)], { zona: 'UTC' }));
    await store.init();
    expect(store.bandeja[0].kind).toBe('rechazada');
    expect(store.observacionesDe('pedidos')).toEqual([]);
  });

  it('una interrupción entre escribir y borrar no cambia ningún dato al repetir', async () => {
    const { dir, store } = await preparar();
    const texto = entrada([fila(AYER, 340)]);
    await writeText(dir, 'entrada-1.json', texto);
    await store.init();
    const tras = await readAll(dir);

    // La entrada sigue ahí, como si el proceso se hubiera cortado antes de borrarla.
    await writeText(dir, 'entrada-1.json', texto);
    const otra = new HealthStore();
    otra.useBackend(new FolderDocBackend(dir, HEALTH_FORMAT, 'x'));
    await otra.init();

    expect(fotos(await readAll(dir))).toEqual(fotos(tras));
  });

  it('si no se puede escribir, la entrada no se borra', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 340)]));
    const roto = new FolderDocBackend(dir, HEALTH_FORMAT, 'x');
    roto.save = async () => {
      throw new Error('disco lleno');
    };
    store.useBackend(roto);
    await store.init();
    expect((await readAll(dir)).has('entrada-1.json')).toBe(true);
    expect(store.saveError).toBe('disco lleno');
  });

  it('un fichero de datos ilegible deja Health Hub no disponible, y no escribe', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'obs-pedidos-2026-11.json', '<<<<<<< HEAD');
    const antes = await readAll(dir);
    await store.init();
    expect(store.unavailable?.why).toEqual({
      cause: 'fichero-ilegible',
      file: 'obs-pedidos-2026-11.json',
    });
    await store.flush();
    expect(fotos(await readAll(dir))).toEqual(fotos(antes));
  });
});

describe('revisar una entrada', () => {
  it('aplicar consolida y borra, y lo exacto se conserva', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 340)]));
    await store.init();
    await writeText(dir, 'entrada-2.json', entrada([fila(AYER, 999)], { fuente: 'pantallazo' }));
    await store.recargar();

    expect(store.bandeja).toHaveLength(1);
    await store.aplicarEntrada('entrada-2.json');
    expect(store.observacionesDe('pedidos')[0].valor).toBe(340);
    expect(store.aviso).toContain('ya hay un valor exacto');
    expect((await readAll(dir)).has('entrada-2.json')).toBe(false);
    expect(store.bandeja).toEqual([]);
  });

  it('descartar borra el fichero sin tocar los datos', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', '{ roto');
    await store.init();
    await store.descartarEntrada('entrada-1.json');
    expect((await readAll(dir)).has('entrada-1.json')).toBe(false);
    expect(store.bandeja).toEqual([]);
  });

  it('lo pendiente cuenta para el aviso de captura', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 340)], { fuente: 'pantallazo' }));
    await store.init();
    expect(store.filas[0].salud.captura?.restantes).toBe(6);
  });
});

describe('recargar', () => {
  it('recoge una entrada dejada con la app abierta', async () => {
    const { dir, store } = await preparar();
    await store.init();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 340)]));
    expect(store.observacionesDe('pedidos')).toEqual([]);
    await store.recargar();
    expect(store.observacionesDe('pedidos')).toHaveLength(1);
  });

  it('no reescribe ningún fichero si no hay cambios', async () => {
    const { dir, store } = await preparar();
    await store.init();
    const antes = await readAll(dir);
    await store.recargar();
    expect(fotos(await readAll(dir))).toEqual(fotos(antes));
    expect(store.aviso).toMatch(/nada nuevo/);
  });

  it('escribe antes lo que estaba editándose, para no perderlo', async () => {
    const { store } = await preparar();
    await store.init();
    store.renombrar('pedidos', 'Pedidos web');
    await store.recargar();
    expect(store.vigilada('pedidos')?.nombre).toBe('Pedidos web');
  });

  it('un fichero tocado fuera no se pisa al guardar otra cosa', async () => {
    const { dir, store } = await preparar();
    await store.init();
    const ajeno = (await readAll(dir)).get('app-pedidos.json')!;
    await writeText(dir, 'catalogo.json', (await readAll(dir)).get('catalogo.json')! + '\n');
    store.crear('Pagos');
    await store.flush();
    const tras = await readAll(dir);
    expect(tras.get('app-pedidos.json')).toBe(ajeno);
    expect(tras.get('catalogo.json')!.endsWith('\n\n')).toBe(true);
  });
});

describe('editar', () => {
  it('crear abre su panel y genera un identificador libre', async () => {
    const { store } = await preparar();
    await store.init();
    const app = store.crear('Pedidos');
    expect(app?.id).toBe('pedidos-2');
    expect(store.abierta).toBe('pedidos-2');
  });

  it('renombrar solo cambia el fichero de esa aplicación', async () => {
    const { dir, store } = await preparar();
    await store.init();
    const antes = await readAll(dir);
    store.renombrar('pedidos', 'Pedidos web');
    await store.flush();
    const tras = await readAll(dir);
    const cambiados = [...tras.keys()].filter((n) => tras.get(n) !== antes.get(n));
    expect(cambiados).toEqual(['app-pedidos.json']);
    expect(store.vigilada('pedidos')?.id).toBe('pedidos');
  });

  it('eliminar se lleva sus datos y vuelve al panel global', async () => {
    const { dir, store } = await preparar();
    await writeText(dir, 'entrada-1.json', entrada([fila(AYER, 340)]));
    await store.init();
    store.abrir('pedidos');
    store.eliminar('pedidos');
    await store.flush();
    expect(store.abierta).toBeNull();
    expect([...(await readAll(dir)).keys()].some((n) => n.includes('pedidos'))).toBe(false);
  });

  it('las versiones se añaden, se editan y se borran, y sin nota no guardan nota', async () => {
    const { store } = await preparar();
    await store.init();
    store.addVersion('pedidos', ' 4.2.0 ', '2026-11-03', 'pago');
    const [v] = store.vigilada('pedidos')!.versiones;
    expect(v).toMatchObject({ version: '4.2.0', dia: '2026-11-03', nota: 'pago' });

    store.updateVersion('pedidos', v.id, '4.2.1', '2026-11-04', '');
    const [e] = store.vigilada('pedidos')!.versiones;
    expect(e).toMatchObject({ version: '4.2.1', dia: '2026-11-04' });
    expect('nota' in e).toBe(false);

    store.deleteVersion('pedidos', v.id);
    expect(store.vigilada('pedidos')!.versiones).toEqual([]);
  });

  it('no acepta una versión sin nombre ni un día inválido', async () => {
    const { store } = await preparar();
    await store.init();
    store.addVersion('pedidos', '  ', '2026-11-03');
    store.addVersion('pedidos', '4.2.0', 'ayer');
    expect(store.vigilada('pedidos')!.versiones).toEqual([]);
  });

  it('una consulta vacía desaparece', async () => {
    const { store } = await preparar();
    await store.init();
    store.setConsulta('pedidos', '500', 'status:500');
    expect(store.vigilada('pedidos')!.consultas['500']).toBe('status:500');
    store.setConsulta('pedidos', '500', ' ');
    expect('500' in store.vigilada('pedidos')!.consultas).toBe(false);
  });

  it('cambiar de vista no toca la carpeta', async () => {
    const { dir, store } = await preparar();
    await store.init();
    const antes = await readAll(dir);
    store.abrir('pedidos');
    store.home();
    await store.flush();
    expect(fotos(await readAll(dir))).toEqual(fotos(antes));
  });

  it('sin carpeta no se puede crear nada', async () => {
    const store = new HealthStore();
    await store.init();
    expect(store.sinCarpeta).toBe(true);
    expect(store.crear('Pedidos')).toBeNull();
  });
});

class MemoryStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

class Deps implements FolderDeps {
  next: FolderDir | null = null;
  handles = new Map<string, FolderDir>();
  names = new Map<string, string>();
  supports() {
    return true;
  }
  async pick() {
    return this.next;
  }
  connectedName(appId: string) {
    return this.names.get(appId) ?? null;
  }
  async loadHandle(appId: string) {
    return this.handles.get(appId) ?? null;
  }
  async saveHandle(appId: string, dir: FolderDir, label = dir.name) {
    this.handles.set(appId, dir);
    this.names.set(appId, label);
  }
  async forgetHandle(appId: string) {
    this.handles.delete(appId);
    this.names.delete(appId);
  }
}

describe('la conexión de Health Hub', () => {
  let store: HealthStore;
  let deps: Deps;
  let folder: HealthFolder;
  let root: MemoryDir;

  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
    store = new HealthStore();
    deps = new Deps();
    folder = new HealthFolder(store, deps);
    root = new MemoryDir('repo');
    deps.next = root;
  });

  async function conectar() {
    const plan = await folder.choose();
    return { plan, out: await folder.confirm(plan) };
  }

  it('sin carpeta recordada, arranca sin carpeta y sin datos', async () => {
    await folder.start();
    expect(store.sinCarpeta).toBe(true);
    expect(store.ready).toBe(true);
    expect(store.data.aplicaciones).toEqual([]);
  });

  it('conectar a una carpeta nueva crea el marcador y el catálogo', async () => {
    await folder.start();
    const { plan, out } = await conectar();
    expect(plan.kind).toBe('dump');
    expect(out).toEqual({ ok: true });

    const health = (await subfolder(root, 'health'))!;
    const files = await readAll(health);
    expect(files.has(MARKER_FILE)).toBe(true);
    expect(JSON.parse(files.get('catalogo.json')!).metricas).toHaveLength(5);
    expect(store.sinCarpeta).toBe(false);
    expect(folder.folderName).toBe('repo/health');
  });

  it('conectar a una carpeta con datos los adopta', async () => {
    const dir = (await subfolder(root, 'health', true))!;
    await new FolderDocBackend(dir, HEALTH_FORMAT, 'x').save(datos());
    await folder.start();
    const { plan } = await conectar();
    expect(plan.kind).toBe('adopt');
    expect(store.vigilada('pedidos')?.nombre).toBe('Pedidos');
  });

  it('rechaza la carpeta de otra aplicación sin escribir', async () => {
    await writeText(root, MARKER_FILE, JSON.stringify({ app: 'links', format: 1 }));
    await folder.start();
    const plan = await folder.choose();
    expect(plan.kind).toBe('rejected');
    expect([...(await readAll(root)).keys()]).toEqual([MARKER_FILE]);
  });

  it('desconectar deja la carpeta intacta y ningún dato en memoria', async () => {
    await folder.start();
    await conectar();
    store.crear('Pedidos');
    await folder.disconnect();

    expect(store.sinCarpeta).toBe(true);
    expect(store.data.aplicaciones).toEqual([]);
    expect(store.abierta).toBeNull();
    const health = (await subfolder(root, 'health'))!;
    expect((await readAll(health)).has('app-pedidos.json')).toBe(true);
    expect(await removeFile(health, 'no-existe')).toBeUndefined();
  });

  it('no deja datos en el almacenamiento del navegador', async () => {
    await folder.start();
    await conectar();
    store.crear('Pedidos');
    await store.flush();
    expect((localStorage as unknown as MemoryStorage).m.size).toBe(0);
  });

  it('sin permiso conservado queda no disponible con esa causa', async () => {
    const dir = new MemoryDir('health');
    dir.queryPermission = async () => 'prompt';
    await deps.saveHandle('health', dir, 'repo/health');
    await folder.start();
    expect(store.unavailable?.why).toEqual({ cause: 'permiso' });
    expect(store.sinCarpeta).toBe(false);
  });
});
