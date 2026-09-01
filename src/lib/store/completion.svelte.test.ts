/**
 * Store-level behavior of completion: rule B, the cascade that undoes it, the
 * four freeze doors, and the roadmap baseline.
 *
 * Kept apart from `app.svelte.test.ts` because these need a phase with a real
 * dependency chain, which the roadmap-navigation tests there don't.
 */

import { describe, it, expect } from 'vitest';
import { AppStore } from './app.svelte';
import type { Storage } from './storage';
import type { AppData, Item, Roadmap } from '../model/types';
import { todayIso, addDays } from '../time/timeline';

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

function item(id: string, start: string, end: string, deps: string[] = []): Item {
  return {
    id,
    label: id,
    colorSlot: 0,
    startDate: start,
    endDate: end,
    assigneeId: null,
    notes: '',
    dependsOn: deps,
    blockers: [],
    isMilestone: false,
    completedDate: null,
    endAtCompletion: null,
    baselineEnd: null,
  };
}

/** One roadmap, one phase `ph`, whatever items the test needs. */
function roadmapWith(children: Item[]): Roadmap {
  return {
    id: 'r',
    name: 'r',
    colorSlot: 0,
    startDate: '2026-01-01',
    windowDays: 730,
    baselineDate: null,
    rows: [
      {
        id: 'ph',
        name: 'fase',
        colorSlot: 0,
        expanded: true,
        assigneeId: null,
        notes: '',
        startDate: null,
        endDate: null,
        children,
      },
    ],
  };
}

async function storeWith(children: Item[]) {
  const store = new AppStore(
    new FakeStorage({
      roadmaps: [roadmapWith(children)],
      assignees: [],
      blockers: [],
      activeId: 'r',
    }),
  );
  await store.init();
  const find = (id: string) => store.data.roadmaps[0].rows[0].children.find((c) => c.id === id)!;
  return { store, find };
}

/** A chain a -> b -> c, all open, none overlapping. */
const chain = () => [
  item('a', '2026-01-05', '2026-01-16'),
  item('b', '2026-01-19', '2026-01-30', ['a']),
  item('c', '2026-02-02', '2026-02-13', ['b']),
];

describe('completeItem', () => {
  it('completa un item sin predecesores y congela su fin', async () => {
    const { store, find } = await storeWith(chain());
    expect(store.completeItem('ph', 'a', '2026-01-20')).toBe(true);
    expect(find('a').completedDate).toBe('2026-01-20');
    expect(find('a').endAtCompletion).toBe('2026-01-16');
  });

  it('propone hoy como fecha de completitud', async () => {
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a');
    expect(find('a').completedDate).toBe(todayIso());
  });

  it('rechaza una fecha futura', async () => {
    const { store, find } = await storeWith(chain());
    expect(store.completeItem('ph', 'a', addDays(todayIso(), 1))).toBe(false);
    expect(find('a').completedDate).toBeNull();
  });

  it('acepta una fecha corregida hacia atrás', async () => {
    const { store, find } = await storeWith(chain());
    const past = addDays(todayIso(), -3);
    expect(store.completeItem('ph', 'a', past)).toBe(true);
    expect(find('a').completedDate).toBe(past);
  });

  it('rechaza un item con un predecesor pendiente (regla B)', async () => {
    const { store, find } = await storeWith(chain());
    expect(store.completeItem('ph', 'b', '2026-02-01')).toBe(false);
    expect(find('b').completedDate).toBeNull();
  });

  it('permite completar la cadena en orden', async () => {
    const { store, find } = await storeWith(chain());
    expect(store.completeItem('ph', 'a', '2026-01-16')).toBe(true);
    expect(store.completeItem('ph', 'b', '2026-01-30')).toBe(true);
    expect(store.completeItem('ph', 'c', '2026-02-13')).toBe(true);
    expect(find('c').completedDate).toBe('2026-02-13');
  });
});

describe('uncompleteItem', () => {
  it('arrastra a todos los dependientes completados', async () => {
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-16');
    store.completeItem('ph', 'b', '2026-01-30');
    store.completeItem('ph', 'c', '2026-02-13');

    expect(store.countCompletedDependents('ph', 'a')).toBe(2);
    store.uncompleteItem('ph', 'a');

    for (const id of ['a', 'b', 'c']) {
      expect(find(id).completedDate).toBeNull();
      expect(find(id).endAtCompletion).toBeNull();
    }
  });

  it('no toca la línea base', async () => {
    const { store, find } = await storeWith(chain());
    store.setBaseline('r');
    store.completeItem('ph', 'a', '2026-01-16');
    store.uncompleteItem('ph', 'a');
    expect(find('a').completedDate).toBeNull();
    expect(find('a').baselineEnd).toBe('2026-01-16');
  });

  it('no cuenta nada si ningún dependiente está completado', async () => {
    const { store } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-16');
    expect(store.countCompletedDependents('ph', 'a')).toBe(0);
  });
});

