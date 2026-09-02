import { describe, it, expect } from 'vitest';
import {
  directDependencies,
  extractedName,
  modelDependencies,
  pascal,
  uniqueModelName,
  usesOf,
} from './models';
import { newEndpoint, newNode, rootNode } from './factories';
import type { ApiModel, Contract } from './types';

function model(id: string, name: string, fields: ReturnType<typeof newNode>[] = []): ApiModel {
  const node = rootNode();
  node.children = fields;
  return { id, name, description: '', node };
}

/** An endpoint whose 200 body holds the given fields. */
function endpoint(path: string, fields: ReturnType<typeof newNode>[]) {
  const ep = newEndpoint('GET', path);
  ep.responses[0].body!.children = fields;
  return ep;
}

const refTo = (key: string, id: string) => {
  const node = newNode(key, 'ref');
  node.ref = id;
  return node;
};

const arrayOf = (key: string, id: string) => {
  const node = newNode(key, 'array');
  node.itemType = 'ref';
  node.itemRef = id;
  return node;
};

const contract = (over: Partial<Contract> = {}): Contract => ({
  id: 'api-1',
  title: 'Catálogo',
  version: '1.0.0',
  description: '',
  server: '',
  colorSlot: 0,
  models: [],
  endpoints: [],
  view: null,
  ...over,
});

describe('naming', () => {
  it('folds accents instead of splitting on them', () => {
    expect(pascal('paginación')).toBe('Paginacion');
    expect(pascal('item producto')).toBe('ItemProducto');
  });

  /** `Items` for the *element* of a list would be plainly misleading. */
  it('appends Item when what was extracted is an array', () => {
    expect(extractedName('items', true)).toBe('ItemsItem');
    expect(extractedName('paginacion', false)).toBe('Paginacion');
  });

  it('falls back to a name rather than accepting an empty key', () => {
    expect(extractedName('  ', false)).toBe('Modelo');
  });

  it('numbers a model name that is taken', () => {
    const models = [{ name: 'Paginacion' }, { name: 'Paginacion2' }];
    expect(uniqueModelName(models, 'Paginacion')).toBe('Paginacion3');
    expect(uniqueModelName(models, 'Otro')).toBe('Otro');
  });
});

describe('where a model is used', () => {
  it('names each place, once', () => {
    const c = contract({
      models: [model('mod-pag', 'Paginacion')],
      endpoints: [
        endpoint('/productos', [refTo('paginacion', 'mod-pag')]),
        endpoint('/pedidos', [arrayOf('items', 'mod-pag')]),
      ],
    });
    expect(usesOf(c, 'mod-pag')).toEqual(['GET /productos · 200', 'GET /pedidos · 200']);
  });

  it('finds a reference nested deep in a body', () => {
    const inner = newNode('cliente', 'object');
    inner.children = [refTo('paginacion', 'mod-pag')];
    const c = contract({
      models: [model('mod-pag', 'Paginacion')],
      endpoints: [endpoint('/x', [inner])],
    });
    expect(usesOf(c, 'mod-pag')).toEqual(['GET /x · 200']);
  });

  it('counts a reference from another model', () => {
    const c = contract({
      models: [model('mod-a', 'A', [refTo('p', 'mod-pag')]), model('mod-pag', 'Paginacion')],
    });
    expect(usesOf(c, 'mod-pag')).toEqual(['modelo A']);
  });

  /** Recursive is not the same as used by somebody else. */
  it('does not count a model that references itself', () => {
    const c = contract({ models: [model('mod-cat', 'Categoria', [arrayOf('hijas', 'mod-cat')])] });
    expect(usesOf(c, 'mod-cat')).toEqual([]);
  });

  it('reports nothing for a model nobody points at', () => {
    const c = contract({
      models: [model('mod-x', 'X')],
      endpoints: [endpoint('/x', [newNode('id')])],
    });
    expect(usesOf(c, 'mod-x')).toEqual([]);
  });
});

describe('what a model depends on', () => {
  it('lists the models it points at', () => {
    const c = contract({
      models: [
        model('mod-a', 'A', [refTo('p', 'mod-pag'), arrayOf('items', 'mod-item')]),
        model('mod-pag', 'Paginacion'),
        model('mod-item', 'Item'),
      ],
    });
    expect(directDependencies(c, 'mod-a').sort()).toEqual(['mod-item', 'mod-pag']);
  });

  it('does not list itself', () => {
    const c = contract({ models: [model('mod-cat', 'Categoria', [arrayOf('hijas', 'mod-cat')])] });
    expect(directDependencies(c, 'mod-cat')).toEqual([]);
  });
});

describe('the whole chain a model needs', () => {
  it('follows the references transitively', () => {
    const c = contract({
      models: [
        model('a', 'A', [refTo('b', 'b')]),
        model('b', 'B', [refTo('c', 'c')]),
        model('c', 'C'),
        model('z', 'Z'),
      ],
    });
    expect(modelDependencies(c, 'a').sort()).toEqual(['b', 'c']);
  });

  it('resolves a cycle once instead of hanging', () => {
    const c = contract({
      models: [model('a', 'A', [refTo('b', 'b')]), model('b', 'B', [refTo('a', 'a')])],
    });
    expect(modelDependencies(c, 'a')).toEqual(['b']);
  });

  it('reports nothing for a model that depends on nothing', () => {
    expect(modelDependencies(contract({ models: [model('a', 'A')] }), 'a')).toEqual([]);
  });

  it('follows an array of a model too', () => {
    const c = contract({ models: [model('a', 'A', [arrayOf('items', 'b')]), model('b', 'B')] });
    expect(modelDependencies(c, 'a')).toEqual(['b']);
  });
});
