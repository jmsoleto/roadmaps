import { describe, it, expect } from 'vitest';
import { exampleOf, scalarValue } from './example';
import { newNode, rootNode } from './model/factories';
import type { ApiModel } from './model/types';

describe('a scalar with an example written', () => {
  it('uses what was written', () => {
    const node = newNode('nombre');
    node.example = 'Camisa lino';
    expect(scalarValue(node)).toBe('Camisa lino');
  });

  it('reads a number as a number', () => {
    const node = newNode('precio', 'number');
    node.example = '39.95';
    expect(scalarValue(node)).toBe(39.95);
  });

  /** Typed on a Spanish keyboard mid-conversation; refusing the comma helps nobody. */
  it('accepts a decimal comma', () => {
    const node = newNode('precio', 'number');
    node.example = '39,95';
    expect(scalarValue(node)).toBe(39.95);
  });

  it('keeps an integer whole', () => {
    const node = newNode('total', 'integer');
    node.example = '137.8';
    expect(scalarValue(node)).toBe(137);
  });

  it('reads the usual ways of writing yes', () => {
    const node = newNode('activo', 'boolean');
    for (const written of ['true', '1', 'sí', 'si', 'yes']) {
      node.example = written;
      expect(scalarValue(node)).toBe(true);
    }
    node.example = 'no';
    expect(scalarValue(node)).toBe(false);
  });
});

describe('a scalar with no example written', () => {
  /** A blank would make the panel useless exactly when the contract is least finished. */
  it('shows something plausible for its format', () => {
    const node = newNode('alta');
    node.format = 'date-time';
    expect(scalarValue(node)).toBe('2026-01-31T10:00:00Z');
  });

  it('shows a plausible value for each hand-picked format too', () => {
    const node = newNode('clave');
    for (const format of ['password', 'byte', 'int64', 'float'] as const) {
      node.format = format;
      expect(scalarValue(node)).not.toBe('texto');
    }
  });

  it('prefers the first admitted value over a placeholder', () => {
    const node = newNode('estado');
    node.enums = ['alta', 'baja'];
    expect(scalarValue(node)).toBe('alta');
  });

  it('falls back to a value of the right type', () => {
    expect(scalarValue(newNode('x', 'string'))).toBe('texto');
    expect(scalarValue(newNode('x', 'integer'))).toBe(1);
    expect(scalarValue(newNode('x', 'boolean'))).toBe(false);
    expect(scalarValue(newNode('x', 'null'))).toBeNull();
  });
});

describe('the JSON a tree describes', () => {
  it('builds an object from its fields', () => {
    const root = rootNode();
    const total = newNode('total', 'integer');
    total.example = '137';
    root.children = [total, newNode('nombre')];
    expect(exampleOf(root, [])).toEqual({ total: 137, nombre: 'texto' });
  });

  it('skips a field with no key, which is one being typed', () => {
    const root = rootNode();
    root.children = [newNode('', 'string'), newNode('nombre')];
    expect(exampleOf(root, [])).toEqual({ nombre: 'texto' });
  });

  it('shows an array of objects as one element', () => {
    const items = newNode('items', 'array');
    items.itemType = 'object';
    items.children = [newNode('id')];
    expect(exampleOf(items, [])).toEqual([{ id: 'texto' }]);
  });

  it('shows an array of scalars shaped like its element type', () => {
    const tallas = newNode('tallas', 'array');
    tallas.itemType = 'integer';
    expect(exampleOf(tallas, [])).toEqual([1]);
  });

  it('nests', () => {
    const root = rootNode();
    const direccion = newNode('direccion', 'object');
    direccion.children = [newNode('calle')];
    root.children = [direccion];
    expect(exampleOf(root, [])).toEqual({ direccion: { calle: 'texto' } });
  });

  it('says so rather than resolving a reference to a model that is not there', () => {
    expect(exampleOf(newNode('paginacion', 'ref'), [])).toEqual({
      '⚠': 'referencia a un modelo que no existe',
    });
  });

  it('describes an empty object as an empty object', () => {
    expect(exampleOf(rootNode(), [])).toEqual({});
  });
});

/** A model whose tree is the given fields. */
function model(id: string, name: string, fields: ReturnType<typeof newNode>[]): ApiModel {
  const node = rootNode();
  node.children = fields;
  return { id, name, description: '', node };
}

describe('resolving a reference', () => {
  const paginacion = model('mod-pag', 'Paginacion', [
    newNode('pagina', 'integer'),
    newNode('total', 'integer'),
  ]);

  it('shows the shape the model describes', () => {
    const field = newNode('paginacion', 'ref');
    field.ref = 'mod-pag';
    expect(exampleOf(field, [paginacion])).toEqual({ pagina: 1, total: 1 });
  });

  it('shows an array of a model as one element with that shape', () => {
    const items = newNode('items', 'array');
    items.itemType = 'ref';
    items.itemRef = 'mod-pag';
    expect(exampleOf(items, [paginacion])).toEqual([{ pagina: 1, total: 1 }]);
  });

  /** The cut is per cycle, not per repetition (D5). */
  it('expands the same model twice when two siblings point at it', () => {
    const root = rootNode();
    const a = newNode('uno', 'ref');
    a.ref = 'mod-pag';
    const b = newNode('dos', 'ref');
    b.ref = 'mod-pag';
    root.children = [a, b];
    expect(exampleOf(root, [paginacion])).toEqual({
      uno: { pagina: 1, total: 1 },
      dos: { pagina: 1, total: 1 },
    });
  });
});

describe('a model that contains itself', () => {
  /** A tree of categories is a legitimate and frequent contract. */
  it('cuts the recursion instead of hanging', () => {
    const hijas = newNode('hijas', 'array');
    hijas.itemType = 'ref';
    hijas.itemRef = 'mod-cat';
    const categoria = model('mod-cat', 'Categoria', [newNode('nombre'), hijas]);

    const field = newNode('raiz', 'ref');
    field.ref = 'mod-cat';

    expect(exampleOf(field, [categoria])).toEqual({ nombre: 'texto', hijas: [] });
  });

  it('cuts a cycle between two models', () => {
    const toB = newNode('b', 'ref');
    toB.ref = 'mod-b';
    const toA = newNode('a', 'ref');
    toA.ref = 'mod-a';
    const a = model('mod-a', 'A', [newNode('nombre'), toB]);
    const b = model('mod-b', 'B', [toA]);

    const field = newNode('raiz', 'ref');
    field.ref = 'mod-a';

    expect(exampleOf(field, [a, b])).toEqual({ nombre: 'texto', b: { a: {} } });
  });

  it('cuts a model that references itself directly', () => {
    const yo = newNode('yo', 'ref');
    yo.ref = 'mod-x';
    const x = model('mod-x', 'X', [yo]);

    const field = newNode('raiz', 'ref');
    field.ref = 'mod-x';

    expect(exampleOf(field, [x])).toEqual({ yo: {} });
  });
});
