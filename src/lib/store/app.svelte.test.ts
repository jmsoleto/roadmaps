import { describe, it, expect } from 'vitest';
import { AppStore } from './app.svelte';
import type { Storage } from './storage';
import type { AppData } from '../model/types';
import { exportRoadmap } from '../io/portability';

/** In-memory backend so the store can be exercised without a real localStorage. */
class FakeStorage implements Storage {
  saved: AppData | null = null;
  constructor(private initial: AppData | null = null) {}
  async load(): Promise<AppData | null> {
    return this.initial;
  }
  async save(data: AppData): Promise<void> {
    this.saved = data;
  }
  async getPref(): Promise<string | null> {
    return null;
  }
  async setPref(): Promise<void> {}
}

const roadmap = (id: string) => ({
  id,
  name: id,
  startDate: '2026-01-01',
  windowDays: 730,
  baselineDate: null,
  rows: [],
});

const dataWith = (ids: string[], activeId: string | null): AppData => ({
  roadmaps: ids.map(roadmap),
  assignees: [{ id: 'as1', name: 'Ana', colorSlot: 0 }],
  blockers: [],
  activeId,
});

async function storeWith(ids: string[], activeId: string | null) {
  const backend = new FakeStorage(dataWith(ids, activeId));
  const store = new AppStore(backend);
  await store.init();
  return { store, backend };
}

describe('vista de arranque', () => {
  it('arranca en "Todos" aunque haya un roadmap activo persistido', async () => {
    const { store } = await storeWith(['a', 'b'], 'b');
    expect(store.metaView).toBe(true);
    // El activo persistido sobrevive: es "el último abierto", no la vista.
    expect(store.data.activeId).toBe('b');
  });

  it('arranca en "Todos" sin ningún roadmap', async () => {
    const backend = new FakeStorage({
      roadmaps: [],
      assignees: [],
      blockers: [],
      activeId: null,
    });
    const store = new AppStore(backend);
    await store.init();
    expect(store.metaView).toBe(true);
    expect(store.activeRoadmap).toBeNull();
  });

  it('abrir un roadmap sale de "Todos"', async () => {
    const { store } = await storeWith(['a', 'b'], 'a');
    store.setActive('b');
    expect(store.metaView).toBe(false);
    expect(store.data.activeId).toBe('b');
  });

  it('borrar desde "Todos" deja al usuario en "Todos"', async () => {
    const { store } = await storeWith(['a', 'b'], 'a');
    store.deleteRoadmap('a');
    expect(store.metaView).toBe(true);
    expect(store.data.activeId).toBe('b');
  });
});

describe('addRoadmap', () => {
  it('crea el roadmap, lo activa y sale de "Todos"', async () => {
    const { store } = await storeWith(['a'], 'a');
    expect(store.addRoadmap('Plataforma')).toBe(true);
    expect(store.data.roadmaps.map((r) => r.name)).toEqual(['a', 'Plataforma']);
    expect(store.data.activeId).toBe(store.data.roadmaps[1].id);
    expect(store.metaView).toBe(false);
  });

  it('guarda el nombre tal como se escribió, con acentos y mayúsculas', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Diseño de Producto');
    expect(store.data.roadmaps[0].name).toBe('Diseño de Producto');
  });

  it('rechaza un nombre vacío', async () => {
    const { store } = await storeWith(['a'], 'a');
    expect(store.addRoadmap('')).toBe(false);
    expect(store.roadmapNameError('')).toEqual({ kind: 'empty' });
  });

  it('rechaza un nombre de solo espacios', async () => {
    const { store } = await storeWith(['a'], 'a');
    expect(store.addRoadmap('   ')).toBe(false);
    expect(store.roadmapNameError('  \t ')).toEqual({ kind: 'empty' });
  });

  it('rechaza un nombre idéntico a uno existente', async () => {
    const { store } = await storeWith(['a'], 'a');
    store.addRoadmap('Plataforma');
    expect(store.addRoadmap('Plataforma')).toBe(false);
  });

  it('rechaza un nombre que solo difiere en mayúsculas', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Plataforma');
    expect(store.addRoadmap('plataforma')).toBe(false);
  });

  it('rechaza un nombre que solo difiere en acentos', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Diseño');
    expect(store.addRoadmap('Diseno')).toBe(false);
  });

  it('rechaza un nombre que solo difiere en espacios', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Plan Q1');
    expect(store.addRoadmap('PlanQ1')).toBe(false);
    expect(store.addRoadmap('  Plan  Q1  ')).toBe(false);
  });

  it('informa de con qué roadmap choca, con su nombre literal', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Diseño de Producto');
    expect(store.roadmapNameError('diseno de producto')).toEqual({
      kind: 'duplicate',
      existing: 'Diseño de Producto',
    });
  });

  it('acepta un nombre distinto bajo la clave de comparación', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Plataforma');
    expect(store.addRoadmap('Plataforma 2')).toBe(true);
    expect(store.data.roadmaps).toHaveLength(2);
  });

  it('un rechazo no muta nada: ni la lista, ni el activo, ni la vista', async () => {
    const { store } = await storeWith(['a', 'b'], 'b');
    expect(store.metaView).toBe(true);
    expect(store.addRoadmap('a')).toBe(false);
    expect(store.data.roadmaps.map((r) => r.name)).toEqual(['a', 'b']);
    expect(store.data.activeId).toBe('b');
    expect(store.metaView).toBe(true);
  });

  it('persiste el roadmap creado', async () => {
    const { store, backend } = await storeWith([], null);
    store.addRoadmap('Mobile Q1');
    await store.flush();
    expect(backend.saved?.roadmaps.map((r) => r.name)).toEqual(['Mobile Q1']);
  });
});

