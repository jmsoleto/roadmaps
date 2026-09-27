import { describe, it, expect } from 'vitest';
import { buildWorld, parentOfChild, viewOf } from './view';
import {
  collectionKey,
  isDetailPath,
  identityMarker,
  parentKey,
  planCollections,
} from './collections';
import { inferRoles, isPaginated } from './pagination';
import { newEndpoint, newMockSettings, newNode, rootNode } from '../model/factories';
import type { ApiEndpoint, ApiModel, ApiNode, Contract, MockSettings } from '../model/types';

const obj = (v: unknown) => v as Record<string, unknown>;

function node(key: string, type: ApiNode['type'] = 'string'): ApiNode {
  return { ...newNode(key, type), id: `nod-${key}-${Math.random().toString(36).slice(2)}` };
}

/** `Cliente`: the shape of the `clientes` collection. */
function clienteModel(): ApiModel {
  const root = rootNode();
  root.children = [node('id', 'integer'), node('nombre'), node('correo')];
  root.children[2].format = 'email';
  return { id: 'mod-cliente', name: 'Cliente', description: '', node: root };
}

/** `Pedido`, with a foreign key to a cliente. */
function pedidoModel(): ApiModel {
  const root = rootNode();
  root.children = [node('id', 'integer'), node('clienteId', 'integer'), node('importe', 'number')];
  return { id: 'mod-pedido', name: 'Pedido', description: '', node: root };
}

/** A `{ data: [...], meta: { page, size, total, hasNext } }` envelope. */
function envelope(modelId: string): ApiNode {
  const root = rootNode();
  const data = node('data', 'array');
  data.itemType = 'ref';
  data.itemRef = modelId;
  const meta = node('meta', 'object');
  meta.children = [
    node('page', 'integer'),
    node('size', 'integer'),
    node('total', 'integer'),
    node('hasNext', 'boolean'),
  ];
  root.children = [data, meta];
  return root;
}

function endpoint(method: ApiEndpoint['method'], path: string, body: ApiNode | null): ApiEndpoint {
  const e = newEndpoint(method, path);
  e.id = `ep-${method}-${path}`;
  e.responses = [
    { id: `res-${e.id}`, code: method === 'POST' ? '201' : '200', description: '', body },
  ];
  return e;
}

function contract(settings: Partial<MockSettings> = {}): {
  contract: Contract;
  settings: MockSettings;
} {
  const detalle = rootNode();
  detalle.type = 'ref';
  detalle.ref = 'mod-cliente';

  const c: Contract = {
    id: 'c1',
    title: 'Pedidos',
    version: '1.0.0',
    description: '',
    server: 'https://api.ejemplo.com',
    colorSlot: 0,
    models: [clienteModel(), pedidoModel()],
    endpoints: [
      endpoint('GET', '/clientes', envelope('mod-cliente')),
      endpoint('GET', '/clientes/{id}', detalle),
      endpoint('GET', '/clientes/{id}/pedidos', envelope('mod-pedido')),
    ],
    view: null,
  };
  // The contract already says which parent the nested endpoint shows.
  c.endpoints[2].params = [
    {
      id: 'p1',
      in: 'path',
      name: 'id',
      type: 'integer',
      required: true,
      description: '',
      example: '7',
    },
  ];
  c.endpoints[1].params = [
    {
      id: 'p2',
      in: 'path',
      name: 'id',
      type: 'integer',
      required: true,
      description: '',
      example: '7',
    },
  ];
  return {
    contract: c,
    settings: { ...newMockSettings(4821), size: 45, pageSize: 20, ...settings },
  };
}

function view(which: number, settings: Partial<MockSettings> = {}) {
  const { contract: c, settings: s } = contract(settings);
  const world = buildWorld(c, s);
  const ep = c.endpoints[which];
  return { world, ep, view: viewOf(world, ep, ep.responses[0]) };
}

describe('reading a path', () => {
  it('takes the last literal segment as the collection', () => {
    expect(collectionKey('/clientes')).toBe('clientes');
    expect(collectionKey('/v1/clientes')).toBe('clientes');
    expect(collectionKey('/clientes/{id}')).toBe('clientes');
    expect(collectionKey('/clientes/{id}/pedidos')).toBe('pedidos');
  });

  it('knows a detail path by its trailing marker', () => {
    expect(isDetailPath('/clientes/{id}')).toBe(true);
    expect(isDetailPath('/clientes')).toBe(false);
    expect(isDetailPath('/clientes/{id}/pedidos')).toBe(false);
  });

  it('reads the parent of a nested path, and the marker that names it', () => {
    expect(parentKey('/clientes/{id}/pedidos')).toBe('clientes');
    expect(parentKey('/clientes')).toBe('');
  });

  /** The gift: the contract already wrote what the identity field is called. */
  it('takes the identity from the marker', () => {
    expect(identityMarker('/clientes/{clienteId}')).toBe('clienteId');
    expect(identityMarker('/clientes')).toBe('');
  });
});

