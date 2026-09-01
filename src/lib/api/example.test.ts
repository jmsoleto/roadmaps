import { describe, it, expect } from 'vitest';
import { exampleOf, scalarValue } from './example';
import { newNode, rootNode } from './model/factories';

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
    expect(exampleOf(root)).toEqual({ total: 137, nombre: 'texto' });
  });

  it('skips a field with no key, which is one being typed', () => {
    const root = rootNode();
    root.children = [newNode('', 'string'), newNode('nombre')];
    expect(exampleOf(root)).toEqual({ nombre: 'texto' });
  });

  it('shows an array of objects as one element', () => {
    const items = newNode('items', 'array');
    items.itemType = 'object';
    items.children = [newNode('id')];
    expect(exampleOf(items)).toEqual([{ id: 'texto' }]);
  });

  it('shows an array of scalars shaped like its element type', () => {
    const tallas = newNode('tallas', 'array');
    tallas.itemType = 'integer';
    expect(exampleOf(tallas)).toEqual([1]);
  });

  it('nests', () => {
    const root = rootNode();
    const direccion = newNode('direccion', 'object');
    direccion.children = [newNode('calle')];
    root.children = [direccion];
    expect(exampleOf(root)).toEqual({ direccion: { calle: 'texto' } });
  });

  /** Models are not resolvable yet; the marker is honest about that. */
  it('marks a reference rather than pretending to resolve it', () => {
    expect(exampleOf(newNode('paginacion', 'ref'))).toEqual({ '⚠': 'referencia a un modelo' });
  });

  it('describes an empty object as an empty object', () => {
    expect(exampleOf(rootNode())).toEqual({});
  });
});
