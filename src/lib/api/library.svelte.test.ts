import { describe, it, expect } from 'vitest';
import { ApiLibraryStore } from './library.svelte';
import type { LibraryBackend, LoadOutcome } from './storage';
import { emptyLibrary, type LibraryData } from './library/types';
import { newNode, rootNode } from './model/factories';
import type { ApiModel, Contract } from './model/types';

class FakeBackend implements LibraryBackend {
  saved: LibraryData | null = null;
  constructor(private outcome: LoadOutcome<LibraryData> = { kind: 'empty' }) {}
  async load(): Promise<LoadOutcome<LibraryData>> {
    return this.outcome;
  }
  async save(data: LibraryData): Promise<void> {
    this.saved = data;
  }
}

async function storeWith(outcome?: LoadOutcome<LibraryData>) {
  const backend = new FakeBackend(outcome);
  const store = new ApiLibraryStore(backend);
  await store.init();
  return { store, backend };
}

function model(id: string, name: string, fields: ReturnType<typeof newNode>[] = []): ApiModel {
  const node = rootNode();
  node.children = fields;
  return { id, name, description: '', node };
}

const refTo = (key: string, id: string) => {
  const node = newNode(key, 'ref');
  node.ref = id;
  return node;
};

const contract = (models: ApiModel[]): Contract => ({
  id: 'api-1',
  title: 'Catálogo',
  version: '1.0.0',
  description: '',
  server: '',
  colorSlot: 0,
  models,
  endpoints: [],
  view: null,
});

describe('saving', () => {
  it('saves the model with what it depends on', async () => {
    const { store } = await storeWith();
    const c = contract([
      model('a', 'ItemProducto', [refTo('p', 'b')]),
      model('b', 'Paginacion', [newNode('pagina')]),
    ]);

    const entry = store.save(c, 'a')!;
    expect(entry.name).toBe('ItemProducto');
    expect(entry.models.map((m) => m.name)).toEqual(['ItemProducto', 'Paginacion']);
    expect(store.entries).toHaveLength(1);
  });

  /** The name is the key: two `Paginacion` defeat the point of a library (D6). */
  it('replaces the entry of the same name instead of adding a second', async () => {
    const { store } = await storeWith();
    const c = contract([model('a', 'Paginacion', [newNode('pagina')])]);
    store.save(c, 'a');

    const c2 = contract([model('a', 'Paginacion', [newNode('pagina'), newNode('total')])]);
    store.save(c2, 'a');

    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].models[0].node.children).toHaveLength(2);
  });

  it('records when it was saved', async () => {
    const { store } = await storeWith();
    expect(store.save(contract([model('a', 'A')]), 'a')?.updated).toBeTruthy();
  });

  it('finds an entry by name, which is how a collision is spotted', async () => {
    const { store } = await storeWith();
    store.save(contract([model('a', 'Paginacion')]), 'a');
    expect(store.entryNamed('Paginacion')).not.toBeNull();
    expect(store.entryNamed('Otro')).toBeNull();
  });
});

describe('removing', () => {
  it('drops the entry', async () => {
    const { store } = await storeWith();
    const entry = store.save(contract([model('a', 'A')]), 'a')!;
    store.remove(entry.id);
    expect(store.entries).toEqual([]);
  });
});

describe('bringing', () => {
  it('hands back what a contract would receive', async () => {
    const { store } = await storeWith();
    const source = contract([
      model('a', 'ItemProducto', [refTo('p', 'b')]),
      model('b', 'Paginacion'),
    ]);
    const entry = store.save(source, 'a')!;

    const out = store.bring(contract([]), entry.id, new Map())!;
    expect(out.models.map((m) => m.name)).toEqual(['ItemProducto', 'Paginacion']);
    expect(out.models[0].node.children[0].ref).toBe(out.models[1].id);
  });

  it('returns nothing for an entry that is not there', async () => {
    const { store } = await storeWith();
    expect(store.bring(contract([]), 'lib-inventada', new Map())).toBeNull();
  });

  /** Editing what was brought must not reach back into the library. */
  it('hands back copies, not the entry’s own models', async () => {
    const { store } = await storeWith();
    const entry = store.save(contract([model('a', 'A', [newNode('campo')])]), 'a')!;

    const out = store.bring(contract([]), entry.id, new Map())!;
    out.models[0].node.children[0].key = 'cambiado';

    expect(store.entries[0].models[0].node.children[0].key).toBe('campo');
  });
});

describe('importing entries', () => {
  it('adds what is new and replaces by name what is not', async () => {
    const { store } = await storeWith();
    store.save(contract([model('a', 'Paginacion', [newNode('pagina')])]), 'a');

    store.append([
      {
        id: 'lib-x',
        name: 'Paginacion',
        description: '',
        updated: '2026-01-01T00:00:00Z',
        models: [model('x', 'Paginacion', [newNode('p'), newNode('t')])],
      },
      {
        id: 'lib-y',
        name: 'Moneda',
        description: '',
        updated: '2026-01-01T00:00:00Z',
        models: [model('y', 'Moneda')],
      },
    ]);

    expect(store.entries.map((e) => e.name)).toEqual(['Paginacion', 'Moneda']);
    expect(store.entries[0].models[0].node.children).toHaveLength(2);
  });
});

describe('a store that will not open', () => {
  it('says so instead of showing an empty library', async () => {
    const { store } = await storeWith({ kind: 'unavailable', reason: 'cerrada' });
    expect(store.unavailable?.reason).toBe('cerrada');
    expect(store.entries).toEqual([]);
    expect(store.ready).toBe(true);
  });

  it('refuses every mutation while it is down', async () => {
    const { store, backend } = await storeWith({ kind: 'unavailable', reason: 'cerrada' });

    expect(store.save(contract([model('a', 'A')]), 'a')).toBeNull();
    store.append([{ id: 'x', name: 'X', description: '', updated: '', models: [model('x', 'X')] }]);
    store.remove('x');

    expect(store.entries).toEqual([]);
    await store.flush();
    expect(backend.saved).toBeNull();
  });
});

describe('loading', () => {
  it('starts empty on a first run', async () => {
    const { store } = await storeWith({ kind: 'empty' });
    expect(store.data).toEqual(emptyLibrary());
  });

  it('treats a document it cannot read as empty', async () => {
    const { store } = await storeWith({
      kind: 'loaded',
      data: { nope: true } as unknown as LibraryData,
    });
    expect(store.entries).toEqual([]);
    expect(store.unavailable).toBeNull();
  });
});

describe('saving to the backend', () => {
  it('hands it a plain document, not the reactive one', async () => {
    const { store, backend } = await storeWith();
    store.save(contract([model('a', 'A')]), 'a');
    await store.flush();

    expect(() => structuredClone(backend.saved)).not.toThrow();
    expect(backend.saved?.entries).toHaveLength(1);
  });
});
