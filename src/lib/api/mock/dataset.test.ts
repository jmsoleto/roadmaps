import { describe, it, expect } from 'vitest';
import { bodyScope, bodyVariants } from './dataset';
import { newNode, rootNode } from '../model/factories';
import type { ApiNode, MockSettings } from '../model/types';

function settings(extra: Partial<MockSettings> = {}): MockSettings {
  return {
    seed: 4821,
    size: 45,
    pageSize: 20,
    variants: 3,
    sizes: {},
    pagination: {},
    relations: {},
    collections: {},
    identities: {},
    ...extra,
  };
}

/** A body with the fields a login response would have. */
function body(): ApiNode {
  const root = rootNode();
  root.children = [newNode('token'), newNode('expira'), newNode('intentos', 'integer')];
  root.children[1].format = 'date-time';
  return root;
}

const scope = bodyScope('e1', 'res-200');
const obj = (v: unknown) => v as Record<string, unknown>;

describe('the variants of a body that belongs to no collection', () => {
  it('gives as many as were asked for', () => {
    expect(bodyVariants(body(), [], settings(), scope)).toHaveLength(3);
  });

  it('gives different values in each', () => {
    const [a, b, c] = bodyVariants(body(), [], settings(), scope).map(obj);
    expect(new Set([a.token, b.token, c.token]).size).toBe(3);
    expect(new Set([a.intentos, b.intentos, c.intentos]).size).toBeGreaterThan(1);
  });

  it('gives the same ones again for the same seed', () => {
    const once = bodyVariants(body(), [], settings(), scope);
    const twice = bodyVariants(body(), [], settings(), scope);
    expect(twice).toEqual(once);
  });

  it('gives other ones for another seed', () => {
    const before = bodyVariants(body(), [], settings(), scope);
    const after = bodyVariants(body(), [], settings({ seed: 9 }), scope);
    expect(after).not.toEqual(before);
  });

  it('keeps two bodies of the same endpoint apart', () => {
    const request = bodyVariants(body(), [], settings(), bodyScope('e1', 'req'));
    const response = bodyVariants(body(), [], settings(), bodyScope('e1', 'res-200'));
    expect(response).not.toEqual(request);
  });
});

/**
 * The property the whole feature rests on, and the reason the value comes from a
 * coordinate and not from a stream: the panel has to be readable while typing.
 */
describe('adding a field', () => {
  it('does not change the value of any other field, in any variant', () => {
    const before = bodyVariants(body(), [], settings(), scope).map(obj);

    const grown = body();
    // Inserted in the middle, which is where a stream would do the most damage.
    grown.children.splice(1, 0, newNode('refresco'));
    const after = bodyVariants(grown, [], settings(), scope).map(obj);

    for (let i = 0; i < before.length; i++) {
      expect(after[i].token).toBe(before[i].token);
      expect(after[i].expira).toBe(before[i].expira);
      expect(after[i].intentos).toBe(before[i].intentos);
      expect(after[i].refresco).toBeDefined();
    }
  });

  it('does not change them when the new field is a whole object either', () => {
    const before = bodyVariants(body(), [], settings(), scope).map(obj);
    const grown = body();
    const nested = newNode('perfil', 'object');
    nested.children = [newNode('rol'), newNode('area')];
    grown.children.unshift(nested);
    const after = bodyVariants(grown, [], settings(), scope).map(obj);
    for (let i = 0; i < before.length; i++) {
      expect(after[i].token).toBe(before[i].token);
      expect(after[i].intentos).toBe(before[i].intentos);
    }
  });
});

describe('what a varied scalar looks like', () => {
  it('respects a written example in every variant (D18)', () => {
    const root = rootNode();
    const node = newNode('nombre');
    node.example = 'Camisa lino';
    root.children = [node];
    for (const variant of bodyVariants(root, [], settings(), scope)) {
      expect(obj(variant).nombre).toBe('Camisa lino');
    }
  });

  it('spreads an enumeration instead of always taking the first', () => {
    const root = rootNode();
    const node = newNode('estado');
    node.enums = ['alta', 'baja', 'pendiente'];
    root.children = [node];
    const seen = new Set<unknown>();
    for (let seed = 0; seed < 40; seed++) {
      for (const variant of bodyVariants(root, [], settings({ seed }), scope)) {
        seen.add(obj(variant).estado);
      }
    }
    expect(seen).toEqual(new Set(['alta', 'baja', 'pendiente']));
  });

  it('honours the format of a field nobody wrote an example in', () => {
    const root = rootNode();
    const fecha = newNode('alta');
    fecha.format = 'date';
    const correo = newNode('correo');
    correo.format = 'email';
    const id = newNode('uuid');
    id.format = 'uuid';
    root.children = [fecha, correo, id];
    const first = obj(bodyVariants(root, [], settings(), scope)[0]);
    expect(first.alta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.correo).toMatch(/^[a-z]+@ejemplo\.com$/);
    expect(first.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('gives an array more than one element, each its own', () => {
    const root = rootNode();
    const tags = newNode('tags', 'array');
    tags.itemType = 'string';
    root.children = [tags];
    const lengths = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      const value = obj(bodyVariants(root, [], settings({ seed }), scope)[0]).tags as string[];
      lengths.add(value.length);
      expect(new Set(value).size).toBe(value.length);
    }
    expect(lengths.size).toBeGreaterThan(1);
  });
});
