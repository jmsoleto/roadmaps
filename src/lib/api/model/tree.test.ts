import { describe, it, expect } from 'vitest';
import {
  cloneWithNewIds,
  copyKey,
  find,
  isContainer,
  isScalar,
  moveAmongSiblings,
  uniqueKey,
  walk,
} from './tree';
import { newNode, rootNode } from './factories';
import type { ApiNode } from './types';

function tree(): ApiNode {
  const root = rootNode();
  const direccion = newNode('direccion', 'object');
  direccion.children = [newNode('calle'), newNode('numero', 'integer')];
  root.children = [newNode('nombre'), direccion];
  return root;
}

describe('what can hold children', () => {
  it('counts objects and arrays of objects', () => {
    expect(isContainer(newNode('a', 'object'))).toBe(true);
    const arr = newNode('a', 'array');
    arr.itemType = 'object';
    expect(isContainer(arr)).toBe(true);
  });

  it('does not count an array of scalars', () => {
    const arr = newNode('a', 'array');
    arr.itemType = 'string';
    expect(isContainer(arr)).toBe(false);
  });

  it('counts as scalar only what carries a value of its own', () => {
    expect(isScalar(newNode('a', 'string'))).toBe(true);
    expect(isScalar(newNode('a', 'null'))).toBe(true);
    expect(isScalar(newNode('a', 'object'))).toBe(false);
    expect(isScalar(newNode('a', 'array'))).toBe(false);
    expect(isScalar(newNode('a', 'ref'))).toBe(false);
  });
});

describe('walking and finding', () => {
  it('visits parents before children', () => {
    const seen: string[] = [];
    walk(tree(), (n) => seen.push(n.key));
    expect(seen).toEqual(['', 'nombre', 'direccion', 'calle', 'numero']);
  });

  it('finds a nested node and the parent that holds it', () => {
    const root = tree();
    const calle = root.children[1].children[0];
    const hit = find(root, calle.id);
    expect(hit?.node.key).toBe('calle');
    expect(hit?.parent?.key).toBe('direccion');
  });

  it('reports the root as having no parent', () => {
    const root = tree();
    expect(find(root, root.id)?.parent).toBeNull();
  });

  it('returns null for an id that is not there', () => {
    expect(find(tree(), 'nod-inventado')).toBeNull();
  });
});

describe('copying a subtree', () => {
  /**
   * Ids are how the store finds a node to mutate. A copy that kept them would
   * make editing the copy edit the original.
   */
  it('reissues every identifier under the copy', () => {
    const original = tree().children[1];
    const copy = cloneWithNewIds(original);

    const originalIds = new Set<string>();
    walk(original, (n) => originalIds.add(n.id));
    walk(copy, (n) => expect(originalIds.has(n.id)).toBe(false));
  });

  it('keeps everything else', () => {
    const original = tree().children[1];
    original.description = 'la dirección de envío';
    const copy = cloneWithNewIds(original);

    expect(copy.key).toBe('direccion');
    expect(copy.description).toBe('la dirección de envío');
    expect(copy.children.map((c) => c.key)).toEqual(['calle', 'numero']);
  });

  it('does not share the enumeration array with the original', () => {
    const original = newNode('estado');
    original.enums = ['alta', 'baja'];
    const copy = cloneWithNewIds(original);
    copy.enums.push('pendiente');
    expect(original.enums).toEqual(['alta', 'baja']);
  });

  it('does not share a child object with the original', () => {
    const original = tree().children[1];
    const copy = cloneWithNewIds(original);
    copy.children[0].key = 'via';
    expect(original.children[0].key).toBe('calle');
  });
});

describe('a key nobody else is using', () => {
  const siblings = [newNode('campo'), newNode('campo2'), newNode('direccion')];

  it('leaves a free key alone', () => {
    expect(uniqueKey(siblings, 'precio')).toBe('precio');
  });

  it('numbers a taken one, skipping numbers already in use', () => {
    expect(uniqueKey(siblings, 'campo')).toBe('campo3');
  });

  it('falls back to a name rather than accepting an empty key', () => {
    expect(uniqueKey([], '   ')).toBe('campo');
  });

  /** The suffix is the point: `direccion2` reads as a second address. */
  it('marks a copy as a copy', () => {
    expect(copyKey(siblings, 'direccion')).toBe('direccion_copia');
  });

  it('numbers the second copy', () => {
    const withCopy = [...siblings, newNode('direccion_copia')];
    expect(copyKey(withCopy, 'direccion')).toBe('direccion_copia2');
  });
});

describe('moving among siblings', () => {
  it('swaps with the neighbour above', () => {
    const siblings = [newNode('nombre'), newNode('id'), newNode('precio')];
    expect(moveAmongSiblings(siblings, 1, -1)).toBe(true);
    expect(siblings.map((s) => s.key)).toEqual(['id', 'nombre', 'precio']);
  });

  it('refuses to move the first one up or the last one down', () => {
    const siblings = [newNode('a'), newNode('b')];
    expect(moveAmongSiblings(siblings, 0, -1)).toBe(false);
    expect(moveAmongSiblings(siblings, 1, 1)).toBe(false);
    expect(siblings.map((s) => s.key)).toEqual(['a', 'b']);
  });
});
