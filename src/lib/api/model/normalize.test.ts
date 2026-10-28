import { describe, it, expect } from 'vitest';
import { normalizeApiData } from './normalize';
import type { ApiData } from './types';

const contract = (over: Record<string, unknown> = {}) => ({
  id: 'api-1',
  title: 'Catálogo',
  version: '1.0.0',
  description: '',
  server: '',
  colorSlot: 0,
  models: [],
  endpoints: [{ id: 'ep-1' }],
  view: null,
  ...over,
});

describe('the remembered view', () => {
  it('survives when it names an endpoint that is still there', () => {
    const data = normalizeApiData({
      contracts: [contract({ view: { kind: 'endpoint', id: 'ep-1' } })],
      openId: null,
    } as unknown as ApiData);
    expect(data?.contracts[0].view).toEqual({ kind: 'endpoint', id: 'ep-1' });
  });

  /** A blank editor over a list that still has entries is the failure to avoid. */
  it('is dropped when it names an endpoint that was deleted', () => {
    const data = normalizeApiData({
      contracts: [contract({ view: { kind: 'endpoint', id: 'ep-borrado' } })],
      openId: null,
    } as unknown as ApiData);
    expect(data?.contracts[0].view).toBeNull();
  });

  it('is dropped when it names a model that is not there', () => {
    const data = normalizeApiData({
      contracts: [contract({ view: { kind: 'model', id: 'mod-1' } })],
      openId: null,
    } as unknown as ApiData);
    expect(data?.contracts[0].view).toBeNull();
  });

  it('leaves an absent view absent', () => {
    const data = normalizeApiData({ contracts: [contract()], openId: null } as unknown as ApiData);
    expect(data?.contracts[0].view).toBeNull();
  });
});

/**
 * The mock's settings, and the one property inside a tree that can be wrong.
 *
 * The two rules the rest of this file already pins apply here too: idempotent,
 * and no contract gains a mock it never asked for.
 */
describe('normalising the mock settings', () => {
  const contract = (extra: Record<string, unknown> = {}) => ({
    contracts: [{ id: 'c1', title: 'Pedidos', endpoints: [], models: [], ...extra }],
    openId: null,
  });

  it('leaves a contract that never asked for a mock without one', () => {
    const out = normalizeApiData(contract());
    expect(out?.contracts[0].mock).toBeUndefined();
    expect('mock' in out!.contracts[0]).toBe(false);
  });

  it('completes a half-written mock with the defaults instead of dropping the contract', () => {
    const out = normalizeApiData(contract({ mock: { seed: 4821 } }));
    expect(out?.contracts[0].mock).toEqual({
      seed: 4821,
      size: 45,
      pageSize: 20,
      variants: 3,
      sizes: {},
      pagination: {},
      relations: {},
      collections: {},
      identities: {},
    });
  });

  it('is idempotent over an already normal document', () => {
    const once = normalizeApiData(contract({ mock: { seed: 7 } }));
    const twice = normalizeApiData(structuredClone(once));
    expect(twice).toEqual(once);
  });

  it('refuses a page size of zero, which would divide by it', () => {
    const out = normalizeApiData(contract({ mock: { seed: 1, pageSize: 0 } }));
    expect(out?.contracts[0].mock?.pageSize).toBe(1);
  });

  it('drops the entries of a denied map that cannot be read', () => {
    const out = normalizeApiData(
      contract({
        mock: { seed: 1, sizes: { pedidos: 225, roto: 'muchos' }, relations: { e1: 3 } },
      }),
    );
    expect(out?.contracts[0].mock?.sizes).toEqual({ pedidos: 225 });
    expect(out?.contracts[0].mock?.relations).toEqual({});
  });
});

describe("normalising a field's value source", () => {
  const withNode = (source: unknown) => ({
    contracts: [
      {
        id: 'c1',
        title: 'Pedidos',
        models: [],
        endpoints: [
          {
            id: 'e1',
            method: 'GET',
            path: '/pedidos',
            responses: [
              {
                id: 'r1',
                code: '200',
                body: {
                  id: 'n0',
                  key: '',
                  type: 'object',
                  children: [{ id: 'n1', key: 'estado', type: 'string', children: [], source }],
                },
              },
            ],
          },
        ],
      },
    ],
    openId: null,
  });

  const nodeOf = (raw: unknown) => {
    const out = normalizeApiData(raw);
    return out!.contracts[0].endpoints[0].responses[0].body!.children[0];
  };

  it('keeps an assignment to a saved source', () => {
    const node = nodeOf(withNode({ sourceId: 's1', recipe: null, draw: 'cycle' }));
    expect(node.source).toEqual({ sourceId: 's1', recipe: null, draw: 'cycle' });
  });

  it('falls back to drawing at random when the mode is unreadable', () => {
    const node = nodeOf(withNode({ sourceId: 's1', draw: 'aleatorio' }));
    expect(node.source?.draw).toBe('random');
  });

  it('removes an assignment that names neither a source nor a readable recipe', () => {
    const node = nodeOf(withNode({ sourceId: '', recipe: { kind: 'inventado' } }));
    expect('source' in node).toBe(false);
  });

  it('completes a half-written recipe', () => {
    const node = nodeOf(withNode({ sourceId: '', recipe: { kind: 'integer' }, draw: 'random' }));
    expect(node.source?.recipe).toEqual({ kind: 'integer', min: 1, max: 10 });
  });

  it('drops a loose recipe when a saved source is named: one of the two decides', () => {
    const node = nodeOf(withNode({ sourceId: 's1', recipe: { kind: 'digits', length: 4 } }));
    expect(node.source).toEqual({ sourceId: 's1', recipe: null, draw: 'random' });
  });
});