describe('inferring the envelope', () => {
  it('finds the four usual roles', () => {
    const roles = inferRoles(envelope('mod-cliente'));
    expect(roles.items).toBe('data');
    expect(roles.page).toBe('meta.page');
    expect(roles.size).toBe('meta.size');
    expect(roles.total).toBe('meta.total');
    expect(roles.hasNext).toBe('meta.hasNext');
  });

  it('reads the other envelopes people actually write', () => {
    const spring = rootNode();
    const content = node('content', 'array');
    content.itemType = 'object';
    spring.children = [content, node('number', 'integer'), node('totalElements', 'integer')];
    const roles = inferRoles(spring);
    expect(roles.items).toBe('content');
    expect(roles.page).toBe('number');
    expect(roles.total).toBe('totalElements');
  });

  it('does not take a field called data that is an object for the elements', () => {
    const body = rootNode();
    const data = node('data', 'object');
    data.children = [node('nombre')];
    body.children = [data];
    expect(inferRoles(body).items).toBe('');
  });

  /** Without another role, two pages would be indistinguishable (D15). */
  it('is not pagination when only the elements were found', () => {
    const body = rootNode();
    const items = node('items', 'array');
    items.itemType = 'object';
    body.children = [items];
    const roles = inferRoles(body);
    expect(roles.items).toBe('items');
    expect(isPaginated(roles)).toBe(false);
  });

  it('never goes into an array looking for a total', () => {
    const body = rootNode();
    const data = node('data', 'array');
    data.itemType = 'object';
    data.children = [node('total', 'number')];
    body.children = [data];
    expect(inferRoles(body).total).toBe('');
  });
});

describe('the pages of a list', () => {
  it('cuts 45 into 20, 20 and 5, and says 45 in all three', () => {
    const { view: v } = view(0);
    expect(v.kind).toBe('page');
    expect(v.bodies).toHaveLength(3);
    const sizes = v.bodies.map((b) => (obj(b).data as unknown[]).length);
    expect(sizes).toEqual([20, 20, 5]);
    for (const body of v.bodies) expect(obj(obj(body).meta).total).toBe(45);
  });

  it('numbers the pages from one, and says when there is no next', () => {
    const { view: v } = view(0);
    expect(v.bodies.map((b) => obj(obj(b).meta).page)).toEqual([1, 2, 3]);
    expect(v.bodies.map((b) => obj(obj(b).meta).hasNext)).toEqual([true, true, false]);
  });

  it('repeats no element and loses none', () => {
    const { view: v } = view(0);
    const ids = v.bodies.flatMap((b) =>
      (obj(b).data as Record<string, unknown>[]).map((d) => d.id),
    );
    expect(ids).toHaveLength(45);
    expect(new Set(ids).size).toBe(45);
  });

  it('cuts an exact multiple without an empty last page', () => {
    const { view: v } = view(0, { size: 40, pageSize: 20 });
    expect(v.bodies).toHaveLength(2);
  });

  it('still emits one page, with the envelope, for an empty list', () => {
    const { view: v } = view(0, { sizes: { clientes: 0 } });
    expect(v.bodies).toHaveLength(1);
    expect(obj(v.bodies[0]).data).toEqual([]);
    expect(obj(obj(v.bodies[0]).meta).total).toBe(0);
  });
});

describe('the detail is the one from the list', () => {
  it('says exactly what the list said about that entity', () => {
    const { view: list } = view(0);
    const { view: detail } = view(1);
    const seventh = (obj(list.bodies[0]).data as Record<string, unknown>[])[6];
    expect(detail.bodies[0]).toEqual(seventh);
  });

  it("shows the entity the path parameter's example names", () => {
    const { view: detail } = view(1);
    expect(obj(detail.bodies[0]).id).toBe(7);
  });
});