describe('alcance de la unicidad de nombres', () => {
  // Límite deliberado: la unicidad solo se exige en el alta. Este test fija
  // ese hueco para que cerrarlo sea una decisión y no un efecto colateral.
  it('renombrar no comprueba la unicidad y puede dejar dos nombres iguales', async () => {
    const { store } = await storeWith(['a', 'b'], 'a');
    store.renameRoadmap('b', 'a');
    expect(store.data.roadmaps.map((r) => r.name)).toEqual(['a', 'a']);
  });

  it('importar no comprueba la unicidad', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Plataforma');
    const doc = exportRoadmap({ ...roadmap('otro'), name: 'Plataforma' }, [], []);
    store.importFromText(doc);
    expect(store.data.roadmaps.map((r) => r.name)).toEqual(['Plataforma', 'Plataforma']);
  });

  it('cargar datos con nombres repetidos no los altera', async () => {
    const backend = new FakeStorage({
      roadmaps: [
        { ...roadmap('r1'), name: 'Plataforma' },
        { ...roadmap('r2'), name: 'Plataforma' },
      ],
      assignees: [],
      blockers: [],
      activeId: 'r1',
    });
    const store = new AppStore(backend);
    await store.init();
    expect(store.data.roadmaps.map((r) => r.name)).toEqual(['Plataforma', 'Plataforma']);
  });
});

describe('renameRoadmap', () => {
  it('renombra el roadmap indicado y no toca los demás', async () => {
    const { store } = await storeWith(['a', 'b'], 'a');
    store.renameRoadmap('a', 'Plataforma 2026');
    expect(store.data.roadmaps.map((r) => r.name)).toEqual(['Plataforma 2026', 'b']);
  });

  it('ignora un id que no existe', async () => {
    const { store } = await storeWith(['a', 'b'], 'a');
    store.renameRoadmap('zzz', 'x');
    expect(store.data.roadmaps.map((r) => r.name)).toEqual(['a', 'b']);
  });

  it('persiste el nombre nuevo', async () => {
    const { store, backend } = await storeWith(['a'], 'a');
    store.renameRoadmap('a', 'Mobile Q1');
    await store.flush();
    expect(backend.saved?.roadmaps.map((r) => r.name)).toEqual(['Mobile Q1']);
  });
});

describe('deleteRoadmap', () => {
  it('elimina un roadmap inactivo y mantiene el activo', async () => {
    const { store } = await storeWith(['a', 'b', 'c'], 'a');
    store.deleteRoadmap('b');
    expect(store.data.roadmaps.map((r) => r.id)).toEqual(['a', 'c']);
    expect(store.data.activeId).toBe('a');
  });

  it('reasigna el activo al borrar el roadmap activo', async () => {
    const { store } = await storeWith(['a', 'b', 'c'], 'b');
    store.deleteRoadmap('b');
    expect(store.data.roadmaps.map((r) => r.id)).toEqual(['a', 'c']);
    expect(store.data.activeId).toBe('a');
    expect(store.activeRoadmap?.id).toBe('a');
  });

  it('deja activeId a null al borrar el último roadmap', async () => {
    const { store } = await storeWith(['a'], 'a');
    store.deleteRoadmap('a');
    expect(store.data.roadmaps).toEqual([]);
    expect(store.data.activeId).toBeNull();
    expect(store.activeRoadmap).toBeNull();
  });

  it('ignora un id que no existe', async () => {
    const { store } = await storeWith(['a', 'b'], 'a');
    store.deleteRoadmap('zzz');
    expect(store.data.roadmaps.map((r) => r.id)).toEqual(['a', 'b']);
    expect(store.data.activeId).toBe('a');
  });

  it('no toca los responsables globales', async () => {
    const { store } = await storeWith(['a', 'b'], 'a');
    store.deleteRoadmap('a');
    expect(store.data.assignees.map((a) => a.id)).toEqual(['as1']);
  });

  it('persiste el borrado', async () => {
    const { store, backend } = await storeWith(['a', 'b'], 'a');
    store.deleteRoadmap('a');
    await store.flush();
    expect(backend.saved?.roadmaps.map((r) => r.id)).toEqual(['b']);
    expect(backend.saved?.activeId).toBe('b');
  });
});
