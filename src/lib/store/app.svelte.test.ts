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
  colorSlot: 0,
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

// ---- reordenación vertical ----

const it_ = (id: string, over: Partial<import('../model/types').Item> = {}) => ({
  id,
  label: id,
  colorSlot: 0,
  startDate: '2026-02-02',
  endDate: '2026-02-06',
  assigneeId: null,
  notes: '',
  dependsOn: [] as string[],
  blockers: [],
  isMilestone: false,
  completedDate: null,
  endAtCompletion: null,
  baselineEnd: null,
  ...over,
});

const ph = (id: string, children: ReturnType<typeof it_>[]) => ({
  id,
  name: id,
  colorSlot: 0,
  expanded: true,
  assigneeId: null,
  notes: '',
  startDate: null,
  endDate: null,
  children,
});

/** A store on one active roadmap holding the given phases. */
async function storeWithRows(rows: ReturnType<typeof ph>[]) {
  const data: AppData = {
    roadmaps: [{ ...roadmap('r'), rows }],
    assignees: [],
    blockers: [],
    activeId: 'r',
  };
  const store = new AppStore(new FakeStorage(data));
  await store.init();
  return store;
}

const phaseIds = (store: AppStore) => store.activeRoadmap!.rows.map((p) => p.id);
const itemIds = (store: AppStore, phaseId: string) =>
  store.activeRoadmap!.rows.find((p) => p.id === phaseId)!.children.map((c) => c.id);

describe('movePhase', () => {
  it('coloca la fase en la posición pedida', async () => {
    const store = await storeWithRows([ph('a', []), ph('b', []), ph('c', [])]);
    store.movePhase('a', 2);
    expect(phaseIds(store)).toEqual(['b', 'c', 'a']);
  });

  it('mueve la fase hacia atrás igual que hacia delante', async () => {
    const store = await storeWithRows([ph('a', []), ph('b', []), ph('c', [])]);
    store.movePhase('c', 0);
    expect(phaseIds(store)).toEqual(['c', 'a', 'b']);
  });

  it('la fase se lleva sus items consigo', async () => {
    const store = await storeWithRows([ph('a', [it_('a0'), it_('a1')]), ph('b', [])]);
    store.movePhase('a', 1);
    expect(phaseIds(store)).toEqual(['b', 'a']);
    expect(itemIds(store, 'a')).toEqual(['a0', 'a1']);
  });

  it('ignora un índice fuera de rango y un id desconocido', async () => {
    const store = await storeWithRows([ph('a', []), ph('b', [])]);
    store.movePhase('a', 5);
    store.movePhase('a', -1);
    store.movePhase('zzz', 1);
    expect(phaseIds(store)).toEqual(['a', 'b']);
  });
});

describe('moveItem', () => {
  it('coloca el item en la posición pedida dentro de su fase', async () => {
    const store = await storeWithRows([ph('a', [it_('a0'), it_('a1'), it_('a2')])]);
    store.moveItem('a', 'a0', 2);
    expect(itemIds(store, 'a')).toEqual(['a1', 'a2', 'a0']);
  });

  it('no toca las demás fases', async () => {
    const store = await storeWithRows([
      ph('a', [it_('a0'), it_('a1')]),
      ph('b', [it_('b0'), it_('b1')]),
    ]);
    store.moveItem('a', 'a0', 1);
    expect(itemIds(store, 'b')).toEqual(['b0', 'b1']);
  });

  it('ignora un índice fuera de rango y un id desconocido', async () => {
    const store = await storeWithRows([ph('a', [it_('a0'), it_('a1')])]);
    store.moveItem('a', 'a0', 9);
    store.moveItem('a', 'nope', 1);
    store.moveItem('nope', 'a0', 1);
    expect(itemIds(store, 'a')).toEqual(['a0', 'a1']);
  });
});

