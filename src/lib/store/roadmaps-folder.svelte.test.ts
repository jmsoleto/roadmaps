/**
 * Connecting and disconnecting Roadmaps (carpeta-roadmaps, group 7).
 *
 * The browser is a real `BrowserBackend` over an in-memory `localStorage`, and
 * the folder is a tree in memory, so what is asserted is what ends up in each.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AppStore } from './app.svelte';
import { RoadmapsFolder, type FolderDeps } from './roadmaps-folder.svelte';
import { BrowserBackend, LocalStoragePrefs } from './storage';
import { MemoryDir } from '../folder/memory-fs';
import { serialize } from './folder-format';
import type { FolderDir } from '../folder/fs';
import type { AppData, Roadmap } from '../model/types';

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

const LS_DATA = 'roadmaps:appdata:v1';

const roadmap = (id: string): Roadmap => ({
  id,
  name: `R ${id}`,
  colorSlot: 0,
  startDate: '2026-01-01',
  windowDays: 730,
  baselineDate: null,
  rows: [],
});

const data = (...ids: string[]): AppData => ({
  roadmaps: ids.map(roadmap),
  assignees: [],
  blockers: [],
});

/** Fake browser plumbing: a picker that returns `next`, and handles kept in a map. */
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

let ls: MemoryStorage;

beforeEach(() => {
  ls = new MemoryStorage();
  (globalThis as { localStorage?: unknown }).localStorage = ls;
});

/** A session: a store and its folder connection, booted. */
async function session(deps = new Deps()) {
  const store = new AppStore(new BrowserBackend(), new LocalStoragePrefs());
  const folder = new RoadmapsFolder(store, deps);
  await folder.start();
  return { store, folder, deps };
}

function browserHas(d: AppData) {
  ls.setItem(LS_DATA, JSON.stringify(d));
}

/** A repo whose `roadmaps/` subfolder holds `d`. */
function repoWith(d: AppData): MemoryDir {
  const root = new MemoryDir('repo-equipo');
  for (const [name, text] of serialize(d)) root.put(`roadmaps/${name}`, text);
  root.writes = [];
  return root;
}

describe('conectar a una carpeta vacía (7.1)', () => {
  it('vuelca los datos del navegador, verifica y pasa a la carpeta', async () => {
    browserHas(data('rm-1-a', 'rm-2-b', 'rm-3-c'));
    const before = ls.getItem(LS_DATA);
    const { store, folder, deps } = await session();
    const root = new MemoryDir('repo');
    deps.next = root;

    const plan = await folder.choose();
    expect(plan.kind).toBe('dump');
    expect(root.snapshot()).toEqual({});

    expect(await folder.confirm(plan)).toEqual({ ok: true });
    expect(store.source).toBe('folder');
    expect(folder.folderName).toBe('repo/roadmaps');
    expect(store.data.roadmaps.map((r) => r.id)).toEqual(['rm-1-a', 'rm-2-b', 'rm-3-c']);
    expect(Object.keys(root.snapshot()).sort()).toEqual(
      [
        'roadmaps/assignees.json',
        'roadmaps/blockers.json',
        'roadmaps/order.json',
        'roadmaps/rm-1-a.json',
        'roadmaps/rm-2-b.json',
        'roadmaps/rm-3-c.json',
        'roadmaps/tech-lead-hub.json',
      ].sort(),
    );
    // El navegador, byte a byte igual.
    expect(ls.getItem(LS_DATA)).toBe(before);
  });

  it('si la escritura falla, sigue en el navegador y no recuerda la carpeta', async () => {
    browserHas(data('rm-1-a'));
    const { store, folder, deps } = await session();
    const root = new MemoryDir('repo');
    deps.next = root;
    const plan = await folder.choose();
    root.failWrites = true;

    const out = await folder.confirm(plan);
    expect(out.ok).toBe(false);
    expect(store.source).toBe('browser');
    expect(store.data.roadmaps.map((r) => r.id)).toEqual(['rm-1-a']);
    expect(deps.handles.size).toBe(0);
    expect(deps.connectedName('roadmaps')).toBeNull();
  });

  it('si lo releído no coincide, tampoco', async () => {
    browserHas(data('rm-1-a'));
    const { store, folder, deps } = await session();
    const root = new MemoryDir('repo');
    deps.next = root;
    const plan = await folder.choose();
    // Algo pisa el fichero entre la escritura y la relectura.
    const sub = root.dir('roadmaps');
    const realWrite = sub.getFileHandle.bind(sub);
    sub.getFileHandle = async (name, opts) => {
      const f = await realWrite(name, opts);
      if (name === 'rm-1-a.json') {
        const w = f.createWritable.bind(f);
        f.createWritable = async () => {
          const inner = await w();
          return { ...inner, write: async () => inner.write('{}\n') };
        };
      }
      return f;
    };

    const out = await folder.confirm(plan);
    expect(out).toMatchObject({ ok: false });
    expect(!out.ok && out.message).toContain('rm-1-a.json');
    expect(store.source).toBe('browser');
    expect(deps.handles.size).toBe(0);
  });
});

