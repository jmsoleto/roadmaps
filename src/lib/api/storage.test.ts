import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbApiBackend } from './storage';
import { IndexedDbBackend } from '../decisions/storage';
import { openDatabase, request } from '../store/indexeddb';
import { emptyDecisionsData } from '../decisions/model/types';
import type { ApiData } from './model/types';

const doc = (n: number): ApiData => ({
  contracts: Array.from({ length: n }, (_, i) => ({
    id: `api-${i}`,
    title: `API ${i}`,
    version: '1.0.0',
    description: '',
    server: '',
    colorSlot: i,
    models: [],
    endpoints: [],
    view: null,
  })),
  openId: null,
});

// A fresh database per test, so one test's document never leaks into the next.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('the API Hub store', () => {
  it('reports an empty store on a first run', async () => {
    expect(await new IndexedDbApiBackend().load()).toEqual({ kind: 'empty' });
  });

  it('round-trips a document', async () => {
    const backend = new IndexedDbApiBackend();
    await backend.save(doc(2));

    const out = await backend.load();
    expect(out.kind).toBe('loaded');
    if (out.kind !== 'loaded') return;
    expect(out.data.contracts.map((c) => c.title)).toEqual(['API 0', 'API 1']);
  });

  it('replaces the whole document rather than merging into it', async () => {
    const backend = new IndexedDbApiBackend();
    await backend.save(doc(3));
    await backend.save(doc(1));

    const out = await backend.load();
    if (out.kind !== 'loaded') throw new Error('expected a document');
    expect(out.data.contracts).toHaveLength(1);
  });

  /**
   * The distinction `local-persistence` insists on: a store that will not open
   * is not a store with nothing in it, and the app must be able to tell them
   * apart before it offers to write.
   */
  it('reports a store that will not open as unavailable, not as empty', async () => {
    const backend = new IndexedDbApiBackend(() =>
      Promise.reject(new Error('otra pestaña tiene abierta una versión anterior')),
    );
    const out = await backend.load();
    expect(out.kind).toBe('unavailable');
    if (out.kind !== 'unavailable') return;
    expect(out.reason).toContain('otra pestaña');
  });

  it('refuses to save when the store will not open', async () => {
    const backend = new IndexedDbApiBackend(() => Promise.reject(new Error('cerrada')));
    await expect(backend.save(doc(1))).rejects.toThrow('cerrada');
  });

  /**
   * The other half of D6, stated as a test so the reason survives: the clone
   * does **not** rescue a reactive object. `structuredClone` rejects a proxy
   * rather than unwrapping it, which is why the store snapshots first.
   */
  it('refuses a document that reached it still wrapped in a proxy', async () => {
    const backend = new IndexedDbApiBackend();
    await expect(backend.save(new Proxy(doc(1), {}))).rejects.toThrow(/clone/i);
  });
});

describe('the shared database', () => {
  it('creates every application’s object store', async () => {
    const db = await openDatabase();
    expect([...db.objectStoreNames].sort()).toEqual([
      'apiContracts',
      'apiLibrary',
      'attachments',
      'decisions',
    ]);
  });

  /**
   * The version bump that brought API Hub in is additive: `onupgradeneeded`
   * creates only what is missing, so nothing that was already stored moves.
   */
  it('leaves the other applications’ data alone', async () => {
    const decisions = new IndexedDbBackend();
    await decisions.save(emptyDecisionsData());

    await new IndexedDbApiBackend().save(doc(2));

    const out = await decisions.load();
    expect(out.kind).toBe('loaded');
  });

  it('starts the library store empty and untouched', async () => {
    // It exists from this change so that filling it later is not a migration.
    await new IndexedDbApiBackend().save(doc(1));

    const db = await openDatabase();
    const tx = db.transaction('apiLibrary', 'readonly');
    expect(await request(tx.objectStore('apiLibrary').count())).toBe(0);
  });
});