describe('las cuatro puertas del congelamiento', () => {
  it('setItemDates no mueve un item completado', async () => {
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-16');
    store.setItemDates('ph', 'a', '2026-03-02', '2026-03-13');
    expect(find('a').startDate).toBe('2026-01-05');
    expect(find('a').endDate).toBe('2026-01-16');
  });

  it('toggleMilestone no colapsa un item completado', async () => {
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-16');
    store.toggleMilestone('ph', 'a');
    expect(find('a').isMilestone).toBe(false);
    expect(find('a').endDate).toBe('2026-01-16');
  });

  it('un par completado no se puede mover por ningún extremo', async () => {
    // Rule B means a frozen item's predecessors are frozen too, so there is no
    // gesture that presents the cascade with a completed item to push.
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-16');
    store.completeItem('ph', 'b', '2026-01-30');
    store.setItemDates('ph', 'a', '2026-03-02', '2026-03-13');
    expect(find('a').startDate).toBe('2026-01-05');
    expect(find('b').startDate).toBe('2026-01-19');
  });

  it('descongelar devuelve el item a la cascada', async () => {
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-16');
    store.completeItem('ph', 'b', '2026-01-30');
    store.uncompleteItem('ph', 'a');

    // Both are open again, so moving `a` past `b` pushes `b` as it always did.
    // A dependent may start the day its predecessor ends, and 13 Mar is a
    // Friday, so `snapForward` leaves it there.
    store.setItemDates('ph', 'a', '2026-03-02', '2026-03-13');
    expect(find('a').startDate).toBe('2026-03-02');
    expect(find('b').startDate).toBe('2026-03-13');
  });

  it('addDependency rechaza un predecesor pendiente en un item completado', async () => {
    const { store, find } = await storeWith([
      item('a', '2026-01-05', '2026-01-16'),
      item('x', '2026-01-05', '2026-01-16'),
    ]);
    store.completeItem('ph', 'a', '2026-01-16');
    store.addDependency('ph', 'a', 'x');
    expect(find('a').dependsOn).toEqual([]);
  });

  it('addDependency acepta un predecesor completado en un item completado', async () => {
    const { store, find } = await storeWith([
      item('a', '2026-01-05', '2026-01-16'),
      item('x', '2026-01-05', '2026-01-16'),
    ]);
    store.completeItem('ph', 'x', '2026-01-16');
    store.completeItem('ph', 'a', '2026-01-16');
    store.addDependency('ph', 'a', 'x');
    expect(find('a').dependsOn).toEqual(['x']);
  });

  it('deja editable todo lo que no son fechas', async () => {
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-16');
    store.renameItem('ph', 'a', 'otro nombre');
    store.setNotes('ph', 'a', 'una nota');
    expect(find('a').label).toBe('otro nombre');
    expect(find('a').notes).toBe('una nota');
  });
});

describe('setBaseline', () => {
  it('copia cada fin planificado y sella el día', async () => {
    const { store, find } = await storeWith(chain());
    store.setBaseline('r');
    expect(store.data.roadmaps[0].baselineDate).toBe(todayIso());
    expect(find('a').baselineEnd).toBe('2026-01-16');
    expect(find('c').baselineEnd).toBe('2026-02-13');
  });

  it('no toca fechas ni completitud', async () => {
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-16');
    store.setBaseline('r');
    expect(find('a').startDate).toBe('2026-01-05');
    expect(find('a').completedDate).toBe('2026-01-16');
  });

  it('refijar sustituye la línea base por el plan actual', async () => {
    const { store, find } = await storeWith(chain());
    store.setBaseline('r');
    store.setItemDates('ph', 'c', '2026-03-02', '2026-03-13');
    store.setBaseline('r');
    expect(find('c').baselineEnd).toBe('2026-03-13');
  });

  it('un item creado después del plan no tiene línea base', async () => {
    const { store } = await storeWith(chain());
    store.setBaseline('r');
    store.addItem('ph');
    const added = store.data.roadmaps[0].rows[0].children.at(-1)!;
    expect(added.baselineEnd).toBeNull();
    expect(added.completedDate).toBeNull();
  });
});

