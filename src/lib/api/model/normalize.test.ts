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
