/**
 * Personas Hub in a folder (personas-hub, task 2.3).
 *
 * The browser is the real `LocalPersonasBackend` over an in-memory
 * `localStorage`, the folder a tree in memory.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PersonasStore } from './store.svelte';
import { PersonasFolder } from './folder.svelte';
import { LocalPersonasBackend, LS_KEY } from './storage';
import { PERSONAS_FORMAT } from './folder-format';
import { MemoryDir } from '../folder/memory-fs';
import type { FolderDeps } from '../folder/connection.svelte';
import type { FolderDir } from '../folder/fs';
import { emptyData, type PersonasData } from './model';

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
  supports() {
    return true;
  }
  async pick() {
    return this.next;
  }
  connectedName(appId: string) {
    return localStorage.getItem(`tech-lead-hub:folder:${appId}`);
  }
  async loadHandle(appId: string) {
    return this.handles.get(appId) ?? null;
  }
  async saveHandle(appId: string, dir: FolderDir, label = dir.name) {
    this.handles.set(appId, dir);
    localStorage.setItem(`tech-lead-hub:folder:${appId}`, label);
  }
  async forgetHandle(appId: string) {
    this.handles.delete(appId);
    localStorage.removeItem(`tech-lead-hub:folder:${appId}`);
  }
}

const seed: PersonasData = {
  ...emptyData(),
  teams: [{ id: 'team-1-aaaaa', name: 'Pagos', description: '', active: true }],
  people: [
    {
      id: 'per-1',
      teamId: 'team-1-aaaaa',
      name: 'Ana',
      roleId: null,
      technologyId: null,
      locationId: null,
      hoursPerDay: 8,
      dedication: 100,
      active: true,
    },
  ],
  sprints: [
    {
      id: 'sprint-1-bbbbb',
      teamId: 'team-1-aaaaa',
      name: 'Sprint 1',
      startDate: '2026-11-30',
      endDate: '2026-12-11',
      status: 'planificacion',
      incidentPercentage: 15,
      members: [{ personId: 'per-1', dedication: null }],
    },
  ],
};

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  localStorage.setItem(LS_KEY, JSON.stringify(seed));
});

async function session(deps = new Deps()) {
  const store = new PersonasStore(new LocalPersonasBackend());
  const folder = new PersonasFolder(store, deps);
  await folder.start();
  return { store, folder, deps };
}

describe('Personas Hub en una carpeta', () => {
  it('sin carpeta es síncrono', () => {
    const store = new PersonasStore(new LocalPersonasBackend());
    expect(store.init()).toBeUndefined();
    expect(store.data.teams).toHaveLength(1);
  });

  it('vuelca a una carpeta vacía y desconectar vuelve al navegador intacto', async () => {
    const { store, folder, deps } = await session();
    const root = new MemoryDir('repo');
    deps.next = root;
    const plan = await folder.choose();
    expect(plan.kind).toBe('dump');
    expect(await folder.confirm(plan)).toEqual({ ok: true });
    expect(store.source).toBe('folder');
    expect(Object.keys(root.snapshot()).sort()).toEqual([
      'personas/catalogo.json',
      'personas/order.json',
      'personas/sprint-1-bbbbb.json',
      'personas/team-1-aaaaa.json',
      'personas/tech-lead-hub.json',
    ]);

    store.updateSprint('sprint-1-bbbbb', { incidentPercentage: 20 });
    await folder.disconnect();
    expect(store.source).toBe('browser');
    expect(store.data.sprints[0].incidentPercentage).toBe(15);
    expect(JSON.parse(root.read('personas/sprint-1-bbbbb.json')!).incidentPercentage).toBe(20);
  });

  it('una carpeta con datos manda', async () => {
    const root = new MemoryDir('repo');
    const other: PersonasData = {
      ...emptyData(),
      teams: [{ id: 'team-9-zzzzz', name: 'Plataforma', description: '', active: true }],
    };
    for (const [n, t] of PERSONAS_FORMAT.serialize(other)) root.put(`personas/${n}`, t);
    const { store, folder, deps } = await session();
    deps.next = root;
    const plan = await folder.choose();
    expect(plan.kind).toBe('adopt');
    await folder.confirm(plan);
    expect(store.data.teams.map((t) => t.name)).toEqual(['Plataforma']);
  });

  it('un sprint con conflicto se nombra y no se escribe nada', async () => {
    const first = await session();
    const root = new MemoryDir('repo');
    first.deps.next = root;
    await first.folder.confirm(await first.folder.choose());
    root.put('personas/sprint-1-bbbbb.json', '<<<<<<< HEAD\n');
    const before = root.snapshot();

    const { store } = await session(first.deps);
    expect(store.unavailable?.why).toEqual({
      cause: 'fichero-ilegible',
      file: 'sprint-1-bbbbb.json',
    });
    expect(store.addTeam('x').ok).toBe(false);
    await store.flush();
    expect(root.snapshot()).toEqual(before);
  });
});