describe('the children of a parent', () => {
  it("shows only that parent's, and totals those", () => {
    const { view: v } = view(2, { sizes: { pedidos: 225 } });
    expect(v.kind).toBe('page');
    const all = v.bodies.flatMap((b) => obj(b).data as Record<string, unknown>[]);
    const total = obj(obj(v.bodies[0]).meta).total as number;
    expect(all).toHaveLength(total);
    expect(total).toBeLessThan(225);
    expect(total).toBeGreaterThan(0);
  });

  it('names which parent it is showing', () => {
    const { view: v } = view(2, { sizes: { pedidos: 225 } });
    expect(v.note).toContain('7');
  });
});

describe('spreading children over parents', () => {
  it('leaves no parent without one when there are enough to go round', () => {
    const counts = new Map<number, number>();
    for (let child = 0; child < 225; child++) {
      const parent = parentOfChild(child, 45, 4821, 'pedidos');
      counts.set(parent, (counts.get(parent) ?? 0) + 1);
    }
    expect(counts.size).toBe(45);
    for (let p = 0; p < 45; p++) expect(counts.get(p)).toBeGreaterThanOrEqual(1);
  });

  it('does not give them all the same number, which no real data does', () => {
    const counts = new Map<number, number>();
    for (let child = 0; child < 225; child++) {
      const parent = parentOfChild(child, 45, 4821, 'pedidos');
      counts.set(parent, (counts.get(parent) ?? 0) + 1);
    }
    expect(new Set(counts.values()).size).toBeGreaterThan(1);
  });
});

describe("the identity is the dataset's", () => {
  it('runs from one, so «el cliente 7» is the seventh', () => {
    const { view: v } = view(0);
    const ids = (obj(v.bodies[0]).data as Record<string, unknown>[]).map((d) => d.id);
    expect(ids.slice(0, 3)).toEqual([1, 2, 3]);
  });

  it('is found even when the model declares none', () => {
    const { contract: c, settings } = contract();
    const plan = planCollections(c, settings);
    expect(plan.collections.get('clientes')?.identity).toBe('id');
  });
});

describe('a write against a collection', () => {
  it("answers with an entity that is not one of the list's", () => {
    const { contract: c, settings } = contract();
    const post = endpoint(
      'POST',
      '/clientes',
      (() => {
        const r = rootNode();
        r.type = 'ref';
        r.ref = 'mod-cliente';
        return r;
      })(),
    );
    c.endpoints.push(post);
    const world = buildWorld(c, settings);
    const v = viewOf(world, post, post.responses[0]);
    expect(v.kind).toBe('single');
    expect(obj(v.bodies[0]).id).toBe(46);
  });
});

/** D5: a model that is a collection's shape is drawn from it, wherever it is. */
describe('a reference to a model that is a collection', () => {
  function withEmbedded() {
    const { contract: c, settings } = contract();
    const pedido = c.models.find((m) => m.id === 'mod-pedido')!;
    const cliente = node('cliente', 'ref');
    cliente.ref = 'mod-cliente';
    pedido.node.children.push(cliente);
    return { c, settings };
  }

  it("embeds one of the list's clientes, not a fresh one", () => {
    const { c, settings } = withEmbedded();
    const world = buildWorld(c, settings);
    const lista = viewOf(world, c.endpoints[0], c.endpoints[0].responses[0]);
    const clientes = lista.bodies.flatMap((b) => obj(b).data as Record<string, unknown>[]);

    const pedidos = viewOf(world, c.endpoints[2], c.endpoints[2].responses[0]);
    const uno = (obj(pedidos.bodies[0]).data as Record<string, unknown>[])[0];
    const embedded = uno.cliente as Record<string, unknown>;

    expect(embedded).toBeDefined();
    expect(clientes).toContainEqual(embedded);
  });

  it('does not hang when two collections embed each other', () => {
    const { c, settings } = withEmbedded();
    const clienteModel = c.models.find((m) => m.id === 'mod-cliente')!;
    const ultimo = node('ultimoPedido', 'ref');
    ultimo.ref = 'mod-pedido';
    clienteModel.node.children.push(ultimo);

    const world = buildWorld(c, settings);
    const v = viewOf(world, c.endpoints[0], c.endpoints[0].responses[0]);
    expect(obj(v.bodies[0]).data as unknown[]).toHaveLength(20);
  });

  it('does not hang on a model that contains itself', () => {
    const { contract: c, settings } = contract();
    const cliente = c.models.find((m) => m.id === 'mod-cliente')!;
    const jefe = node('recomendadoPor', 'ref');
    jefe.ref = 'mod-cliente';
    cliente.node.children.push(jefe);
    const world = buildWorld(c, settings);
    const v = viewOf(world, c.endpoints[0], c.endpoints[0].responses[0]);
    expect(obj(v.bodies[0]).data as unknown[]).toHaveLength(20);
  });
});