describe('reordenar no altera nada más que el orden', () => {
  it('conserva las fechas de todo lo que se mueve y de lo que se aparta', async () => {
    const store = await storeWithRows([
      ph('a', [
        it_('a0', { startDate: '2026-03-02', endDate: '2026-03-06' }),
        it_('a1', { startDate: '2026-04-01', endDate: '2026-04-10' }),
        it_('a2', { startDate: '2026-05-04', endDate: '2026-05-08' }),
      ]),
    ]);
    const before = exportRoadmap(store.activeRoadmap!, store.data.assignees, store.data.blockers);
    store.moveItem('a', 'a2', 0);
    const after = exportRoadmap(store.activeRoadmap!, store.data.assignees, store.data.blockers);
    // Mismas fechas, otro orden: lo exportado solo difiere en la permutación.
    const dates = (json: string) =>
      JSON.parse(json)
        .roadmap.rows[0].children.map((c: { startDate: string; endDate: string }) => [
          c.startDate,
          c.endDate,
        ])
        .sort();
    expect(dates(after)).toEqual(dates(before));
    expect(itemIds(store, 'a')).toEqual(['a2', 'a0', 'a1']);
  });

  it('deja intacto dependsOn y no dispara ninguna cascada', async () => {
    // a1 depende de a0 y arranca *antes* de que a0 termine: un estado que una
    // pasada de enforceConstraints corregiría. Reordenar no debe provocarla.
    const store = await storeWithRows([
      ph('a', [
        it_('a0', { startDate: '2026-03-02', endDate: '2026-03-20' }),
        it_('a1', { startDate: '2026-03-03', endDate: '2026-03-10', dependsOn: ['a0'] }),
      ]),
    ]);
    store.moveItem('a', 'a1', 0);
    const a1 = store.activeRoadmap!.rows[0].children.find((c) => c.id === 'a1')!;
    expect(a1.dependsOn).toEqual(['a0']);
    expect(a1.startDate).toBe('2026-03-03');
    expect(a1.endDate).toBe('2026-03-10');
  });

  it('mueve un item completado conservando sus fechas y sus referencias', async () => {
    const store = await storeWithRows([
      ph('a', [
        it_('a0'),
        it_('a1', {
          startDate: '2026-03-02',
          endDate: '2026-03-06',
          completedDate: '2026-03-09',
          endAtCompletion: '2026-03-06',
          baselineEnd: '2026-03-04',
        }),
      ]),
    ]);
    store.moveItem('a', 'a1', 0);
    const a1 = store.activeRoadmap!.rows[0].children[0];
    expect(a1.id).toBe('a1');
    expect(a1.completedDate).toBe('2026-03-09');
    expect(a1.endAtCompletion).toBe('2026-03-06');
    expect(a1.baselineEnd).toBe('2026-03-04');
    expect([a1.startDate, a1.endDate]).toEqual(['2026-03-02', '2026-03-06']);
  });

  it('el orden sobrevive a exportar e importar', async () => {
    const store = await storeWithRows([
      ph('a', [it_('a0'), it_('a1'), it_('a2')]),
      ph('b', [it_('b0')]),
    ]);
    store.movePhase('b', 0);
    store.moveItem('a', 'a2', 0);
    const doc = exportRoadmap(store.activeRoadmap!, store.data.assignees, store.data.blockers);
    store.importFromText(doc);
    const imported = store.activeRoadmap!;
    expect(imported.rows.map((p) => p.name)).toEqual(['b', 'a']);
    expect(imported.rows[1].children.map((c) => c.label)).toEqual(['a2', 'a0', 'a1']);
  });

  it('persiste el nuevo orden', async () => {
    const backend = new FakeStorage({
      roadmaps: [{ ...roadmap('r'), rows: [ph('a', []), ph('b', [])] }],
      assignees: [],
      blockers: [],
      activeId: 'r',
    });
    const store = new AppStore(backend);
    await store.init();
    store.movePhase('b', 0);
    await store.flush();
    expect(backend.saved!.roadmaps[0].rows.map((p) => p.id)).toEqual(['b', 'a']);
  });
});

