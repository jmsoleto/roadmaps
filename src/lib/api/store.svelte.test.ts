import { describe, it, expect } from 'vitest';
import { ApiContractsStore } from './store.svelte';
import type { ApiBackend, LoadOutcome } from './storage';
import { emptyApiData, type ApiData, type ApiNode, type Contract } from './model/types';
import { PALETTE_SLOTS } from '../theme/tokens';
import { exampleOf } from './example';

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

// ---- the field tree and everything hanging off it ----

/** A store with one contract open, which is what every tree test needs. */
async function opened() {
  const { store, backend } = await storeWith();
  store.addContract('Catálogo');
  return { store, backend };
}

describe('endpoints', () => {
  it('creates one already open, with a success response in place', async () => {
    const { store } = await opened();
    const ep = store.addEndpoint()!;

    expect(ep.responses).toHaveLength(1);
    expect(ep.responses[0].code).toBe('200');
    expect(store.openEndpoint?.id).toBe(ep.id);
  });

  it('duplicates one into an independent copy, right below the original', async () => {
    const { store } = await opened();
    const original = store.addEndpoint()!;
    store.addParam(original.id);
    const copy = store.duplicateEndpoint(original.id)!;

    expect(store.open!.endpoints.map((e) => e.id)).toEqual([original.id, copy.id]);
    expect(copy.params[0].id).not.toBe(original.params[0].id);
    expect(copy.responses[0].id).not.toBe(original.responses[0].id);

    copy.summary = 'la copia';
    expect(store.open!.endpoints[0].summary).toBe('');
  });

  it('reissues every node id inside a duplicated body', async () => {
    const { store } = await opened();
    const original = store.addEndpoint()!;
    const bodyRoot = original.responses[0].body!;
    store.addChild(bodyRoot.id);

    const copy = store.duplicateEndpoint(original.id)!;
    const copiedRoot = copy.responses[0].body!;

    expect(copiedRoot.id).not.toBe(bodyRoot.id);
    expect(copiedRoot.children[0].id).not.toBe(bodyRoot.children[0].id);
  });

  it('clears the open view when the endpoint being edited is deleted', async () => {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    store.deleteEndpoint(ep.id);

    expect(store.openEndpoint).toBeNull();
    expect(store.open!.view).toBeNull();
  });

  it('keeps the open view when a different endpoint is deleted', async () => {
    const { store } = await opened();
    const first = store.addEndpoint()!;
    const second = store.addEndpoint()!;
    store.deleteEndpoint(first.id);

    expect(store.openEndpoint?.id).toBe(second.id);
  });

  /** Choosing POST is one gesture, not two. */
  it('gives a request body to a method that normally carries one', async () => {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    expect(ep.body).toBeNull();

    store.setMethod(ep.id, 'POST');
    expect(store.open!.endpoints[0].body).not.toBeNull();
  });

  /** Going back to GET after describing a body would throw the description away. */
  it('never takes the body away again', async () => {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    store.setMethod(ep.id, 'POST');
    store.setMethod(ep.id, 'GET');

    expect(store.open!.endpoints[0].body).not.toBeNull();
  });
});

describe('responses and parameters', () => {
  it('adds the error case first, which is what a refinement argues about', async () => {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    expect(store.addResponse(ep.id)?.code).toBe('400');
  });

  it('drops and restores a response body without losing the response', async () => {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    const response = ep.responses[0];

    store.setResponseBody(ep.id, response.id, false);
    expect(store.open!.endpoints[0].responses[0].body).toBeNull();
    expect(store.open!.endpoints[0].responses[0].code).toBe('200');

    store.setResponseBody(ep.id, response.id, true);
    expect(store.open!.endpoints[0].responses[0].body).not.toBeNull();
  });

  it('adds and removes parameters', async () => {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    store.addParam(ep.id);
    const param = store.open!.endpoints[0].params[0];

    expect(store.open!.endpoints[0].params).toHaveLength(1);
    store.deleteParam(ep.id, param.id);
    expect(store.open!.endpoints[0].params).toHaveLength(0);
  });
});

