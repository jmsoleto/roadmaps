import { describe, it, expect } from 'vitest';
import { bringBundle, collisionsOf } from './bring';
import { bundleOf, bundledModels } from './bundle';
import { newNode, rootNode } from '../model/factories';
import type { ApiModel, Contract } from '../model/types';
import type { LibraryEntry } from './types';

function model(id: string, name: string, fields: ReturnType<typeof newNode>[] = []): ApiModel {
  const node = rootNode();
  node.children = fields;
  return { id, name, description: '', node };
}

const refTo = (key: string, id: string) => {
  const node = newNode(key, 'ref');
  node.ref = id;
  return node;
};

const contract = (models: ApiModel[] = []): Contract => ({
  id: 'api-1',
  title: 'Catálogo',
  version: '1.0.0',
  description: '',
  server: '',
  colorSlot: 0,
  models,
  endpoints: [],
  view: null,
});

/** ItemProducto → Paginacion → Moneda, as it would sit in the library. */
function chain(): LibraryEntry {
  const source = contract([
    model('lib-item', 'ItemProducto', [newNode('id'), refTo('paginacion', 'lib-pag')]),
    model('lib-pag', 'Paginacion', [newNode('pagina'), refTo('moneda', 'lib-mon')]),
    model('lib-mon', 'Moneda', [newNode('codigo')]),
  ]);
  return bundleOf(source, 'lib-item')!;
}

describe('what a bundle carries', () => {
  it('takes the chain, in order, the saved model first', () => {
    expect(
      bundledModels(
        contract([
          model('a', 'A', [refTo('b', 'b')]),
          model('b', 'B', [refTo('c', 'c')]),
          model('c', 'C'),
          model('z', 'Z'),
        ]),
        'a',
      ).map((m) => m.name),
    ).toEqual(['A', 'B', 'C']);
  });

  it('does not take what nothing depends on', () => {
    const models = bundledModels(contract([model('a', 'A'), model('z', 'Z')]), 'a');
    expect(models.map((m) => m.name)).toEqual(['A']);
  });

  it('takes a recursive model once, without hanging', () => {
    const yo = refTo('yo', 'a');
    expect(bundledModels(contract([model('a', 'A', [yo])]), 'a').map((m) => m.name)).toEqual(['A']);
  });

  /** The entry must not share nodes with the contract it came from. */
  it('copies, so editing the contract afterwards does not rewrite the library', () => {
    const source = contract([model('a', 'A', [newNode('campo')])]);
    const entry = bundleOf(source, 'a')!;
    source.models[0].node.children[0].key = 'cambiado';
    expect(entry.models[0].node.children[0].key).toBe('campo');
  });
});

describe('finding collisions', () => {
  it('finds none in a clean contract', () => {
    expect(collisionsOf(contract(), chain())).toEqual([]);
  });

  it('finds the name the contract already uses, with something to tell them apart', () => {
    const mine = contract([model('mio', 'Paginacion', [newNode('a'), newNode('b')])]);
    const found = collisionsOf(mine, chain());
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ name: 'Paginacion', mineFields: 2, theirsFields: 2 });
    expect(found[0].contractId).toBe('mio');
  });

  it('finds two at once', () => {
    const mine = contract([model('m1', 'Paginacion'), model('m2', 'Moneda')]);
    expect(collisionsOf(mine, chain()).map((c) => c.name)).toEqual(['Paginacion', 'Moneda']);
  });
});

describe('bringing with no collision', () => {
  it('adds every model of the bundle', () => {
    const out = bringBundle(contract(), chain())!;
    expect(out.models.map((m) => m.name)).toEqual(['ItemProducto', 'Paginacion', 'Moneda']);
  });

  it('gives everything new identity', () => {
    const out = bringBundle(contract(), chain())!;
    for (const m of out.models) expect(m.id.startsWith('lib-')).toBe(false);
  });

  /** A reference that still pointed at a library id would be broken on arrival. */
  it('repoints the references at the models that arrived with it', () => {
    const out = bringBundle(contract(), chain())!;
    const [item, pag, mon] = out.models;
    expect(item.node.children[1].ref).toBe(pag.id);
    expect(pag.node.children[1].ref).toBe(mon.id);
  });

  it('says which one is the model that was asked for', () => {
    const out = bringBundle(contract(), chain())!;
    expect(out.broughtId).toBe(out.models[0].id);
  });
});

describe('bringing when a name already exists', () => {
  const mine = () => contract([model('mio-pag', 'Paginacion', [newNode('pagina')])]);

  /** The default, and what the library is for: converge on one name. */
  it('reusing adds no second model and repoints at the existing one', () => {
    const out = bringBundle(mine(), chain(), new Map([['lib-pag', 'reutilizar']]))!;

    expect(out.models.map((m) => m.name)).toEqual(['ItemProducto', 'Moneda']);
    expect(out.models[0].node.children[1].ref).toBe('mio-pag');
  });

  it('bringing it separately adds it under a name that does not clash', () => {
    const out = bringBundle(mine(), chain(), new Map([['lib-pag', 'traer']]))!;

    expect(out.models.map((m) => m.name)).toEqual(['ItemProducto', 'Paginacion2', 'Moneda']);
    expect(out.models[0].node.children[1].ref).toBe(out.models[1].id);
    expect(out.models[0].node.children[1].ref).not.toBe('mio-pag');
  });

  /** The collision is in a dependency; the model asked for is untouched. */
  it('resolves a colliding dependency without touching the model asked for', () => {
    const out = bringBundle(mine(), chain(), new Map([['lib-pag', 'reutilizar']]))!;
    expect(out.models[0].name).toBe('ItemProducto');
    expect(out.broughtId).toBe(out.models[0].id);
  });

  it('resolves two collisions independently', () => {
    const both = contract([model('mio-pag', 'Paginacion'), model('mio-mon', 'Moneda')]);
    const out = bringBundle(
      both,
      chain(),
      new Map([
        ['lib-pag', 'reutilizar'],
        ['lib-mon', 'traer'],
      ]),
    )!;

    expect(out.models.map((m) => m.name)).toEqual(['ItemProducto', 'Moneda2']);
    expect(out.models[0].node.children[1].ref).toBe('mio-pag');
  });

  /** The same default the screen offers, so the two cannot disagree (D3). */
  it('reuses a collision nobody decided about', () => {
    const out = bringBundle(mine(), chain())!;
    expect(out.models.map((m) => m.name)).toEqual(['ItemProducto', 'Moneda']);
    expect(out.models[0].node.children[1].ref).toBe('mio-pag');
  });

  it('brings a model that does not collide without any decision', () => {
    const out = bringBundle(contract(), chain())!;
    expect(out.models.map((m) => m.name)).toEqual(['ItemProducto', 'Paginacion', 'Moneda']);
  });

  it('does not let two arriving models claim the same name', () => {
    const twins = contract();
    const entry: LibraryEntry = {
      ...chain(),
      models: [model('l1', 'Igual', []), model('l2', 'Igual', [])],
    };
    const out = bringBundle(twins, entry)!;
    expect(out.models.map((m) => m.name)).toEqual(['Igual', 'Igual2']);
  });
});
