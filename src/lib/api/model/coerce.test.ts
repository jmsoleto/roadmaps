import { describe, it, expect } from 'vitest';
import { applyItemType, applyType } from './coerce';
import { newNode } from './factories';

describe('changing a field to a container', () => {
  it('gives it a first editable child', () => {
    const node = newNode('cliente', 'string');
    applyType(node, 'object');
    expect(node.children).toHaveLength(1);
    expect(node.open).toBe(true);
  });

  it('stops asking it for an example', () => {
    const node = newNode('cliente', 'string');
    node.example = 'Ana';
    applyType(node, 'object');
    expect(node.example).toBe('');
  });

  it('leaves the children it already had', () => {
    const node = newNode('cliente', 'object');
    node.children = [newNode('nombre')];
    applyType(node, 'object');
    expect(node.children.map((c) => c.key)).toEqual(['nombre']);
  });

  it('drops format and enumeration, which mean nothing on a container', () => {
    const node = newNode('estado', 'string');
    node.format = 'date';
    node.enums = ['alta', 'baja'];
    applyType(node, 'object');
    expect(node.format).toBe('');
    expect(node.enums).toEqual([]);
  });
});

describe('what survives a type change', () => {
  /**
   * The rule the prototype never wrote down, and the one that decides whether
   * correcting yourself mid-sentence costs you a retype.
   */
  it('keeps the key, the comment and the obligation', () => {
    const node = newNode('total', 'string');
    node.description = 'Total de elementos, no de páginas';
    node.required = true;

    applyType(node, 'object');
    applyType(node, 'array');
    applyType(node, 'integer');

    expect(node.key).toBe('total');
    expect(node.description).toBe('Total de elementos, no de páginas');
    expect(node.required).toBe(true);
  });

  it('lets a container go back to a scalar that asks for an example again', () => {
    const node = newNode('cliente', 'object');
    node.children = [newNode('nombre')];
    applyType(node, 'string');
    node.example = 'Ana';
    expect(node.example).toBe('Ana');
  });
});

describe('references left behind', () => {
  it('clears a reference when the type is no longer a reference', () => {
    const node = newNode('paginacion', 'ref');
    node.ref = 'mod-1';
    applyType(node, 'object');
    expect(node.ref).toBe('');
  });

  it('clears an element reference when the array no longer holds one', () => {
    const node = newNode('items', 'array');
    node.itemType = 'ref';
    node.itemRef = 'mod-1';
    applyItemType(node, 'string');
    expect(node.itemRef).toBe('');
  });
});

describe('arrays', () => {
  it('gives an array of objects a first child', () => {
    const node = newNode('items', 'array');
    applyItemType(node, 'object');
    expect(node.children).toHaveLength(1);
  });

  /**
   * A mis-click on the element type must not delete the fields already
   * described. They stop being exported, and they come back if the type does.
   */
  it('keeps the fields when an array of objects becomes an array of scalars', () => {
    const node = newNode('items', 'array');
    applyItemType(node, 'object');
    node.children = [newNode('nombre'), newNode('precio')];
    applyItemType(node, 'string');
    expect(node.children.map((c) => c.key)).toEqual(['nombre', 'precio']);
  });
});

describe('changing a field to an enumeration', () => {
  /**
   * Nothing in `applyType` mentions `enum`, and that is the finding, not an
   * oversight: `isScalar` is defined by exclusion, so a new scalar type arrives
   * already governed by the rules that were written for the others (D11).
   */
  it('keeps the values when the field stays scalar', () => {
    const node = newNode('estado', 'string');
    node.enums = ['alta', 'baja'];
    applyType(node, 'enum');
    expect(node.enums).toEqual(['alta', 'baja']);
    applyType(node, 'string');
    expect(node.enums).toEqual(['alta', 'baja']);
  });

  it('keeps the key, the comment and the obligation', () => {
    const node = newNode('estado', 'string');
    node.description = 'En qué punto está el pedido';
    node.required = true;
    applyType(node, 'enum');
    expect([node.key, node.description, node.required]).toEqual([
      'estado',
      'En qué punto está el pedido',
      true,
    ]);
  });

  it('is born with no values at all, and gets no sample one (D6)', () => {
    const node = newNode('estado', 'string');
    applyType(node, 'enum');
    expect(node.enums).toEqual([]);
  });

  it('still asks for an example, because it is a scalar', () => {
    const node = newNode('estado', 'enum');
    node.example = 'alta';
    applyType(node, 'enum');
    expect(node.example).toBe('alta');
  });

  it('drops the values when it stops being scalar', () => {
    const node = newNode('estado', 'enum');
    node.enums = ['alta', 'baja'];
    applyType(node, 'object');
    expect(node.enums).toEqual([]);
  });

  it('drops the model it pointed at, like any other type that is not a ref', () => {
    const node = newNode('estado', 'ref');
    node.ref = 'mod-1';
    applyType(node, 'enum');
    expect(node.ref).toBe('');
  });
});
