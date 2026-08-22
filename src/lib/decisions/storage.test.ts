import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbBackend, openDatabase } from './storage';
import { vi } from 'vitest';
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
    internalNote: '',
    attachments: [],
    capturedAt: null,
    captureSource: 'tecleado',
    options: [],
    readyAt: null,
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

describe('the attachment store', () => {
  const blob = (n = 32) => new Blob([new Uint8Array(n)], { type: 'image/png' });

  it('round-trips an attachment', async () => {
    const backend = new IndexedDbBackend();
    await backend.putBlob('att1', blob(64));

    const out = await backend.getBlob('att1');
    expect(out).toBeInstanceOf(Blob);
    expect(out!.size).toBe(64);
  });

  it('survives a new connection', async () => {
    await new IndexedDbBackend().putBlob('att1', blob());
    expect(await new IndexedDbBackend().getBlob('att1')).toBeInstanceOf(Blob);
  });

  it('reports nothing for an attachment it does not hold', async () => {
    expect(await new IndexedDbBackend().getBlob('de-otra-maquina')).toBe(null);
  });

  it('deletes attachments and lists what is left', async () => {
    const backend = new IndexedDbBackend();
    await backend.putBlob('a', blob());
    await backend.putBlob('b', blob());
    await backend.putBlob('c', blob());

    await backend.deleteBlobs(['a', 'c']);
    expect((await backend.blobKeys()).sort()).toEqual(['b']);
  });

  it('deleting nothing is not an error', async () => {
    await expect(new IndexedDbBackend().deleteBlobs([])).resolves.toBeUndefined();
  });

  /** The point of D1: bytes and document live in separate records. */
  it('keeps the document out of the attachment store and vice versa', async () => {
    const backend = new IndexedDbBackend();
    await backend.save(doc(2));
    await backend.putBlob('att1', blob(128));

    const out = await backend.load();
    expect(out.kind === 'loaded' && out.data.decisions).toHaveLength(2);
    expect(await backend.blobKeys()).toEqual(['att1']);
    // Writing the document again leaves the bytes untouched.
    await backend.save(doc(3));
    expect((await backend.getBlob('att1'))!.size).toBe(128);
  });
});

describe('a database that never answers', () => {
  /**
   * The failure this guards is the one that reached production: a wedged
   * IndexedDB fires *no* event — not success, not error, not blocked — and an
   * unbounded wait left the whole app unmounted over a store the hub and
   * Roadmaps do not even use.
   */
  it('gives up instead of waiting forever', async () => {
    vi.useFakeTimers();
    try {
      // An open request that will never call anything back.
      globalThis.indexedDB = { open: () => ({}) } as unknown as IDBFactory;

      const pending = openDatabase();
      const settled = vi.fn();
      void pending.catch(settled);

      await vi.advanceTimersByTimeAsync(4000);
      expect(settled).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2000);
      expect(settled).toHaveBeenCalledOnce();
      expect(settled.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(String(settled.mock.calls[0][0])).toMatch(/no responde/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports it as unavailable rather than as empty', async () => {
    vi.useFakeTimers();
    try {
      globalThis.indexedDB = { open: () => ({}) } as unknown as IDBFactory;

      const backend = new IndexedDbBackend();
      const load = backend.load();
      await vi.advanceTimersByTimeAsync(6000);

      const out = await load;
      expect(out.kind).toBe('unavailable');
    } finally {
      vi.useRealTimers();
    }
  });
});
