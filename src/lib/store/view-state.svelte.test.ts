/**
 * The view state lives in preferences, not in the data (carpeta-roadmaps, D3).
 *
 * One fake plays both backends and survives across "restarts" (a new store
 * over the same fake), which is what a browser does between sessions.
 */

import { describe, it, expect } from 'vitest';
import { AppStore } from './app.svelte';
import type { Prefs, RoadmapsBackend, RoadmapsLoad } from './storage';
import type { AppData, Phase, Roadmap } from '../model/types';
import { liftViewState } from './view-state';

class Browser implements RoadmapsBackend, Prefs {
  readonly source = 'browser' as const;
  readonly pending = false;
  async settled(): Promise<void> {}
  data: AppData | null;
  prefs = new Map<string, string>();
  saves = 0;
  constructor(data: AppData | null) {
    this.data = data;
  }
  async load(): Promise<RoadmapsLoad> {
    // A copy, as a real store would hand back: the store mutates what it loads.
    return this.data ? { kind: 'loaded', data: structuredClone(this.data) } : { kind: 'empty' };
  }
  async save(data: AppData): Promise<void> {
    this.data = structuredClone(data);
    this.saves += 1;
  }
  async getPref(key: string): Promise<string | null> {
    return this.prefs.get(key) ?? null;
  }
  async setPref(key: string, value: string): Promise<void> {
    this.prefs.set(key, value);
  }
}

const phase = (id: string): Phase => ({
  id,
  name: id,
  colorSlot: 0,
  assigneeId: null,
  notes: '',
  startDate: null,
  endDate: null,
  children: [],
});

const roadmap = (id: string, phases: string[] = []): Roadmap => ({
  id,
  name: id,
  colorSlot: 0,
  startDate: '2026-01-01',
  windowDays: 730,
  baselineDate: null,
  rows: phases.map(phase),
});

const data = (...rms: Roadmap[]): AppData => ({ roadmaps: rms, assignees: [], blockers: [] });

async function boot(browser: Browser): Promise<AppStore> {
  const store = new AppStore(browser, browser);
  await store.init();
  return store;
}

describe('el plegado de las fases', () => {
  it('sobrevive a reiniciar', async () => {
    const browser = new Browser(data(roadmap('r', ['a', 'b', 'c'])));
    const first = await boot(browser);
    first.togglePhaseExpanded('a');
    first.togglePhaseExpanded('c');

    const second = await boot(browser);
    expect(second.isCollapsed('a')).toBe(true);
    expect(second.isCollapsed('b')).toBe(false);
    expect(second.isCollapsed('c')).toBe(true);
  });

  it('no cambia los datos ni los guarda', async () => {
    const browser = new Browser(data(roadmap('r', ['a'])));
    const store = await boot(browser);
    const before = browser.saves;
    store.togglePhaseExpanded('a');
    await new Promise((r) => setTimeout(r, 300));
    expect(browser.saves).toBe(before);
    expect(JSON.stringify(store.data)).not.toContain('expanded');
  });

  it('una fase nueva nace desplegada', async () => {
    const browser = new Browser(data(roadmap('r', ['a'])));
    const store = await boot(browser);
    store.togglePhaseExpanded('a');
    store.addPhase();
    const added = store.activeRoadmap!.rows[1];
    expect(store.isCollapsed(added.id)).toBe(false);
    expect(store.isCollapsed('a')).toBe(true);
  });

  it('añadir un item a una fase plegada la despliega', async () => {
    const browser = new Browser(data(roadmap('r', ['a'])));
    const store = await boot(browser);
    store.togglePhaseExpanded('a');
    store.addItem('a');
    expect(store.isCollapsed('a')).toBe(false);
  });
});

