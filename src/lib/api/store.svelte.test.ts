import { describe, it, expect } from 'vitest';
import { ApiContractsStore } from './store.svelte';
import type { ApiBackend, LoadOutcome } from './storage';
import { emptyApiData, type ApiData, type ApiNode, type Contract } from './model/types';
import { PALETTE_SLOTS } from '../theme/tokens';

class FakeBackend implements ApiBackend {
  saved: ApiData | null = null;

  constructor(private outcome: LoadOutcome<ApiData> = { kind: 'empty' }) {}

  async load(): Promise<LoadOutcome<ApiData>> {
    return this.outcome;
  }

  async save(data: ApiData): Promise<void> {
    this.saved = data;
  }
}

async function storeWith(outcome?: LoadOutcome<ApiData>) {
  const backend = new FakeBackend(outcome);
  const store = new ApiContractsStore(backend);
  await store.init();
  return { store, backend };
}

const node = (key: string, over: Partial<ApiNode> = {}): ApiNode => ({
  id: `nod-${key}`,
  key,
  type: 'string',
  itemType: 'string',
  itemRef: '',
  ref: '',
  description: '',
  example: '',
  required: true,
  format: '',
  enums: [],
  nullable: false,
  children: [],
  open: true,
  ...over,
});

/** A contract with a model, a reference to it, and an endpoint that uses both. */
function wired(): Contract {
  return {
    id: 'api-1',
    title: 'Catálogo',
    version: '1.0.0',
    description: '',
    server: '',
    colorSlot: 0,
    models: [
      {
        id: 'mod-pag',
        name: 'Paginacion',
        description: '',
        node: node('', { type: 'object', children: [node('pagina', { type: 'integer' })] }),
      },
    ],
    endpoints: [
      {
        id: 'ep-1',
        method: 'GET',
        path: '/productos',
        summary: '',
        description: '',
        tags: [],
        params: [
          {
            id: 'par-1',
            in: 'query',
            name: 'pagina',
            type: 'integer',
            required: false,
            description: '',
            example: '',
          },
        ],
        body: null,
        responses: [
          {
            id: 'res-1',
            code: '200',
            description: 'OK',
            body: node('', {
              type: 'object',
              children: [
                node('paginacion', { type: 'ref', ref: 'mod-pag' }),
                node('items', { type: 'array', itemType: 'ref', itemRef: 'mod-pag' }),
              ],
            }),
          },
        ],
      },
    ],
    view: { kind: 'endpoint', id: 'ep-1' },
  };
}

describe('creating contracts', () => {
  it('opens the contract it just created', async () => {
    const { store } = await storeWith();
    const c = store.addContract('Mi Cuenta');
    expect(c).not.toBeNull();
    expect(store.open?.id).toBe(c!.id);
    expect(store.open?.title).toBe('Mi Cuenta');
  });

  it('gives each contract its own palette slot, cycling through them', async () => {
    const { store } = await storeWith();
    for (let i = 0; i < PALETTE_SLOTS + 2; i++) store.addContract(`API ${i}`);
    const slots = store.contracts.map((c) => c.colorSlot);
    expect(slots.slice(0, PALETTE_SLOTS)).toEqual([...Array(PALETTE_SLOTS).keys()]);
    expect(slots[PALETTE_SLOTS]).toBe(0);
  });

  /**
   * The slot is identity, not position (D11). Deleting something above a
   * contract must not repaint it — the mistake Roadmaps already backed out of.
   */
  it('does not recolour the others when one is deleted', async () => {
    const { store } = await storeWith();
    store.addContract('uno');
    const second = store.addContract('dos')!;
    store.deleteContract(store.contracts[0].id);
    expect(store.contract(second.id)?.colorSlot).toBe(1);
  });

  it('accepts two contracts with the same title', async () => {
    const { store } = await storeWith();
    const a = store.addContract('Catálogo')!;
    const b = store.addContract('Catálogo')!;
    expect(a.id).not.toBe(b.id);
    expect(store.contracts).toHaveLength(2);
  });

  it('falls back to a name rather than accepting a blank title', async () => {
    const { store } = await storeWith();
    expect(store.addContract('   ')?.title).toBe('API sin nombre');
  });
});

