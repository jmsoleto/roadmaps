/**
 * Store-level behavior of blockers: the catalog, assignments on items, and the
 * cross-roadmap operations (propagation and cascade delete).
 *
 * Kept apart from `app.svelte.test.ts` because these need a store with real
 * items in two roadmaps, which the roadmap-navigation tests there don't.
 */

import { describe, it, expect } from 'vitest';
import { AppStore } from './app.svelte';
import type { Storage } from './storage';
import type { AppData, Roadmap } from '../model/types';

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

/** One roadmap, one phase, one item — ids derived from `id` so they're addressable. */
function roadmapWithItem(id: string): Roadmap {
  return {
    id,
    name: id,
    colorSlot: 0,
    startDate: '2026-01-01',
    windowDays: 730,
    baselineDate: null,
    rows: [
      {
        id: `ph-${id}`,
        name: 'fase',
        colorSlot: 0,
        expanded: true,
        assigneeId: null,
        notes: '',
        startDate: null,
        endDate: null,
        children: [
          {
            id: `it-${id}`,
            label: 'item',
            colorSlot: 0,
            startDate: '2026-02-02',
            endDate: '2026-03-02',
            assigneeId: null,
            notes: '',
            dependsOn: [],
            blockers: [],
            isMilestone: false,
            completedDate: null,
            endAtCompletion: null,
            baselineEnd: null,
          },
        ],
      },
    ],
  };
}

/** Two roadmaps, so cross-roadmap behavior is exercised by default. */
async function storeWithItems() {
  const backend = new FakeStorage({
    roadmaps: [roadmapWithItem('a'), roadmapWithItem('b')],
    assignees: [],
    blockers: [],
    activeId: 'a',
  });
  const store = new AppStore(backend);
  await store.init();
  return { store, backend };
}

const itemOf = (store: AppStore, rmId: string) =>
  store.data.roadmaps.find((r) => r.id === rmId)!.rows[0].children[0];

/**
 * Assign a blocker to the item of a given roadmap.
 *
 * Item mutations resolve against the *active* roadmap, like every other one in
 * the store — in the app you always edit from the open roadmap's drawer — so
 * reaching into a second roadmap means opening it first.
 */
function assign(store: AppStore, rmId: string, blockerId: string, feature: string) {
  store.setActive(rmId);
  store.addItemBlocker(`ph-${rmId}`, `it-${rmId}`, blockerId, feature);
}

function resolveOn(store: AppStore, rmId: string, index: number, resolved: boolean) {
  store.setActive(rmId);
  store.setItemBlockerResolved(
    `ph-${rmId}`,
    `it-${rmId}`,
    itemOf(store, rmId).blockers[index].id,
    resolved,
  );
}

async function storeFrom(doc: unknown) {
  const backend = new FakeStorage(doc as AppData);
  const store = new AppStore(backend);
  await store.init();
  return store;
}

describe('catálogo de bloqueos', () => {
  it('da de alta un bloqueo y permite editar sus campos', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    store.updateBlocker(b.id, { name: 'Checkout', owner: 'Enrique', email: 'a@a.com' });
    expect(store.data.blockers).toEqual([
      { id: b.id, name: 'Checkout', owner: 'Enrique', email: 'a@a.com' },
    ]);
  });

  it('el correo es opcional', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    store.updateBlocker(b.id, { name: 'Legal', owner: 'Marta' });
    expect(store.data.blockers[0].email).toBe('');
  });

  it('editar el catálogo alcanza a los items que lo referencian', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    store.updateBlocker(b.id, { owner: 'Otra persona' });
    // El item guarda la referencia, no una copia.
    const ref = store.data.blockers.find((x) => x.id === itemOf(store, 'a').blockers[0].blockerId);
    expect(ref?.owner).toBe('Otra persona');
  });
});