describe('normalización al cargar', () => {
  /** Build a store from a raw document, bypassing the typed fixtures. */
  async function storeFrom(doc: unknown) {
    const store = new AppStore(new FakeStorage(doc as AppData));
    await store.init();
    return store;
  }

  it('normaliza un documento anterior al cambio', async () => {
    const rm = roadmapWith(chain()) as unknown as {
      baselineDate?: unknown;
      rows: { children: Record<string, unknown>[] }[];
    };
    delete rm.baselineDate;
    for (const child of rm.rows[0].children) {
      delete child.completedDate;
      delete child.endAtCompletion;
      delete child.baselineEnd;
    }
    const store = await storeFrom({ roadmaps: [rm], assignees: [], blockers: [], activeId: 'r' });

    expect(store.data.roadmaps[0].baselineDate).toBeNull();
    for (const child of store.data.roadmaps[0].rows[0].children) {
      expect(child.completedDate).toBeNull();
      expect(child.endAtCompletion).toBeNull();
      expect(child.baselineEnd).toBeNull();
    }
  });

  it('deja intacto un documento que ya declara completitud', async () => {
    const items = chain();
    items[0].completedDate = '2026-01-16';
    items[0].endAtCompletion = '2026-01-16';
    items[0].baselineEnd = '2026-01-14';
    const rm = roadmapWith(items);
    rm.baselineDate = '2026-01-02';
    const store = await storeFrom({ roadmaps: [rm], assignees: [], blockers: [], activeId: 'r' });

    const a = store.data.roadmaps[0].rows[0].children[0];
    expect(store.data.roadmaps[0].baselineDate).toBe('2026-01-02');
    expect(a.completedDate).toBe('2026-01-16');
    expect(a.baselineEnd).toBe('2026-01-14');
  });

  it('descompleta un item cuyo predecesor llega pendiente', async () => {
    const items = chain();
    items[1].completedDate = '2026-01-30'; // b completado, a no
    items[1].endAtCompletion = '2026-01-30';
    const store = await storeFrom({
      roadmaps: [roadmapWith(items)],
      assignees: [],
      blockers: [],
      activeId: 'r',
    });

    const b = store.data.roadmaps[0].rows[0].children[1];
    expect(b.completedDate).toBeNull();
    expect(b.endAtCompletion).toBeNull();
  });

  it('propaga el descompletado por toda la cadena', async () => {
    const items = chain();
    items[1].completedDate = '2026-01-30'; // b y c completados, a no
    items[2].completedDate = '2026-02-13';
    const store = await storeFrom({
      roadmaps: [roadmapWith(items)],
      assignees: [],
      blockers: [],
      activeId: 'r',
    });

    const children = store.data.roadmaps[0].rows[0].children;
    expect(children.map((c) => c.completedDate)).toEqual([null, null, null]);
  });

  it('descarta valores que no son fechas ISO', async () => {
    const items = chain();
    (items[0] as unknown as Record<string, unknown>).completedDate = 'ayer';
    const store = await storeFrom({
      roadmaps: [roadmapWith(items)],
      assignees: [],
      blockers: [],
      activeId: 'r',
    });
    expect(store.data.roadmaps[0].rows[0].children[0].completedDate).toBeNull();
  });

  it('la normalización no fuerza por sí misma un guardado', async () => {
    const rm = roadmapWith(chain()) as unknown as { baselineDate?: unknown };
    delete rm.baselineDate;
    const backend = new FakeStorage({
      roadmaps: [rm],
      assignees: [],
      blockers: [],
      activeId: 'r',
    } as never);
    const store = new AppStore(backend);
    await store.init();
    expect(backend.saved).toBeNull();

    // ...but it lands on the next save that normal use produces.
    store.renameRoadmap('r', 'otro');
    await store.flush();
    expect(backend.saved?.roadmaps[0].baselineDate).toBeNull();
  });
});

describe('setCompletedDate', () => {
  it('corrige la fecha sin tocar el fin congelado', async () => {
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-20');
    expect(store.setCompletedDate('ph', 'a', '2026-01-18')).toBe(true);
    expect(find('a').completedDate).toBe('2026-01-18');
    expect(find('a').endAtCompletion).toBe('2026-01-16');
  });

  it('rechaza una fecha futura', async () => {
    const { store, find } = await storeWith(chain());
    store.completeItem('ph', 'a', '2026-01-20');
    expect(store.setCompletedDate('ph', 'a', addDays(todayIso(), 1))).toBe(false);
    expect(find('a').completedDate).toBe('2026-01-20');
  });

  it('no hace nada sobre un item sin completar', async () => {
    const { store, find } = await storeWith(chain());
    expect(store.setCompletedDate('ph', 'a', '2026-01-20')).toBe(false);
    expect(find('a').completedDate).toBeNull();
  });
});
