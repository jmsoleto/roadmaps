import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hubApp } from './registry';
import { HEALTH_ID } from './apps';
import { folderUi, unavailableActions } from './folders';
import { isUnreadable } from './types';
import { FolderDocBackend, UnavailableDocBackend } from '../folder/doc-backend';
import { MemoryDir } from '../folder/memory-fs';
import { HEALTH_FORMAT } from '../health/folder-format';
import { datosIniciales, type HealthData } from '../health/model';
import { health } from '../health/store.svelte';

const app = () => hubApp(HEALTH_ID)!;
const labels = () => app().actions!().map((a) => a.label);
const accion = (label: string) => app().actions!().find((a) => a.label === label)!;

async function conectar() {
  const dir = new MemoryDir('health');
  const inicial: HealthData = {
    ...datosIniciales('Europe/Madrid'),
    aplicaciones: [{ id: 'pedidos', nombre: 'Pedidos', consultas: {}, versiones: [] }],
  };
  await new FolderDocBackend(dir, HEALTH_FORMAT, 'x').save(inicial);
  health.useBackend(new FolderDocBackend(dir, HEALTH_FORMAT, 'x'));
  await health.init();
}

describe('Health Hub en el registro', () => {
  beforeEach(async () => {
    health.useBackend(null);
    await health.init();
  });

  it('tiene pantalla propia y segundo nivel de breadcrumb', () => {
    expect(app().root).not.toBeNull();
    expect(app().context).not.toBeNull();
  });

  it('sin carpeta, la tarjeta lo dice sin cifras y sin ofrecer conceder', () => {
    const s = app().summary!();
    expect(isUnreadable(s)).toBe(true);
    if (isUnreadable(s)) {
      expect(s.reason).toMatch(/carpeta/);
      expect(s.grant).toBeUndefined();
    }
  });

  it('sin carpeta, solo se puede ir a conectarla', () => {
    expect(accion('+ aplicación').disabled).toBe(true);
    expect(accion('↻ recargar').disabled).toBe(true);
    expect(accion('⧉ carpeta').disabled).toBeFalsy();
  });

  it('abriendo, la tarjeta tampoco enseña ceros', () => {
    health.expectFolder();
    const s = app().summary!();
    expect(isUnreadable(s) && s.reason).toMatch(/Abriendo/);
  });

  it('con el permiso pendiente, la tarjeta ofrece concederlo', async () => {
    health.useBackend(new UnavailableDocBackend('sin permiso', { cause: 'permiso' }));
    await health.init();
    const s = app().summary!();
    expect(isUnreadable(s) && s.grant).toBeTypeOf('function');
  });

  it('con un fichero ilegible, la tarjeta no ofrece conceder', async () => {
    health.useBackend(
      new UnavailableDocBackend('ilegible', { cause: 'fichero-ilegible', file: 'catalogo.json' }),
    );
    await health.init();
    const s = app().summary!();
    expect(isUnreadable(s) && s.grant).toBeUndefined();
    expect(accion('⧉ carpeta').disabled).toBeFalsy();
  });

  it('conectado, la tarjeta da sus tres cifras', async () => {
    await conectar();
    const s = app().summary!();
    if (isUnreadable(s)) throw new Error('debía tener cifras');
    expect(s.stats.map((x) => x.label)).toEqual(['empeoran', 'captura pendiente', 'por revisar']);
    expect(s.list.rows[0].label).toBe('Pedidos');
  });

  it('«+ versión» solo aparece dentro de una aplicación vigilada', async () => {
    await conectar();
    expect(labels()).not.toContain('+ versión');
    health.abrir('pedidos');
    expect(labels()).toContain('+ versión');
  });

  it('abrir una fila de la tarjeta lleva a su panel', async () => {
    await conectar();
    vi.stubGlobal('window', { location: { hash: '' } });
    try {
      app().openRow!('pedidos');
      expect(health.abierta).toBe('pedidos');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('el diálogo de carpeta no promete copiar nada del navegador', () => {
    const ui = folderUi(HEALTH_ID)!;
    expect(ui.onlyFolder).toBeDefined();
    expect(ui.inBrowser().count).toBe(0);
  });

  it('las demás aplicaciones no cambian de diálogo', () => {
    expect(folderUi('links')!.onlyFolder).toBeUndefined();
    expect(folderUi('roadmaps')!.onlyFolder).toBeUndefined();
    expect(folderUi('api')!.onlyFolder).toBeUndefined();
  });

  it('la pantalla no disponible ofrece conceder o reintentar, y desconectar', () => {
    const permiso = unavailableActions(HEALTH_ID, { cause: 'permiso' }, 'folder');
    expect(permiso.map((a) => a.label)).toEqual(['conceder acceso', 'desconectar']);
    const roto = unavailableActions(HEALTH_ID, { cause: 'carpeta-ausente' }, 'folder');
    expect(roto.map((a) => a.label)).toEqual(['reintentar', 'desconectar']);
  });
});