describe('asignación de bloqueos a un item', () => {
  it('asigna varios al mismo item, cada uno con su funcionalidad', async () => {
    const { store } = await storeWithItems();
    const b1 = store.addBlocker();
    const b2 = store.addBlocker();
    assign(store, 'a', b1.id, 'formulario');
    assign(store, 'a', b2.id, 'pasarela');
    expect(itemOf(store, 'a').blockers.map((a) => a.feature)).toEqual(['formulario', 'pasarela']);
    expect(itemOf(store, 'a').blockers.every((a) => !a.resolved)).toBe(true);
  });

  it('ignora un bloqueo que no está en el catálogo', async () => {
    const { store } = await storeWithItems();
    assign(store, 'a', 'bl-inventado', 'x');
    expect(itemOf(store, 'a').blockers).toEqual([]);
  });

  it('retirar una asignación no toca el catálogo ni otros items', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    assign(store, 'b', b.id, 'formulario');
    store.setActive('a');
    store.removeItemBlocker('ph-a', 'it-a', itemOf(store, 'a').blockers[0].id);
    expect(itemOf(store, 'a').blockers).toEqual([]);
    expect(itemOf(store, 'b').blockers).toHaveLength(1);
    expect(store.data.blockers).toHaveLength(1);
  });

  it('asignar un bloqueo no altera las fechas del item', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    const { startDate, endDate } = itemOf(store, 'a');
    assign(store, 'a', b.id, 'formulario');
    expect(itemOf(store, 'a').startDate).toBe(startDate);
    expect(itemOf(store, 'a').endDate).toBe(endDate);
  });
});

describe('resolución', () => {
  it('resolver una asignación no toca las demás del mismo item', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    assign(store, 'a', b.id, 'pasarela');
    resolveOn(store, 'a', 0, true);
    expect(itemOf(store, 'a').blockers.map((a) => a.resolved)).toEqual([true, false]);
  });

  it('resolver conserva el registro', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    resolveOn(store, 'a', 0, true);
    expect(itemOf(store, 'a').blockers).toHaveLength(1);
    expect(itemOf(store, 'a').blockers[0].feature).toBe('formulario');
  });

  it('se puede deshacer una resolución', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    const id = itemOf(store, 'a').blockers[0].id;
    store.setItemBlockerResolved('ph-a', 'it-a', id, true);
    store.setItemBlockerResolved('ph-a', 'it-a', id, false);
    expect(itemOf(store, 'a').blockers[0].resolved).toBe(false);
  });
});

describe('propagación entre roadmaps', () => {
  it('cuenta las equivalentes pendientes de otro roadmap', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'Formulario de compra');
    assign(store, 'b', b.id, '  formulario de COMPRA ');
    const target = itemOf(store, 'a').blockers[0];
    expect(store.unresolvedEquivalents(b.id, target.feature, target.id)).toBe(1);
  });

  it('propagar marca las equivalentes de todos los roadmaps', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'Formulario de compra');
    assign(store, 'b', b.id, 'formulario de compra');
    store.resolveEquivalentBlockers(b.id, 'Formulario de compra');
    expect(itemOf(store, 'a').blockers[0].resolved).toBe(true);
    expect(itemOf(store, 'b').blockers[0].resolved).toBe(true);
  });

  it('propagar no toca funcionalidades distintas del mismo bloqueo', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    assign(store, 'b', b.id, 'pasarela 3DS');
    store.resolveEquivalentBlockers(b.id, 'formulario');
    expect(itemOf(store, 'b').blockers[0].resolved).toBe(false);
  });

  it('resolver una sola no arrastra a las equivalentes', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    assign(store, 'b', b.id, 'formulario');
    resolveOn(store, 'a', 0, true);
    expect(itemOf(store, 'b').blockers[0].resolved).toBe(false);
  });

  it('sugiere las funcionalidades ya usadas con ese bloqueo', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'Formulario de compra');
    assign(store, 'b', b.id, 'Pasarela 3DS');
    expect(store.blockerFeatureSuggestions(b.id)).toEqual(['Formulario de compra', 'Pasarela 3DS']);
  });
});