// ---- el color del roadmap ----

describe('slot de color del roadmap', () => {
  /** Build a store from a raw document, bypassing the typed fixtures. */
  async function storeFrom(doc: unknown) {
    const store = new AppStore(new FakeStorage(doc as AppData));
    await store.init();
    return store;
  }

  /** The same document a version without roadmap colours would have written. */
  const legacyDoc = (ids: string[]) => ({
    roadmaps: ids.map((id) => {
      const rm = roadmap(id) as unknown as { colorSlot?: unknown };
      delete rm.colorSlot;
      return rm;
    }),
    assignees: [],
    blockers: [],
    activeId: ids[0] ?? null,
  });

  it('rellena el slot por la posición, que es de donde salía el color', async () => {
    const store = await storeFrom(legacyDoc(['a', 'b', 'c']));
    expect(store.data.roadmaps.map((r) => r.colorSlot)).toEqual([0, 1, 2]);
  });

  it('no reasigna el de un documento que ya lo trae', async () => {
    const store = await storeFrom({
      roadmaps: [
        { ...roadmap('a'), colorSlot: 7 },
        { ...roadmap('b'), colorSlot: 2 },
      ],
      assignees: [],
      blockers: [],
      activeId: 'a',
    });
    expect(store.data.roadmaps.map((r) => r.colorSlot)).toEqual([7, 2]);
  });

  it('la normalización no fuerza por sí misma un guardado', async () => {
    const backend = new FakeStorage(legacyDoc(['a', 'b']) as never);
    const store = new AppStore(backend);
    await store.init();
    expect(backend.saved).toBeNull();

    // ...pero se consolida en el siguiente guardado del uso normal.
    store.renameRoadmap('a', 'otro');
    await store.flush();
    expect(backend.saved?.roadmaps.map((r) => r.colorSlot)).toEqual([0, 1]);
  });

  it('un roadmap nuevo recibe la siguiente posición de la paleta', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Uno');
    store.addRoadmap('Dos');
    expect(store.data.roadmaps.map((r) => r.colorSlot)).toEqual([0, 1]);
  });

  it('borrar un roadmap no cambia el color de los demás', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Uno');
    store.addRoadmap('Dos');
    store.addRoadmap('Tres');
    const antes = store.data.roadmaps.map((r) => [r.name, r.colorSlot]);
    store.deleteRoadmap(store.data.roadmaps[0].id);
    expect(store.data.roadmaps.map((r) => [r.name, r.colorSlot])).toEqual(antes.slice(1));
  });

  it('reordenar no cambia el color de nadie', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Uno');
    store.addRoadmap('Dos');
    store.addRoadmap('Tres');
    const antes = new Map(store.data.roadmaps.map((r) => [r.name, r.colorSlot]));
    store.moveRoadmap(store.data.roadmaps[2].id, 0);
    expect(store.data.roadmaps.map((r) => r.name)).toEqual(['Tres', 'Uno', 'Dos']);
    for (const rm of store.data.roadmaps) expect(rm.colorSlot).toBe(antes.get(rm.name));
  });

  it('importar respeta el slot que trae el documento', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Uno');
    const doc = exportRoadmap({ ...roadmap('x'), name: 'Traído', colorSlot: 6 }, [], []);
    store.importFromText(doc);
    expect(store.activeRoadmap!.colorSlot).toBe(6);
  });

  it('importar un documento sin slot lo toma de la posición de destino', async () => {
    const { store } = await storeWith([], null);
    store.addRoadmap('Uno');
    store.addRoadmap('Dos');
    const raw = JSON.parse(exportRoadmap({ ...roadmap('x'), name: 'Traído' }, [], []));
    delete raw.roadmap.colorSlot;
    store.importFromText(JSON.stringify(raw));
    // Entra el tercero, así que le toca el slot 2 — no el 0 que daría el índice
    // dentro de su propio documento.
    expect(store.activeRoadmap!.colorSlot).toBe(2);
  });
});