describe('reading a contract written before the enumeration was a type', () => {
  /**
   * The compatibility of this change, and it is a rule in the single reading
   * door rather than a migration (D9): nothing is lost and nothing is
   * rewritten, because the values were already written and the base type is
   * deduced from them.
   */
  const withField = (field: Record<string, unknown>, model?: Record<string, unknown>) => ({
    contracts: [
      {
        id: 'c1',
        title: 'Pedidos',
        models: model
          ? [
              {
                id: 'm1',
                name: 'Pedido',
                node: { id: 'mn0', key: '', type: 'object', children: [model] },
              },
            ]
          : [],
        endpoints: [
          {
            id: 'e1',
            method: 'GET',
            path: '/pedidos',
            body: {
              id: 'b0',
              key: '',
              type: 'object',
              children: [{ id: 'b1', key: 'filtro', type: 'string', children: [], enums: ['si'] }],
            },
            responses: [
              {
                id: 'r1',
                code: '200',
                body: { id: 'n0', key: '', type: 'object', children: [field] },
              },
            ],
          },
        ],
      },
    ],
    openId: null,
  });

  const read = (raw: unknown) => normalizeApiData(raw)!;
  const fieldOf = (raw: unknown) =>
    read(raw).contracts[0].endpoints[0].responses[0].body!.children[0];

  it('reads a text field with admitted values as an enumeration', () => {
    const node = fieldOf(
      withField({ id: 'n1', key: 'estado', type: 'string', children: [], enums: ['alta', 'baja'] }),
    );
    expect(node.type).toBe('enum');
    expect(node.enums).toEqual(['alta', 'baja']);
  });

  it('reads an integer field with admitted values as an enumeration too', () => {
    const node = fieldOf(
      withField({ id: 'n1', key: 'nivel', type: 'integer', children: [], enums: ['1', '2'] }),
    );
    expect(node.type).toBe('enum');
    expect(node.enums).toEqual(['1', '2']);
  });

  it('leaves a scalar with no admitted values exactly as it was', () => {
    const node = fieldOf(withField({ id: 'n1', key: 'nombre', type: 'string', children: [] }));
    expect(node.type).toBe('string');
  });

  it('leaves a container alone, whatever it carries', () => {
    const node = fieldOf(
      withField({
        id: 'n1',
        key: 'items',
        type: 'array',
        itemType: 'string',
        children: [],
        enums: ['alta'],
      }),
    );
    expect(node.type).toBe('array');
  });

  it('reaches the request body and the models, not only the responses', () => {
    const data = read(
      withField(
        { id: 'n1', key: 'estado', type: 'string', children: [], enums: ['alta'] },
        { id: 'mn1', key: 'moneda', type: 'string', children: [], enums: ['EUR', 'USD'] },
      ),
    );
    expect(data.contracts[0].endpoints[0].body!.children[0].type).toBe('enum');
    expect(data.contracts[0].models[0].node.children[0].type).toBe('enum');
  });

  it('reaches a field nested inside an object', () => {
    const node = fieldOf(
      withField({
        id: 'n1',
        key: 'cliente',
        type: 'object',
        children: [{ id: 'n2', key: 'tipo', type: 'string', children: [], enums: ['a', 'b'] }],
      }),
    );
    expect(node.children[0].type).toBe('enum');
  });

  it('changes nothing on a second pass', () => {
    const raw = withField({
      id: 'n1',
      key: 'estado',
      type: 'string',
      children: [],
      enums: ['alta', 'baja'],
    });
    const once = read(raw);
    const twice = normalizeApiData(JSON.parse(JSON.stringify(once)))!;
    expect(twice).toEqual(once);
  });

  it('leaves a field that already says enum alone', () => {
    const node = fieldOf(
      withField({ id: 'n1', key: 'estado', type: 'enum', children: [], enums: ['alta'] }),
    );
    expect(node.type).toBe('enum');
    expect(node.enums).toEqual(['alta']);
  });
});