describe('borrado en cascada del catálogo', () => {
  it('retira las asignaciones de todos los roadmaps', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    const otro = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    assign(store, 'b', b.id, 'formulario');
    assign(store, 'b', otro.id, 'otra cosa');
    store.deleteBlocker(b.id);
    expect(store.data.blockers.map((x) => x.id)).toEqual([otro.id]);
    expect(itemOf(store, 'a').blockers).toEqual([]);
    expect(itemOf(store, 'b').blockers.map((a) => a.blockerId)).toEqual([otro.id]);
  });

  it('cuenta los items afectados antes de borrar', async () => {
    const { store } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    assign(store, 'a', b.id, 'pasarela');
    assign(store, 'b', b.id, 'otra');
    // Dos asignaciones en 'a' cuentan como un item.
    expect(store.blockerUsage(b.id)).toBe(2);
  });

  it('persiste el resultado del borrado', async () => {
    const { store, backend } = await storeWithItems();
    const b = store.addBlocker();
    assign(store, 'a', b.id, 'formulario');
    store.deleteBlocker(b.id);
    await store.flush();
    expect(backend.saved?.blockers).toEqual([]);
    expect(backend.saved?.roadmaps[0].rows[0].children[0].blockers).toEqual([]);
  });
});

describe('carga de documentos sin bloqueos', () => {
  it('normaliza un documento anterior al cambio', async () => {
    const rm = roadmapWithItem('a') as unknown as {
      rows: { children: Record<string, unknown>[] }[];
    };
    delete rm.rows[0].children[0].blockers;
    const store = await storeFrom({ roadmaps: [rm], assignees: [], activeId: 'a' });
    expect(store.data.blockers).toEqual([]);
    expect(store.data.roadmaps[0].rows[0].children[0].blockers).toEqual([]);
  });

  it('descarta asignaciones cuyo bloqueo no está en el catálogo', async () => {
    const rm = roadmapWithItem('a');
    rm.rows[0].children[0].blockers = [
      { id: 'ib1', blockerId: 'bl-fantasma', feature: 'x', resolved: false },
      { id: 'ib2', blockerId: 'bl-real', feature: 'y', resolved: false },
    ];
    const store = await storeFrom({
      roadmaps: [rm],
      assignees: [],
      blockers: [{ id: 'bl-real', name: 'Real', owner: 'Quien sea', email: '' }],
      activeId: 'a',
    });
    expect(store.data.roadmaps[0].rows[0].children[0].blockers.map((a) => a.blockerId)).toEqual([
      'bl-real',
    ]);
  });

  it('deja intacto un documento que ya declara bloqueos', async () => {
    const rm = roadmapWithItem('a');
    rm.rows[0].children[0].blockers = [
      { id: 'ib1', blockerId: 'bl-real', feature: 'formulario', resolved: true },
    ];
    const store = await storeFrom({
      roadmaps: [rm],
      assignees: [],
      blockers: [{ id: 'bl-real', name: 'Real', owner: 'Ana', email: '' }],
      activeId: 'a',
    });
    expect(store.data.roadmaps[0].rows[0].children[0].blockers).toEqual([
      { id: 'ib1', blockerId: 'bl-real', feature: 'formulario', resolved: true },
    ]);
  });

  it('la normalización se consolida en el siguiente guardado', async () => {
    const rm = roadmapWithItem('a') as unknown as {
      rows: { children: Record<string, unknown>[] }[];
    };
    delete rm.rows[0].children[0].blockers;
    const backend = new FakeStorage({ roadmaps: [rm], assignees: [], activeId: 'a' } as never);
    const store = new AppStore(backend);
    await store.init();
    store.renameRoadmap('a', 'otro');
    await store.flush();
    expect(backend.saved?.blockers).toEqual([]);
    expect(backend.saved?.roadmaps[0].rows[0].children[0].blockers).toEqual([]);
  });
});