/** D3: identity is the dataset's, and a dropdown may not take it away. */
describe('a source assigned to the identity field', () => {
  it('is ignored, and the identities stay unique', () => {
    const { contract: c, settings } = contract();
    const cliente = c.models.find((m) => m.id === 'mod-cliente')!;
    const id = cliente.node.children.find((n) => n.key === 'id')!;
    id.source = { sourceId: 's-fija', recipe: null, draw: 'random' };

    const world = buildWorld(c, settings, {
      // A source that would answer 1 for every single entity.
      scalar: (node) => (node.source === undefined ? null : 1),
    });
    const v = viewOf(world, c.endpoints[0], c.endpoints[0].responses[0]);
    const ids = v.bodies.flatMap((b) =>
      (obj(b).data as Record<string, unknown>[]).map((d) => d.id),
    );
    expect(new Set(ids).size).toBe(45);
    expect(ids.slice(0, 3)).toEqual([1, 2, 3]);
  });
});

/** An endpoint that is not about any collection still gets a mock, and says so. */
describe('an endpoint with no collection', () => {
  it('gets its variants and no collection key', () => {
    const { contract: c, settings } = contract();
    const body = rootNode();
    body.children = [node('token'), node('expira')];
    const login = endpoint('POST', '/login', body);
    c.endpoints.push(login);
    const world = buildWorld(c, { ...settings, collections: { [login.id]: '' } });
    const v = viewOf(world, login, login.responses[0]);
    expect(v.kind).toBe('variant');
    expect(v.bodies).toHaveLength(3);
    expect(v.collectionKey).toBe('');
  });
});

/**
 * The filter and the data must agree. A nested endpoint that selects nine
 * pedidos, each naming a different cliente, is the most visible incoherence a
 * mock can have — and the one this whole feature exists to kill.
 */
describe('a child carries the identity of its parent', () => {
  it('names the parent the nested endpoint filtered by', () => {
    const { view: v } = view(2, { sizes: { pedidos: 225 } });
    const hijos = v.bodies.flatMap((b) => obj(b).data as Record<string, unknown>[]);
    expect(hijos.length).toBeGreaterThan(0);
    for (const pedido of hijos) expect(pedido.clienteId).toBe(7);
  });

  it('names a cliente that actually exists, even in the unfiltered list', () => {
    const { contract: c, settings } = contract({ sizes: { pedidos: 225 } });
    const sueltos = endpoint('GET', '/pedidos', envelope('mod-pedido'));
    c.endpoints.push(sueltos);
    const world = buildWorld(c, {
      ...settings,
      relations: { [sueltos.id]: { parent: 'clientes', foreignKey: 'clienteId' } },
    });
    const v = viewOf(world, sueltos, sueltos.responses[0]);
    const hijos = v.bodies.flatMap((b) => obj(b).data as Record<string, unknown>[]);
    for (const pedido of hijos) {
      expect(pedido.clienteId as number).toBeGreaterThanOrEqual(1);
      expect(pedido.clienteId as number).toBeLessThanOrEqual(45);
    }
  });

  it('says whose children they are in words somebody would use', () => {
    const { view: v } = view(2, { sizes: { pedidos: 225 } });
    expect(v.note).toBe('pedidos de cliente 7');
  });

  it('emits the whole child collection when the relation is denied', () => {
    const { contract: c, settings } = contract({ sizes: { pedidos: 225 } });
    const anidado = c.endpoints[2];
    const world = buildWorld(c, {
      ...settings,
      relations: { [anidado.id]: { parent: '', foreignKey: '' } },
    });
    const v = viewOf(world, anidado, anidado.responses[0]);
    expect(obj(obj(v.bodies[0]).meta).total).toBe(225);
  });
});

/**
 * D9: what has a role is honoured, what has none is not — and the difference is
 * said out loud rather than passed over.
 */
