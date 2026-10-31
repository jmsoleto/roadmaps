/**
 * Connecting API Hub (carpeta-api-hub, group 5): three documents, one folder.
 *
 * The browser is a fake IndexedDB, the folder a tree in memory.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { ApiFolder } from './folder.svelte';
import { ApiContractsStore } from './store.svelte';
import { ApiLibraryStore } from './library.svelte';
import { ValueSourcesStore } from './sources/store.svelte';
import { createApiBackend, createLibraryBackend, createValueSourcesBackend } from './storage';
import { MemoryDir } from '../folder/memory-fs';
import type { FolderDeps } from '../folder/connection.svelte';
import type { FolderDir } from '../folder/fs';

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

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
});

async function session(deps = new Deps()) {
  const contracts = new ApiContractsStore(createApiBackend());
  const library = new ApiLibraryStore(createLibraryBackend());
  const sources = new ValueSourcesStore(createValueSourcesBackend());
  const folder = new ApiFolder(contracts, library, sources, deps);
  await folder.start();
  return { contracts, library, sources, folder, deps };
}

/** A browser that already has a contract, a library entry and a value source. */
async function browserWithData() {
  const s = await session();
  const c = s.contracts.addContract('Pedidos')!;
  const model = s.contracts.addModel('Pedido')!;
  s.library.save(s.contracts.contract(c.id)!, model.id);
  s.sources.create('estados');
  await Promise.all([s.contracts.flush(), s.library.flush(), s.sources.flush()]);
  return s;
}

describe('conectar API Hub a una carpeta vacía', () => {
  it('vuelca y verifica los tres documentos, y el navegador no cambia', async () => {
    const { contracts, library, sources, folder, deps } = await browserWithData();
    const root = new MemoryDir('repo');
    deps.next = root;
    const plan = await folder.choose();
    expect(plan.kind).toBe('dump');
    expect(await folder.confirm(plan)).toEqual({ ok: true });

    expect(contracts.source).toBe('folder');
    expect(library.source).toBe('folder');
    expect(sources.source).toBe('folder');
    const files = Object.keys(root.snapshot());
    expect(files.some((f) => /^api\/c-.*\.json$/.test(f))).toBe(true);
    expect(files.some((f) => /^api\/lib-.*\.json$/.test(f))).toBe(true);
    expect(files).toContain('api/value-sources.json');
    expect(files).toContain('api/tech-lead-hub.json');
    expect(folder.folderName).toBe('repo/api');

    // Disconnecting gives back the browser's, untouched.
    await folder.disconnect();
    expect(contracts.contracts.map((c) => c.title)).toEqual(['Pedidos']);
    expect(library.entries).toHaveLength(1);
    expect(sources.sources).toHaveLength(1);
  });

  it('si falla uno, los tres siguen en el navegador y no se recuerda nada', async () => {
    const { contracts, library, sources, folder, deps } = await browserWithData();
    const root = new MemoryDir('repo');
    deps.next = root;
    const plan = await folder.choose();
    root.failWrites = true;
    const out = await folder.confirm(plan);
    expect(out.ok).toBe(false);
    expect([contracts.source, library.source, sources.source]).toEqual([
      'browser',
      'browser',
      'browser',
    ]);
    expect(deps.connectedName('api')).toBeNull();
  });
});

describe('conectar a una carpeta con datos', () => {
  it('manda la carpeta, sin fusionar', async () => {
    // Someone else's repo, with one contract.
    const other = await browserWithData();
    const root = new MemoryDir('repo-equipo');
    other.deps.next = root;
    await other.folder.confirm(await other.folder.choose());
    other.contracts.renameContract(other.contracts.contracts[0].id, 'Del equipo');
    await other.contracts.flush();

    // A fresh browser with its own contract.
    globalThis.indexedDB = new IDBFactory();
    (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
    const mine = await session();
    mine.contracts.addContract('Mío');
    await mine.contracts.flush();
    const before = root.snapshot();

    mine.deps.next = root;
    const plan = await mine.folder.choose();
    expect(plan.kind).toBe('adopt');
    await mine.folder.confirm(plan);
    expect(mine.contracts.contracts.map((c) => c.title)).toEqual(['Del equipo']);
    expect(root.snapshot()).toEqual(before);

    await mine.folder.disconnect();
    expect(mine.contracts.contracts.map((c) => c.title)).toEqual(['Mío']);
  });

  it('la carpeta de Roadmaps se rechaza nombrándola', async () => {
    const { folder, deps } = await session();
    const root = new MemoryDir('repo').put(
      'roadmaps/tech-lead-hub.json',
      '{"app":"roadmaps","format":1}',
    );
    deps.next = root.dir('roadmaps');
    const plan = await folder.choose();
    expect(plan.kind === 'rejected' && plan.message).toContain('Roadmaps');
  });
});

describe('arrancar con la conexión recordada', () => {
  async function connected(permission: 'granted' | 'prompt') {
    const first = await browserWithData();
    const root = new MemoryDir('repo');
    first.deps.next = root;
    await first.folder.confirm(await first.folder.choose());
    root.permission = permission;
    return { root, deps: first.deps };
  }

  it('una sola consulta de permiso decide los tres', async () => {
    const { deps } = await connected('prompt');
    const s = await session(deps);
    for (const store of [s.contracts, s.library, s.sources]) {
      expect(store.unavailable?.why).toEqual({ cause: 'permiso' });
    }
    expect(s.contracts.addContract('x')).toBeNull();
  });

  it('conceder una vez abre los tres', async () => {
    const { root, deps } = await connected('prompt');
    root.grantOnRequest = 'granted';
    const s = await session(deps);
    expect(await s.folder.grant()).toBe(true);
    expect(s.contracts.contracts).toHaveLength(1);
    expect(s.library.entries).toHaveLength(1);
    expect(s.sources.sources).toHaveLength(1);
  });

  it('una biblioteca ilegible no impide usar los contratos', async () => {
    const { root, deps } = await connected('granted');
    const lib = Object.keys(root.snapshot()).find((f) => f.startsWith('api/lib-'))!;
    root.put(lib, '<<<<<<< HEAD\n');
    const s = await session(deps);
    expect(s.library.unavailable?.why).toMatchObject({ cause: 'fichero-ilegible' });
    expect(s.contracts.unavailable).toBeNull();
    expect(s.contracts.contracts).toHaveLength(1);
  });
});