describe('fields', () => {
  async function withBody() {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    return { store, root: ep.responses[0].body! };
  }

  it('adds a child with a key nobody else is using', async () => {
    const { store, root } = await withBody();
    store.addChild(root.id);
    store.addChild(root.id);
    expect(root.children.map((c) => c.key)).toEqual(['campo', 'campo2']);
  });

  it('duplicates a field with its children, right below it', async () => {
    const { store, root } = await withBody();
    const direccion = store.addChild(root.id)!;
    store.setNodeType(direccion.id, 'object');
    const copy = store.duplicateNode(direccion.id)!;

    expect(root.children.map((c) => c.id)).toEqual([direccion.id, copy.id]);
    expect(copy.key).toBe('campo_copia');
    expect(copy.children).toHaveLength(1);
  });

  it('makes the copy independent in both directions', async () => {
    const { store, root } = await withBody();
    const original = store.addChild(root.id)!;
    store.setNodeType(original.id, 'object');
    const copy = store.duplicateNode(original.id)!;

    copy.children[0].key = 'de-la-copia';
    expect(store.node(original.id)!.children[0].key).toBe('campo');
    expect(copy.children[0].id).not.toBe(original.children[0].id);
  });

  it('applies the type coercion rather than just setting the type', async () => {
    const { store, root } = await withBody();
    const field = store.addChild(root.id)!;
    field.example = 'Ana';
    store.setNodeType(field.id, 'object');

    expect(field.children).toHaveLength(1);
    expect(field.example).toBe('');
  });

  it('moves a field among its siblings and refuses to move it out', async () => {
    const { store, root } = await withBody();
    const a = store.addChild(root.id)!;
    const b = store.addChild(root.id)!;

    store.moveNode(b.id, -1);
    expect(root.children.map((c) => c.id)).toEqual([b.id, a.id]);

    store.moveNode(b.id, -1);
    expect(root.children.map((c) => c.id)).toEqual([b.id, a.id]);
  });

  it('deletes a field', async () => {
    const { store, root } = await withBody();
    const field = store.addChild(root.id)!;
    store.deleteNode(field.id);
    expect(root.children).toHaveLength(0);
  });

  it('refuses to delete a body root, which is dropped and not deleted', async () => {
    const { store, root } = await withBody();
    store.deleteNode(root.id);
    expect(store.node(root.id)).not.toBeNull();
  });

  it('folds and unfolds', async () => {
    const { store, root } = await withBody();
    expect(root.open).toBe(true);
    store.toggleOpen(root.id);
    expect(root.open).toBe(false);
  });
});

describe('pasting a JSON into a field', () => {
  async function withBody() {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    return { store, root: ep.responses[0].body! };
  }

  it('builds the tree from a real response', async () => {
    const { store, root } = await withBody();
    const error = store.pasteInto(root.id, '{"pagina":1,"alta":"2026-01-31T10:00:00Z"}');

    expect(error).toBeNull();
    expect(root.children.map((c) => [c.key, c.type])).toEqual([
      ['pagina', 'integer'],
      ['alta', 'string'],
    ]);
    expect(root.children[1].format).toBe('date-time');
  });

  /** Losing half an hour of work to a crooked paste is what must not happen. */
  it('leaves the tree it had when the JSON is invalid', async () => {
    const { store, root } = await withBody();
    store.addChild(root.id);
    const before = root.children.map((c) => c.id);

    const error = store.pasteInto(root.id, 'esto no es json');

    expect(error).not.toBeNull();
    expect(root.children.map((c) => c.id)).toEqual(before);
  });

  it('refuses a bare value without touching anything', async () => {
    const { store, root } = await withBody();
    store.addChild(root.id);
    expect(store.pasteInto(root.id, '42')).not.toBeNull();
    expect(root.children).toHaveLength(1);
  });

  it('replaces what the node had rather than merging into it', async () => {
    const { store, root } = await withBody();
    store.addChild(root.id);
    store.pasteInto(root.id, '{"otro":1}');
    expect(root.children.map((c) => c.key)).toEqual(['otro']);
  });
});

describe('a store that will not open refuses the tree too', () => {
  it('refuses every structural change', async () => {
    const { store } = await storeWith({ kind: 'unavailable', reason: 'cerrada' });

    expect(store.addEndpoint()).toBeNull();
    expect(store.addChild('nod-1')).toBeNull();
    expect(store.duplicateNode('nod-1')).toBeNull();
    expect(store.pasteInto('nod-1', '{}')).not.toBeNull();
    expect(store.contracts).toEqual([]);
  });
});

// ---- models ----

describe('models', () => {
  async function withBody() {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    return { store, root: ep.responses[0].body! };
  }

  it('creates one already open, with a first field', async () => {
    const { store } = await opened();
    const model = store.addModel('Paginacion')!;
    expect(model.node.children).toHaveLength(1);
    expect(store.openModel?.id).toBe(model.id);
  });

  it('duplicates one into an independent copy', async () => {
    const { store } = await opened();
    const original = store.addModel('Paginacion')!;
    const copy = store.duplicateModel(original.id)!;

    expect(copy.name).not.toBe(original.name);
    expect(copy.node.children[0].id).not.toBe(original.node.children[0].id);
    copy.node.children[0].key = 'de-la-copia';
    expect(original.node.children[0].key).toBe('campo');
  });

  it('clears the open view when the model being edited is deleted', async () => {
    const { store } = await opened();
    const model = store.addModel()!;
    store.deleteModel(model.id);
    expect(store.openModel).toBeNull();
  });

  /**
   * Repointing them would invent a decision; blanking them would throw away the
   * comment and the obligation somebody wrote.
   */
  it('leaves the fields pointing at a deleted model as they were', async () => {
    const { store, root } = await withBody();
    const model = store.addModel()!;
    const field = store.addChild(root.id)!;
    store.setNodeType(field.id, 'ref');
    store.setNodeRef(field.id, model.id);

    store.deleteModel(model.id);

    expect(store.node(field.id)?.type).toBe('ref');
    expect(store.node(field.id)?.ref).toBe(model.id);
  });
});

