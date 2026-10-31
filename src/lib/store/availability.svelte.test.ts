/**
 * Roadmaps tells apart a store that is empty from one it could not read
 * (`local-persistence`, «Un almacén que no se puede abrir se distingue de un
 * almacén vacío»; carpeta-roadmaps, D4).
 */

import { describe, it, expect } from 'vitest';
import { AppStore } from './app.svelte';
import type { DataSource, Prefs, RoadmapsBackend, RoadmapsLoad } from './storage';
import type { AppData } from '../model/types';

class Backend implements RoadmapsBackend, Prefs {
  saves: AppData[] = [];
  readonly pending = false;
  constructor(
    private outcome: RoadmapsLoad,
    readonly source: DataSource = 'folder',
  ) {}
  async load(): Promise<RoadmapsLoad> {
    return this.outcome;
  }
  async save(data: AppData): Promise<void> {
    this.saves.push(data);
  }
  async settled(): Promise<void> {}
  async getPref(): Promise<string | null> {
    return null;
  }
  async setPref(): Promise<void> {}
}

const unreadable: RoadmapsLoad = {
  kind: 'unavailable',
  reason: 'No se puede leer «roadmaps/rm-1.json».',
  why: { cause: 'fichero-ilegible', file: 'rm-1.json' },
};

async function boot(backend: Backend): Promise<AppStore> {
  const store = new AppStore(backend, backend);
  await store.init();
  return store;
}

describe('un almacén que no se puede leer', () => {
  it('no siembra el roadmap de ejemplo ni escribe nada', async () => {
    const backend = new Backend(unreadable);
    const store = await boot(backend);
    expect(store.ready).toBe(true);
    expect(store.unavailable?.why).toEqual({ cause: 'fichero-ilegible', file: 'rm-1.json' });
    expect(store.data.roadmaps).toEqual([]);
    expect(backend.saves).toHaveLength(0);
  });

  it('no deja crear un roadmap', async () => {
    const backend = new Backend(unreadable);
    const store = await boot(backend);
    expect(store.addRoadmap('Plataforma')).toBe(false);
    expect(store.data.roadmaps).toEqual([]);
  });

  it('no deja importar uno', async () => {
    const backend = new Backend(unreadable);
    const store = await boot(backend);
    store.importFromText(
      JSON.stringify({ format: 'roadmaps.v1', roadmap: { name: 'x', rows: [] } }),
    );
    expect(store.data.roadmaps).toEqual([]);
  });

  it('no guarda aunque algo pida guardar', async () => {
    const backend = new Backend(unreadable);
    const store = await boot(backend);
    store.addAssignee();
    store.scheduleSave();
    await store.flush();
    expect(backend.saves).toHaveLength(0);
  });
});

describe('un almacén vacío', () => {
  it('en el navegador siembra el ejemplo', async () => {
    const backend = new Backend({ kind: 'empty' }, 'browser');
    const store = await boot(backend);
    expect(store.data.roadmaps.length).toBeGreaterThan(0);
    expect(store.unavailable).toBeNull();
  });

  it('en una carpeta queda vacío y con el alta disponible', async () => {
    const backend = new Backend({ kind: 'empty' }, 'folder');
    const store = await boot(backend);
    expect(store.data.roadmaps).toEqual([]);
    expect(store.unavailable).toBeNull();
    expect(backend.saves).toHaveLength(0);
    expect(store.addRoadmap('Plataforma')).toBe(true);
  });
});
