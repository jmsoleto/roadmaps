import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbBackend, openDatabase } from './storage';
import type { DecisionsData } from './model/types';

const doc = (n: number): DecisionsData => ({
  decisions: Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    origin: `duda ${i}`,
    originContext: '',
    question: '',
    project: '',
    stakeholder: '',
    deadline: null,
    impact: null,
    notes: '',
    options: [],
    raisedAt: null,
    recommendation: null,
    resolution: null,
  })),
});

// A fresh database per test, so one test's document never leaks into the next.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('the Decisions store', () => {
  it('reports an empty store on a first run', async () => {
    const backend = new IndexedDbBackend();
    expect(await backend.load()).toEqual({ kind: 'empty' });
  });

  it('round-trips a document', async () => {
    const backend = new IndexedDbBackend();
    await backend.save(doc(2));

    const out = await backend.load();
    expect(out.kind).toBe('loaded');
    expect(out.kind === 'loaded' && out.data.decisions).toHaveLength(2);
    expect(out.kind === 'loaded' && out.data.decisions[1].origin).toBe('duda 1');
  });

  it('survives a new connection to the same database', async () => {
    await new IndexedDbBackend().save(doc(3));

    // A different instance, as a reload would produce.
    const out = await new IndexedDbBackend().load();
    expect(out.kind === 'loaded' && out.data.decisions).toHaveLength(3);
  });

  it('replaces the document rather than appending to it', async () => {
    const backend = new IndexedDbBackend();
    await backend.save(doc(3));
    await backend.save(doc(1));

    const out = await backend.load();
    expect(out.kind === 'loaded' && out.data.decisions).toHaveLength(1);
  });

  /**
   * The requirement that matters: a store that cannot be opened must not look
   * like a store with nothing in it. Arriving on an empty list over real data
   * invites writing over it, and there is no server to recover from.
   */
  it('reports a store that will not open as unavailable, not as empty', async () => {
    const backend = new IndexedDbBackend(() =>
      Promise.reject(new Error('otra pestaña tiene abierta una versión anterior de los datos')),
    );

    const out = await backend.load();
    expect(out.kind).toBe('unavailable');
    expect(out.kind === 'unavailable' && out.reason).toMatch(/otra pestaña/);
  });

  it('refuses to save when the store will not open', async () => {
    const backend = new IndexedDbBackend(() => Promise.reject(new Error('nope')));
    await expect(backend.save(doc(1))).rejects.toThrow('nope');
  });

  /**
   * A record that is there but malformed is a different thing from a store that
   * would not open: the store opened fine. Same treatment Roadmaps gives an
   * unreadable document — start empty and stay usable.
   */
  it('treats an unreadable document as empty, not as unavailable', async () => {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('decisions', 'readwrite');
      tx.objectStore('decisions').put({ nope: true }, 'doc:v1');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    expect(await new IndexedDbBackend().load()).toEqual({ kind: 'empty' });
  });

  it('does not touch any localStorage key', async () => {
    const before = JSON.stringify(
      typeof localStorage === 'undefined' ? [] : Object.keys(localStorage).sort(),
    );
    await new IndexedDbBackend().save(doc(5));
    const after = JSON.stringify(
      typeof localStorage === 'undefined' ? [] : Object.keys(localStorage).sort(),
    );
    expect(after).toBe(before);
  });
});