describe('extracting a block to a model', () => {
  async function withObject() {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    const root = ep.responses[0].body!;
    const block = store.addChild(root.id)!;
    block.key = 'paginacion';
    block.description = 'El bloque de siempre';
    block.required = false;
    store.setNodeType(block.id, 'object');
    block.children[0].key = 'pagina';
    store.addChild(block.id)!.key = 'total';
    return { store, root, block };
  }

  /** The guarantee that makes it safe to do live, in front of somebody (D2). */
  it('does not change the generated example', async () => {
    const { store, root, block } = await withObject();
    const before = exampleOf(root, store.open!.models);

    store.extractToModel(block.id);

    expect(exampleOf(root, store.open!.models)).toEqual(before);
  });

  it('leaves the field as a reference with no children of its own', async () => {
    const { store, block } = await withObject();
    const model = store.extractToModel(block.id)!;

    expect(block.type).toBe('ref');
    expect(block.ref).toBe(model.id);
    expect(block.children).toEqual([]);
    expect(model.node.children.map((c) => c.key)).toEqual(['pagina', 'total']);
  });

  /** They belong to the field, not to the block. */
  it('keeps the key, the comment and the obligation on the field', async () => {
    const { store, block } = await withObject();
    store.extractToModel(block.id);

    expect(block.key).toBe('paginacion');
    expect(block.description).toBe('El bloque de siempre');
    expect(block.required).toBe(false);
  });

  it('names the model after the key', async () => {
    const { store, block } = await withObject();
    expect(store.extractToModel(block.id)?.name).toBe('Paginacion');
  });

  it('turns an array of objects into an array of the model', async () => {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    const items = store.addChild(ep.responses[0].body!.id)!;
    items.key = 'items';
    store.setNodeType(items.id, 'array');
    store.setNodeItemType(items.id, 'object');

    const model = store.extractToModel(items.id)!;

    expect(items.type).toBe('array');
    expect(items.itemType).toBe('ref');
    expect(items.itemRef).toBe(model.id);
    expect(model.name).toBe('ItemsItem');
  });
});

describe('expanding a reference', () => {
  async function withTwoRefs() {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    const root = ep.responses[0].body!;
    const model = store.addModel('Paginacion')!;
    model.node.children[0].key = 'pagina';

    const a = store.addChild(root.id)!;
    store.setNodeType(a.id, 'ref');
    store.setNodeRef(a.id, model.id);
    const b = store.addChild(root.id)!;
    store.setNodeType(b.id, 'ref');
    store.setNodeRef(b.id, model.id);

    return { store, model, a, b };
  }

  it('turns the field into an object with a copy of the model’s fields', async () => {
    const { store, a } = await withTwoRefs();
    store.expandRef(a.id);

    expect(a.type).toBe('object');
    expect(a.ref).toBe('');
    expect(a.children.map((c) => c.key)).toEqual(['pagina']);
  });

  /** Expanding copies; it does not move. */
  it('leaves the model and the other references alone', async () => {
    const { store, model, a, b } = await withTwoRefs();
    store.expandRef(a.id);

    expect(store.open!.models).toHaveLength(1);
    expect(model.node.children.map((c) => c.key)).toEqual(['pagina']);
    expect(b.type).toBe('ref');
    expect(b.ref).toBe(model.id);
  });

  it('gives the copied fields new identifiers', async () => {
    const { store, model, a } = await withTwoRefs();
    store.expandRef(a.id);

    expect(a.children[0].id).not.toBe(model.node.children[0].id);
    a.children[0].key = 'cambiado';
    expect(model.node.children[0].key).toBe('pagina');
  });

  it('expands an array of a model into an array of objects', async () => {
    const { store } = await opened();
    const ep = store.addEndpoint()!;
    const model = store.addModel('Item')!;
    const items = store.addChild(ep.responses[0].body!.id)!;
    store.setNodeType(items.id, 'array');
    store.setNodeItemType(items.id, 'ref');
    store.setNodeItemRef(items.id, model.id);

    store.expandRef(items.id);

    expect(items.itemType).toBe('object');
    expect(items.itemRef).toBe('');
    expect(items.children).toHaveLength(1);
  });
});
