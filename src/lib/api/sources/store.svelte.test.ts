import { describe, it, expect } from 'vitest';
import { ValueSourcesStore } from './store.svelte';
import type { ValueSourcesBackend } from '../storage';
import type { ValueSourcesData } from './types';
import type { LoadOutcome } from '../../store/indexeddb';

class Memory implements ValueSourcesBackend {
  saved: ValueSourcesData | null = null;
  constructor(private outcome: LoadOutcome<ValueSourcesData> = { kind: 'empty' }) {}
  load(): Promise<LoadOutcome<ValueSourcesData>> {
    return Promise.resolve(this.outcome);
  }
  save(data: ValueSourcesData): Promise<void> {
    this.saved = data;
    return Promise.resolve();
  }
}

async function ready(outcome?: LoadOutcome<ValueSourcesData>) {
  const backend = new Memory(outcome);
  const store = new ValueSourcesStore(backend);
  await store.init();
  return { store, backend };
}

describe('creating a source', () => {
  it('starts as a list, which is the one worth naming', async () => {
    const { store } = await ready();
    const source = store.create('estados');
    expect(source?.kind).toBe('list');
    expect(store.sources).toHaveLength(1);
  });

  it('does not silently replace another with the same name', async () => {
    const { store } = await ready();
    store.create('estados');
    const second = store.create('estados');
    expect(second?.name).toBe('estados 2');
    expect(store.sources).toHaveLength(2);
  });
});

describe('a source that is not there', () => {
  it('is null rather than a throw: an orphan assignment has to survive', async () => {
    const { store } = await ready();
    expect(store.find('se-borro')).toBeNull();
  });
});

describe('deleting a source', () => {
  it('removes it and leaves everything else alone', async () => {
    const { store } = await ready();
    const a = store.create('estados')!;
    store.create('sucursales');
    store.remove(a.id);
    expect(store.sources.map((s) => s.name)).toEqual(['sucursales']);
  });
});

describe('importing sources', () => {
  const incoming = (name: string, values: string[]) => ({
    id: `foraneo-${name}`,
    name,
    description: '',
    updated: '2026-09-01',
    kind: 'list' as const,
    values,
    recipe: null,
  });

  /**
   * The opposite of the model library, deliberately: a source's id is what every
   * assignment in every contract points at, so keeping it is what repairs a
   * contract imported from the same machine (D16).
   */
  it('adds what is not here under the id it arrived with', async () => {
    const { store } = await ready();
    store.merge([incoming('estados', ['alta'])]);
    expect(store.sources).toHaveLength(1);
    expect(store.sources[0].id).toBe('foraneo-estados');
    expect(store.find('foraneo-estados')?.name).toBe('estados');
  });

  it('issues a fresh id only when that one is already taken by something else', async () => {
    const { store } = await ready();
    store.merge([incoming('mia', ['x'])]);
    store.merge([{ ...incoming('ajena', ['y']), id: 'foraneo-mia' }]);
    expect(store.sources).toHaveLength(2);
    expect(store.find('foraneo-mia')?.name).toBe('mia');
  });

  it('replaces by name, keeping the id the assignments already point at', async () => {
    const { store } = await ready();
    const mine = store.create('estados')!;
    store.merge([incoming('estados', ['alta', 'baja'])]);
    expect(store.sources).toHaveLength(1);
    expect(store.sources[0].id).toBe(mine.id);
    expect(store.sources[0].values).toEqual(['alta', 'baja']);
  });
});

/** `local-persistence`: writing over a store that would not open is the one
 *  failure with no way back, so every mutation refuses instead. */
describe('a store that will not open', () => {
  it('refuses every change rather than writing into a void', async () => {
    const { store, backend } = await ready({ kind: 'unavailable', reason: 'cerrada' });
    expect(store.create('estados')).toBeNull();
    store.merge([]);
    store.remove('lo-que-sea');
    await store.flush();
    expect(store.sources).toHaveLength(0);
    expect(backend.saved).toBeNull();
  });
});

describe('what comes back from the store', () => {
  it('drops a source with no id and keeps the rest', async () => {
    const { store } = await ready({
      kind: 'loaded',
      data: {
        sources: [
          { name: 'sin id' },
          { id: 's1', name: 'estados', kind: 'list', values: ['alta', 7, 'baja'] },
        ],
      } as unknown as ValueSourcesData,
    });
    expect(store.sources).toHaveLength(1);
    expect(store.sources[0].values).toEqual(['alta', 'baja']);
  });

  it('reads a source that claims a recipe it does not have as a list', async () => {
    const { store } = await ready({
      kind: 'loaded',
      data: {
        sources: [{ id: 's1', name: 'codigos', kind: 'recipe', recipe: null }],
      } as unknown as ValueSourcesData,
    });
    expect(store.sources[0].kind).toBe('list');
  });
});
