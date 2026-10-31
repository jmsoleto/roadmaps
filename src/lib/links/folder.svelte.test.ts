/**
 * Links Hub in a folder (carpeta-links, tasks 2.2 and 3.1).
 *
 * The browser is the real `LocalLinksBackend` over an in-memory
 * `localStorage`, the folder a tree in memory.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LinksStore } from './store.svelte';
import { LinksFolder } from './folder.svelte';
import { LocalLinksBackend } from './storage';
import { LINKS_FORMAT } from './folder-format';
import { FolderDocBackend, UnavailableDocBackend } from '../folder/doc-backend';
import { MemoryDir } from '../folder/memory-fs';
import type { FolderDeps } from '../folder/connection.svelte';
import type { FolderDir } from '../folder/fs';
import type { LinksData } from './model';

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

const LS_KEY = 'links:appdata:v1';
const seed: LinksData = {
  areas: [{ id: 'area-1-aaaaa', name: 'Pagos' }],
  links: [
    {
      id: 'link-1',
      areaId: 'area-1-aaaaa',
      name: 'Grafana',
      description: '',
      url: 'https://grafana.example',
      monogram: 'GR',
      from: 0,
      to: 3,
      wide: false,
    },
  ],
};

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  localStorage.setItem(LS_KEY, JSON.stringify(seed));
});

async function session(deps = new Deps()) {
  const store = new LinksStore(new LocalLinksBackend());
  const folder = new LinksFolder(store, deps);
  await folder.start();
  return { store, folder, deps };
}

describe('sin carpeta, Links sigue siendo síncrono (2.2)', () => {
  it('init no devuelve promesa y los enlaces están ya', () => {
    const store = new LinksStore(new LocalLinksBackend());
    const out = store.init();
    expect(out).toBeUndefined();
    expect(store.ready).toBe(true);
    expect(store.data.links).toHaveLength(1);
    expect(store.source).toBe('browser');
  });
});

describe('con carpeta, Links puede esperar (2.2)', () => {
  it('no está listo hasta que la carpeta responde', async () => {
    const dir = new MemoryDir('repo').dir('links');
    dir.writeDelay = 0;
    const store = new LinksStore(new FolderDocBackend(dir, LINKS_FORMAT, 'enlaces'));
    const loading = store.init();
    expect(store.ready).toBe(false);
    expect(store.addArea('x')).toBeNull();
    await loading;
    expect(store.ready).toBe(true);
  });

  it('sin poder leer no crea ni guarda', async () => {
    const store = new LinksStore(new UnavailableDocBackend<LinksData>('x', { cause: 'permiso' }));
    await store.init();
    expect(store.unavailable?.why).toEqual({ cause: 'permiso' });
    expect(store.addArea('Pagos')).toBeNull();
    expect(store.data.areas).toEqual([]);
  });

  it('un guardado fallido se dice y se reintenta', async () => {
    const dir = new MemoryDir('repo').dir('links');
    const store = new LinksStore(new FolderDocBackend(dir, LINKS_FORMAT, 'enlaces'));
    await store.init();
    store.addArea('Pagos');
    dir.failWrites = true;
    await store.flush();
    expect(store.saveError).toBe('disk full');
    dir.failWrites = false;
    await store.flush();
    expect(store.saveError).toBeNull();
    expect(Object.keys(dir.snapshot()).some((f) => f.startsWith('area-'))).toBe(true);
  });
});

describe('conectar Links (3.1)', () => {
  it('vuelca a una carpeta vacía y desconectar vuelve al navegador intacto', async () => {
    const { store, folder, deps } = await session();
    const root = new MemoryDir('repo');
    deps.next = root;
    const plan = await folder.choose();
    expect(plan.kind).toBe('dump');
    expect(await folder.confirm(plan)).toEqual({ ok: true });
    expect(store.source).toBe('folder');
    expect(Object.keys(root.snapshot()).sort()).toEqual([
      'links/area-1-aaaaa.json',
      'links/order.json',
      'links/tech-lead-hub.json',
    ]);

    store.updateLink('link-1', { name: 'Grafana prod' });
    await folder.disconnect();
    expect(store.source).toBe('browser');
    expect(store.data.links[0].name).toBe('Grafana');
    expect(JSON.parse(root.read('links/area-1-aaaaa.json')!).links[0].name).toBe('Grafana prod');
    expect(localStorage.getItem(LS_KEY)).toBe(JSON.stringify(seed));
  });

  it('una carpeta con datos manda', async () => {
    const root = new MemoryDir('repo');
    const team: LinksData = { areas: [{ id: 'area-9-zzzzz', name: 'Equipo' }], links: [] };
    for (const [n, t] of LINKS_FORMAT.serialize(team)) root.put(`links/${n}`, t);
    const { store, folder, deps } = await session();
    deps.next = root;
    const plan = await folder.choose();
    expect(plan.kind).toBe('adopt');
    await folder.confirm(plan);
    expect(store.areas.map((a) => a.name)).toEqual(['Equipo']);
  });

  it('con la conexión recordada y sin permiso, falta permiso; conceder lo abre', async () => {
    const first = await session();
    const root = new MemoryDir('repo');
    first.deps.next = root;
    await first.folder.confirm(await first.folder.choose());
    root.permission = 'prompt';
    root.grantOnRequest = 'granted';

    const { store, folder } = await session(first.deps);
    expect(store.unavailable?.why).toEqual({ cause: 'permiso' });
    expect(store.data.links).toEqual([]);
    expect(await folder.grant()).toBe(true);
    expect(store.data.links).toHaveLength(1);
  });

  it('un área con conflicto se nombra y reintentar la recupera', async () => {
    const first = await session();
    const root = new MemoryDir('repo');
    first.deps.next = root;
    await first.folder.confirm(await first.folder.choose());
    const good = root.read('links/area-1-aaaaa.json')!;
    root.put('links/area-1-aaaaa.json', '<<<<<<< HEAD\n');

    const { store, folder } = await session(first.deps);
    expect(store.unavailable?.why).toEqual({
      cause: 'fichero-ilegible',
      file: 'area-1-aaaaa.json',
    });
    root.put('links/area-1-aaaaa.json', good);
    await folder.retry();
    expect(store.unavailable).toBeNull();
    expect(store.data.links).toHaveLength(1);
  });
});