describe('what the mock does with the query', () => {
  function withQuery(params: { name: string; example: string }[]) {
    const { contract: c, settings } = contract();
    const lista = c.endpoints[0];
    lista.params = params.map((p, i) => ({
      id: `q${i}`,
      in: 'query' as const,
      name: p.name,
      type: 'integer' as const,
      required: false,
      description: '',
      example: p.example,
    }));
    const world = buildWorld(c, settings);
    return viewOf(world, lista, lista.responses[0]);
  }

  it('honours the size a query parameter asks for', () => {
    const v = withQuery([{ name: 'size', example: '15' }]);
    expect(v.bodies).toHaveLength(3);
    expect((obj(v.bodies[0]).data as unknown[]).length).toBe(15);
    expect(obj(obj(v.bodies[2]).meta).size).toBe(15);
  });

  it('opens on the page a query parameter asks for', () => {
    const v = withQuery([{ name: 'page', example: '2' }]);
    expect(v.defaultStep).toBe(1);
  });

  it('names the parameters it leaves alone', () => {
    const v = withQuery([
      { name: 'estado', example: 'enviado' },
      { name: 'page', example: '1' },
      { name: 'size', example: '20' },
    ]);
    expect(v.ignoredParams).toEqual(['estado']);
  });

  it('does not pretend to filter by one', () => {
    const v = withQuery([{ name: 'estado', example: 'enviado' }]);
    expect(obj(obj(v.bodies[0]).meta).total).toBe(45);
  });
});

describe('stepping from one parent to the next', () => {
  it('shows another parent’s children, with its own total', () => {
    const { contract: c, settings } = contract({ sizes: { pedidos: 225 } });
    const world = buildWorld(c, settings);
    const anidado = c.endpoints[2];

    const septimo = viewOf(world, anidado, anidado.responses[0]);
    const octavo = viewOf(world, anidado, anidado.responses[0], 7);

    expect(septimo.parent).toEqual({ key: 'clientes', index: 6, count: 45 });
    expect(octavo.parent?.index).toBe(7);
    expect(octavo.note).toBe('pedidos de cliente 8');
    for (const pedido of obj(octavo.bodies[0]).data as Record<string, unknown>[]) {
      expect(pedido.clienteId).toBe(8);
    }
  });

  it('clamps rather than falling off the end of the parents', () => {
    const { contract: c, settings } = contract({ sizes: { pedidos: 225 } });
    const world = buildWorld(c, settings);
    const anidado = c.endpoints[2];
    expect(viewOf(world, anidado, anidado.responses[0], 999).parent?.index).toBe(44);
    expect(viewOf(world, anidado, anidado.responses[0], -3).parent?.index).toBe(0);
  });
});

/**
 * Extracting a block to a model reorganises a contract, it does not change it —
 * which is what lets somebody do it live in front of an audience. The example
 * already promises to come out identical; the mock has to make the same promise,
 * or the gesture would silently reshuffle every entity on screen.
 *
 * It holds because a reference is **not a level of the JSON**: the model's
 * fields hang off the referencing field's path, so extracting leaves every
 * coordinate exactly where it was.
 */
describe('extracting a block to a model', () => {
  it('leaves the mock identical', () => {
    // Inline: the elements are objects written in place.
    const inline = (): Contract => {
      const { contract: c } = contract();
      const items = node('data', 'array');
      items.itemType = 'object';
      items.children = [node('id', 'integer'), node('nombre'), node('correo')];
      const meta = node('meta', 'object');
      meta.children = [node('page', 'integer'), node('total', 'integer')];
      const root = rootNode();
      root.children = [items, meta];
      const ep0 = endpoint('GET', '/clientes', root);
      return { ...c, models: [], endpoints: [ep0] };
    };

    // Extracted: the same fields, as a model the array points at.
    const extracted = (): Contract => {
      const base = inline();
      const items = base.endpoints[0].responses[0].body!.children[0];
      const model: ApiModel = {
        id: 'mod-extraido',
        name: 'Cliente',
        description: '',
        node: { ...rootNode(), children: items.children },
      };
      const asRef = { ...items, itemType: 'ref' as const, itemRef: 'mod-extraido', children: [] };
      const body = {
        ...base.endpoints[0].responses[0].body!,
        children: [asRef, base.endpoints[0].responses[0].body!.children[1]],
      };
      const ep0 = {
        ...base.endpoints[0],
        responses: [{ ...base.endpoints[0].responses[0], body }],
      };
      return { ...base, models: [model], endpoints: [ep0] };
    };

    const settings = { ...newMockSettings(4821), size: 45, pageSize: 20 };
    const antes = viewOf(
      buildWorld(inline(), settings),
      inline().endpoints[0],
      inline().endpoints[0].responses[0],
    );
    const c2 = extracted();
    const despues = viewOf(buildWorld(c2, settings), c2.endpoints[0], c2.endpoints[0].responses[0]);

    expect(despues.bodies).toEqual(antes.bodies);
  });
});
