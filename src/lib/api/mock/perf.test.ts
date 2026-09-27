import { describe, it, expect } from 'vitest';
import { buildWorld, viewOf } from './view';
import { newEndpoint, newMockSettings, newNode, rootNode } from '../model/factories';
import type { ApiEndpoint, ApiModel, ApiNode, Contract } from '../model/types';

/**
 * The cost of the panel redrawing while somebody types.
 *
 * The mock is derived, never stored (D1), so every keystroke recomputes it. That
 * is the right trade — nothing saved can contradict the tree — but it has a
 * price, and the price has to be known rather than assumed. 8.4 says: measure
 * first, and do not optimise without the number.
 */
function bigContract(): { contract: Contract; ms: number } {
  const field = (key: string, type: ApiNode['type'] = 'string', format = ''): ApiNode => {
    const n = newNode(key, type);
    n.id = `nod-${key}-${Math.random().toString(36).slice(2)}`;
    n.format = format as ApiNode['format'];
    return n;
  };

  /** A model with 50 fields, nested three deep. */
  const fat = (name: string, id: string): ApiModel => {
    const node = rootNode();
    node.children = [field('id', 'integer')];
    for (let i = 0; i < 30; i++)
      node.children.push(field(`campo${i}`, i % 3 === 0 ? 'integer' : 'string'));
    const dir = field('direccion', 'object');
    dir.children = Array.from({ length: 10 }, (_, i) => field(`d${i}`));
    const geo = field('coordenadas', 'object');
    geo.children = Array.from({ length: 8 }, (_, i) => field(`g${i}`, 'number'));
    dir.children.push(geo);
    node.children.push(dir);
    return { id, name, description: '', node };
  };

  const envelope = (ref: string): ApiNode => {
    const root = rootNode();
    const data = field('data', 'array');
    data.itemType = 'ref';
    data.itemRef = ref;
    const meta = field('meta', 'object');
    meta.children = [
      field('page', 'integer'),
      field('size', 'integer'),
      field('total', 'integer'),
      field('hasNext', 'boolean'),
    ];
    root.children = [data, meta];
    return root;
  };

  const ep = (id: string, path: string, body: ApiNode): ApiEndpoint => {
    const e = newEndpoint('GET', path);
    e.id = id;
    e.responses = [{ id: `res-${id}`, code: '200', description: '', body }];
    return e;
  };

  const models = ['clientes', 'pedidos', 'productos', 'facturas'].map((k, i) => fat(k, `mod-${i}`));
  const contract: Contract = {
    id: 'grande',
    title: 'Grande',
    version: '1.0.0',
    description: '',
    server: 'https://api.ejemplo.com',
    colorSlot: 0,
    models,
    endpoints: ['clientes', 'pedidos', 'productos', 'facturas'].map((k, i) =>
      ep(`ep-${k}`, `/${k}`, envelope(`mod-${i}`)),
    ),
    view: null,
    mock: { ...newMockSettings(4821), size: 45, pageSize: 20, sizes: { pedidos: 225 } },
  };
  return { contract, ms: 0 };
}

describe('redrawing the panel with a big contract', () => {
  it('is fast enough that typing stays usable', () => {
    const { contract } = bigContract();
    const endpoint = contract.endpoints[1];

    // Warm once, then measure the redraw a keystroke causes.
    buildWorld(contract, contract.mock!);
    const started = performance.now();
    const runs = 10;
    let fields = 0;
    for (let i = 0; i < runs; i++) {
      const world = buildWorld(contract, contract.mock!);
      const view = viewOf(world, endpoint, endpoint.responses[0]);
      fields += view.bodies.length;
    }
    const perRedraw = (performance.now() - started) / runs;

    // 225 entities of ~50 fields, all their pages, on every keystroke.
    expect(fields).toBeGreaterThan(0);
    // Generous on purpose: this is a floor that catches an accidental quadratic,
    // not a benchmark. The number it actually takes is printed below.
    expect(perRedraw).toBeLessThan(400);
    console.log(
      `redibujado completo: ${perRedraw.toFixed(1)} ms · 225 entidades × ~50 campos × 12 páginas`,
    );
  });
});
