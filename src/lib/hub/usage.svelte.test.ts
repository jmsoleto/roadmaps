import { describe, it, expect } from 'vitest';
import { UsageStore } from './usage.svelte';
import type { Storage } from '../store/storage';
import type { AppData } from '../model/types';

/** In-memory preference backend; the data side is never touched here. */
class FakePrefs implements Storage {
  prefs = new Map<string, string>();
  /** Every read/write in order, to assert that the read comes first. */
  calls: string[] = [];

  async load(): Promise<AppData | null> {
    return null;
  }
  async save(): Promise<void> {}
  async getPref(key: string): Promise<string | null> {
    this.calls.push(`get ${key}`);
    return this.prefs.get(key) ?? null;
  }
  async setPref(key: string, value: string): Promise<void> {
    this.calls.push(`set ${key}`);
    this.prefs.set(key, value);
  }
}

describe('usage store', () => {
  it('reports no previous access on a first run', async () => {
    const backend = new FakePrefs();
    const store = new UsageStore(backend);
    await store.init(1000);

    expect(store.lastSeen).toBe(null);
    expect(store.recent.roadmaps).toEqual([]);
  });

  /**
   * The whole point of the requirement: writing this session's stamp before
   * reading the previous one would make the hub always say "hoy", now.
   */
  it("reads the previous stamp before writing this session's", async () => {
    const backend = new FakePrefs();
    backend.prefs.set('hub.lastSeen', '1000');

    const store = new UsageStore(backend);
    await store.init(9999);

    expect(store.lastSeen).toBe(1000);
    expect(backend.prefs.get('hub.lastSeen')).toBe('9999');
    expect(backend.calls.indexOf('get hub.lastSeen')).toBeLessThan(
      backend.calls.indexOf('set hub.lastSeen'),
    );
  });

  it('restores the recent openings it stored', async () => {
    const backend = new FakePrefs();
    const first = new UsageStore(backend);
    await first.init(1000);
    first.touch('roadmaps', 'r1', 1100);
    first.touch('roadmaps', 'r2', 1200);

    const second = new UsageStore(backend);
    await second.init(2000);
    expect(second.recent.roadmaps.map((e) => e.id)).toEqual(['r2', 'r1']);
  });

  it('filters recent openings against the roadmaps that still exist', async () => {
    const backend = new FakePrefs();
    const store = new UsageStore(backend);
    await store.init(1000);
    store.touch('roadmaps', 'gone', 1100);
    store.touch('roadmaps', 'alive', 1200);

    expect(store.live('roadmaps', ['alive']).map((e) => e.id)).toEqual(['alive']);
    // Filtering on read leaves the stored list alone — nothing to keep in step.
    expect(store.recent.roadmaps.map((e) => e.id)).toEqual(['alive', 'gone']);
  });
});

describe('one list per application', () => {
  it('keeps each application’s openings apart', async () => {
    const backend = new FakePrefs();
    const store = new UsageStore(backend);
    await store.init(1000);

    store.touch('roadmaps', 'r1', 1100);
    store.touch('api', 'c1', 1200);

    expect(store.recent.roadmaps.map((e) => e.id)).toEqual(['r1']);
    expect(store.recent.api.map((e) => e.id)).toEqual(['c1']);
    expect(store.live('api', ['r1'])).toEqual([]);
  });

  /**
   * Roadmaps keeps the unscoped key it has written since before there was a
   * second application, so updating does not empty anyone's list.
   */
  it('reads Roadmaps’ openings from the key it already used', async () => {
    const backend = new FakePrefs();
    backend.prefs.set('hub.recent', JSON.stringify([{ id: 'viejo', at: 900 }]));

    const store = new UsageStore(backend);
    await store.init(1000);

    expect(store.recent.roadmaps.map((e) => e.id)).toEqual(['viejo']);
  });

  it('scopes every other application’s key by its id', async () => {
    const backend = new FakePrefs();
    const store = new UsageStore(backend);
    await store.init(1000);
    store.touch('api', 'c1', 1100);

    expect(backend.prefs.has('hub.recent:api')).toBe(true);
    expect(backend.prefs.get('hub.recent')).toBeUndefined();
  });
});