describe('conectar a una carpeta con datos (7.2)', () => {
  it('manda la carpeta, sin fusionar, y el navegador sigue como estaba', async () => {
    browserHas(data('rm-mio-1', 'rm-mio-2'));
    const before = ls.getItem(LS_DATA);
    const root = repoWith(data('rm-1-a', 'rm-2-b', 'rm-3-c', 'rm-4-d', 'rm-5-e'));
    const folderBefore = root.snapshot();
    const { store, folder, deps } = await session();
    deps.next = root;

    const plan = await folder.choose();
    expect(plan.kind).toBe('adopt');
    expect(await folder.confirm(plan)).toEqual({ ok: true });

    expect(store.data.roadmaps).toHaveLength(5);
    expect(root.snapshot()).toEqual(folderBefore);
    expect(root.writes).toEqual([]);
    expect(ls.getItem(LS_DATA)).toBe(before);
  });

  it('una carpeta de otra aplicación se rechaza nombrándola', async () => {
    const root = new MemoryDir('repo').put('api/tech-lead-hub.json', '{"app":"api","format":1}');
    const { folder, deps } = await session();
    deps.next = root.dir('api');
    const plan = await folder.choose();
    expect(plan).toMatchObject({ kind: 'rejected' });
    expect(plan.kind === 'rejected' && plan.message).toContain('API Hub');
  });

  it('cancelar el selector no hace nada', async () => {
    const { store, folder } = await session();
    expect(await folder.choose()).toEqual({ kind: 'cancelled' });
    expect(store.source).toBe('browser');
  });
});

describe('desconectar (7.3)', () => {
  it('vuelve al navegador tal como estaba; la carpeta conserva lo editado', async () => {
    browserHas(data('rm-mio'));
    const root = repoWith(data('rm-1-a'));
    const { store, folder, deps } = await session();
    deps.next = root;
    await folder.confirm(await folder.choose());

    store.renameRoadmap('rm-1-a', 'editado en la carpeta');
    await folder.disconnect();

    expect(store.source).toBe('browser');
    expect(store.data.roadmaps.map((r) => r.id)).toEqual(['rm-mio']);
    expect(JSON.parse(root.read('roadmaps/rm-1-a.json')!).name).toBe('editado en la carpeta');
    expect(deps.connectedName('roadmaps')).toBeNull();
    expect(JSON.stringify(store.data)).not.toContain('editado');
  });

  it('un cambio que aún esperaba se escribe en la carpeta antes de volver', async () => {
    const root = repoWith(data('rm-1-a'));
    root.writeDelay = 10;
    const { store, folder, deps } = await session();
    deps.next = root;
    await folder.confirm(await folder.choose());

    store.renameRoadmap('rm-1-a', 'justo antes');
    await folder.disconnect();
    expect(JSON.parse(root.read('roadmaps/rm-1-a.json')!).name).toBe('justo antes');
  });
});

describe('arrancar con una conexión recordada (7.4)', () => {
  async function connected(permission: 'granted' | 'prompt' | 'denied') {
    const root = repoWith(data('rm-1-a', 'rm-2-b'));
    const deps = new Deps();
    await deps.saveHandle('roadmaps', root.dir('roadmaps'));
    root.permission = permission;
    return { root, deps };
  }

  it('con el permiso conservado abre la carpeta directamente', async () => {
    const { deps } = await connected('granted');
    const { store } = await session(deps);
    expect(store.source).toBe('folder');
    expect(store.unavailable).toBeNull();
    expect(store.data.roadmaps).toHaveLength(2);
  });

  it('sin permiso dice que falta, sin enseñar nada ni dejar crear', async () => {
    browserHas(data('rm-mio'));
    const { deps } = await connected('prompt');
    const { store } = await session(deps);
    expect(store.unavailable?.why).toEqual({ cause: 'permiso' });
    expect(store.data.roadmaps).toEqual([]);
    expect(store.addRoadmap('x')).toBe(false);
  });

  it('conceder el permiso lee la carpeta', async () => {
    const { root, deps } = await connected('prompt');
    root.grantOnRequest = 'granted';
    const { store, folder } = await session(deps);
    expect(await folder.grant()).toBe(true);
    expect(store.unavailable).toBeNull();
    expect(store.data.roadmaps).toHaveLength(2);
  });

  it('si el usuario lo niega, sigue faltando', async () => {
    const { root, deps } = await connected('prompt');
    root.grantOnRequest = 'denied';
    const { store, folder } = await session(deps);
    expect(await folder.grant()).toBe(false);
    expect(store.unavailable?.why).toEqual({ cause: 'permiso' });
  });

  it('se puede desconectar desde la falta de permiso', async () => {
    browserHas(data('rm-mio'));
    const { deps } = await connected('denied');
    const { store, folder } = await session(deps);
    await folder.disconnect();
    expect(store.unavailable).toBeNull();
    expect(store.data.roadmaps.map((r) => r.id)).toEqual(['rm-mio']);
  });

  it('un nombre recordado sin handle es una carpeta que no se encuentra', async () => {
    const deps = new Deps();
    localStorage.setItem('tech-lead-hub:folder:roadmaps', 'repo-perdido');
    const { store } = await session(deps);
    expect(store.unavailable?.why).toEqual({ cause: 'carpeta-ausente' });
  });
});

describe('reintentar (7.5)', () => {
  it('tras arreglar el fichero roto, carga', async () => {
    const root = repoWith(data('rm-1-a'));
    const good = root.read('roadmaps/rm-1-a.json')!;
    root.put('roadmaps/rm-1-a.json', '<<<<<<< HEAD\n');
    const deps = new Deps();
    await deps.saveHandle('roadmaps', root.dir('roadmaps'));
    const { store, folder } = await session(deps);
    expect(store.unavailable?.why).toEqual({ cause: 'fichero-ilegible', file: 'rm-1-a.json' });

    root.put('roadmaps/rm-1-a.json', good);
    await folder.retry();
    expect(store.unavailable).toBeNull();
    expect(store.data.roadmaps.map((r) => r.id)).toEqual(['rm-1-a']);
  });
});