describe('duplicating a contract', () => {
  it('produces a copy that is independent in both directions', async () => {
    const { store } = await storeWith({
      kind: 'loaded',
      data: { contracts: [wired()], openId: null },
    });
    const copy = store.duplicateContract('api-1')!;

    store.setServer(copy.id, 'https://copia.example');
    store.setServer('api-1', 'https://original.example');

    expect(store.contract(copy.id)?.server).toBe('https://copia.example');
    expect(store.contract('api-1')?.server).toBe('https://original.example');
  });

  it('reissues every identifier inside the copy', async () => {
    const { store } = await storeWith({
      kind: 'loaded',
      data: { contracts: [wired()], openId: null },
    });
    const copy = store.duplicateContract('api-1')!;

    expect(copy.id).not.toBe('api-1');
    expect(copy.models[0].id).not.toBe('mod-pag');
    expect(copy.endpoints[0].id).not.toBe('ep-1');
    expect(copy.endpoints[0].params[0].id).not.toBe('par-1');
    expect(copy.endpoints[0].responses[0].id).not.toBe('res-1');
    expect(copy.models[0].node.id).not.toBe('nod-');
  });

  /**
   * References travel by id. A copy still pointing at the original's model
   * would break the moment either one was edited.
   */
  it('repoints the copy’s references at the copy’s own models', async () => {
    const { store } = await storeWith({
      kind: 'loaded',
      data: { contracts: [wired()], openId: null },
    });
    const copy = store.duplicateContract('api-1')!;
    const body = copy.endpoints[0].responses[0].body!;

    expect(body.children[0].ref).toBe(copy.models[0].id);
    expect(body.children[1].itemRef).toBe(copy.models[0].id);
    expect(body.children[0].ref).not.toBe('mod-pag');
  });

  it('carries the open view over to the copy’s own endpoint', async () => {
    const { store } = await storeWith({
      kind: 'loaded',
      data: { contracts: [wired()], openId: null },
    });
    const copy = store.duplicateContract('api-1')!;
    expect(copy.view).toEqual({ kind: 'endpoint', id: copy.endpoints[0].id });
  });

  it('places the copy right after the original and opens it', async () => {
    const { store } = await storeWith();
    const a = store.addContract('uno')!;
    store.addContract('dos');
    const copy = store.duplicateContract(a.id)!;

    expect(store.contracts.map((c) => c.id)).toEqual([a.id, copy.id, store.contracts[2].id]);
    expect(store.open?.id).toBe(copy.id);
  });
});

describe('deleting, ordering and opening', () => {
  it('lands on the application’s home when the open contract is deleted', async () => {
    const { store } = await storeWith();
    const c = store.addContract('uno')!;
    store.deleteContract(c.id);
    expect(store.open).toBeNull();
    expect(store.data.openId).toBeNull();
  });

  it('keeps the open contract when a different one is deleted', async () => {
    const { store } = await storeWith();
    const first = store.addContract('uno')!;
    const second = store.addContract('dos')!;
    store.deleteContract(first.id);
    expect(store.open?.id).toBe(second.id);
  });

  it('reorders the list', async () => {
    const { store } = await storeWith();
    const a = store.addContract('a')!;
    const b = store.addContract('b')!;
    const c = store.addContract('c')!;
    store.moveContract(c.id, 0);
    expect(store.contracts.map((x) => x.id)).toEqual([c.id, a.id, b.id]);
  });

  it('ignores an attempt to open a contract that is not there', async () => {
    const { store } = await storeWith();
    const c = store.addContract('uno')!;
    store.setOpen('no-existe');
    expect(store.open?.id).toBe(c.id);
  });
});

describe('a store that will not open', () => {
  it('says so instead of showing an empty list', async () => {
    const { store } = await storeWith({ kind: 'unavailable', reason: 'otra pestaña' });
    expect(store.unavailable?.reason).toBe('otra pestaña');
    expect(store.contracts).toEqual([]);
    expect(store.ready).toBe(true);
  });

  it('refuses every mutation while it is down', async () => {
    const { store, backend } = await storeWith({ kind: 'unavailable', reason: 'cerrada' });

    expect(store.addContract('uno')).toBeNull();
    expect(store.duplicateContract('api-1')).toBeNull();
    store.setTitle('api-1', 'x');
    store.deleteContract('api-1');
    store.moveContract('api-1', 0);

    expect(store.contracts).toEqual([]);
    await store.flush();
    expect(backend.saved).toBeNull();
  });
});

describe('loading', () => {
  it('starts empty on a first run', async () => {
    const { store } = await storeWith({ kind: 'empty' });
    expect(store.data).toEqual(emptyApiData());
    expect(store.unavailable).toBeNull();
  });

  it('normalises what it reads, dropping an open id that no longer resolves', async () => {
    const { store } = await storeWith({
      kind: 'loaded',
      data: { contracts: [wired()], openId: 'api-borrado' } as ApiData,
    });
    expect(store.data.openId).toBeNull();
    expect(store.contracts).toHaveLength(1);
  });

  it('treats a document it cannot read as empty rather than failing', async () => {
    const { store } = await storeWith({
      kind: 'loaded',
      data: { nope: true } as unknown as ApiData,
    });
    expect(store.contracts).toEqual([]);
    expect(store.unavailable).toBeNull();
  });
});

describe('saving', () => {
  it('hands the backend a plain document, not the reactive one', async () => {
    const { store, backend } = await storeWith();
    store.addContract('uno');
    await store.flush();

    // The proof that matters: it survives the structured clone the real backend
    // performs, which a `$state` proxy does not (D6).
    expect(() => structuredClone(backend.saved)).not.toThrow();
    expect(backend.saved?.contracts).toHaveLength(1);
  });
});