describe('importar no cambia cómo se mira', () => {
  it('un roadmap importado con fases plegadas entra desplegado', async () => {
    const browser = new Browser(data(roadmap('a', ['p1'])));
    const store = await boot(browser);
    store.togglePhaseExpanded('p1');
    const doc = {
      format: 'roadmaps.v1',
      roadmap: { ...roadmap('x', ['px']), rows: [{ ...phase('px'), expanded: false }] },
      assignees: [],
      blockers: [],
    };
    store.importFromText(JSON.stringify(doc));
    expect(store.activeRoadmap!.rows.every((p) => !store.isCollapsed(p.id))).toBe(true);
    expect(store.isCollapsed('p1')).toBe(true);
  });
});

describe('el roadmap abierto', () => {
  it('sobrevive a reiniciar como preferencia, fuera de los datos', async () => {
    const browser = new Browser(data(roadmap('a'), roadmap('b')));
    const first = await boot(browser);
    first.setActive('b');
    await first.flush();
    expect(browser.data && 'activeId' in browser.data).toBe(false);

    const second = await boot(browser);
    expect(second.activeId).toBe('b');
  });

  it('borrar el abierto elige otro y lo recuerda', async () => {
    const browser = new Browser(data(roadmap('a'), roadmap('b')));
    const first = await boot(browser);
    first.setActive('b');
    first.deleteRoadmap('b');
    expect(first.activeId).toBe('a');

    const second = await boot(browser);
    expect(second.activeId).toBe('a');
  });

  it('una preferencia que apunta a un roadmap que ya no existe cae en el primero', async () => {
    const browser = new Browser(data(roadmap('a'), roadmap('b')));
    browser.prefs.set('active-id', 'borrado');
    const store = await boot(browser);
    expect(store.activeId).toBe('a');
  });
});

describe('datos guardados con el estado de vista dentro', () => {
  /** What a version before this change wrote: view state inside the data. */
  const legacy = (): AppData => {
    const d = data(roadmap('a', ['p1', 'p2']), roadmap('b', ['p3'])) as AppData & {
      activeId: string;
    };
    d.activeId = 'b';
    (d.roadmaps[0].rows[0] as Phase & { expanded: boolean }).expanded = false;
    (d.roadmaps[0].rows[1] as Phase & { expanded: boolean }).expanded = true;
    (d.roadmaps[1].rows[0] as Phase & { expanded: boolean }).expanded = false;
    return d;
  };

  it('conserva el roadmap abierto y el plegado', async () => {
    const store = await boot(new Browser(legacy()));
    expect(store.activeId).toBe('b');
    expect(store.isCollapsed('p1')).toBe(true);
    expect(store.isCollapsed('p2')).toBe(false);
    expect(store.isCollapsed('p3')).toBe(true);
  });

  it('no fuerza una escritura de los datos', async () => {
    const browser = new Browser(legacy());
    await boot(browser);
    await new Promise((r) => setTimeout(r, 300));
    expect(browser.saves).toBe(0);
  });

  it('los sube a preferencias, de modo que sobreviven al siguiente guardado', async () => {
    const browser = new Browser(legacy());
    const first = await boot(browser);
    first.renameRoadmap('a', 'renombrado');
    await first.flush();
    expect(JSON.stringify(browser.data)).not.toMatch(/activeId|expanded/);

    const second = await boot(browser);
    expect(second.activeId).toBe('b');
    expect(second.isCollapsed('p1')).toBe(true);
  });

  it('una preferencia ya escrita gana a lo que traen los datos', async () => {
    const browser = new Browser(legacy());
    browser.prefs.set('active-id', 'a');
    browser.prefs.set('collapsed-phases', '[]');
    const store = await boot(browser);
    expect(store.activeId).toBe('a');
    expect(store.isCollapsed('p1')).toBe(false);
  });

  it('subirlos es idempotente', () => {
    const d = legacy();
    expect(liftViewState(d)).toEqual({ activeId: 'b', collapsed: ['p1', 'p3'] });
    expect(liftViewState(d)).toEqual({ activeId: undefined, collapsed: undefined });
  });
});
