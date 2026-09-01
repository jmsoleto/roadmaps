import { describe, it, expect } from 'vitest';
import { reissueIds, reissueNodeIds } from './identity';
import { newEndpoint, newNode, newParam, rootNode } from './factories';
import { walk } from './tree';
import type { ApiModel, Contract } from './types';

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

const arrayOf = (key: string, id: string) => {
  const node = newNode(key, 'array');
  node.itemType = 'ref';
  node.itemRef = id;
  return node;
};

/** A contract whose response references its own model, twice over. */
function wired(): Contract {
  const endpoint = newEndpoint('GET', '/productos');
  endpoint.params = [{ ...newParam(), name: 'pagina' }];
  endpoint.responses[0].body!.children = [
    refTo('paginacion', 'mod-pag'),
    arrayOf('items', 'mod-pag'),
  ];
  return {
    id: 'api-1',
    title: 'Catálogo',
    version: '1.0.0',
    description: '',
    server: '',
    colorSlot: 0,
    models: [model('mod-pag', 'Paginacion', [newNode('pagina', 'integer')])],
    endpoints: [endpoint],
    view: { kind: 'endpoint', id: endpoint.id },
  };
}

describe('reissuing a whole contract', () => {
  it('gives every model, endpoint, parameter and response a new id', () => {
    const contract = wired();
    const before = {
      model: contract.models[0].id,
      endpoint: contract.endpoints[0].id,
      param: contract.endpoints[0].params[0].id,
      response: contract.endpoints[0].responses[0].id,
    };

    reissueIds(contract);

    expect(contract.models[0].id).not.toBe(before.model);
    expect(contract.endpoints[0].id).not.toBe(before.endpoint);
    expect(contract.endpoints[0].params[0].id).not.toBe(before.param);
    expect(contract.endpoints[0].responses[0].id).not.toBe(before.response);
  });

  it('gives every field of every tree a new id', () => {
    const contract = wired();
    const before = new Set<string>();
    for (const model of contract.models) walk(model.node, (n) => before.add(n.id));
    for (const r of contract.endpoints[0].responses) walk(r.body!, (n) => before.add(n.id));

    reissueIds(contract);

    for (const model of contract.models)
      walk(model.node, (n) => expect(before.has(n.id)).toBe(false));
    for (const r of contract.endpoints[0].responses) {
      walk(r.body!, (n) => expect(before.has(n.id)).toBe(false));
    }
  });

  /** The failure this function exists to prevent: pointing at somebody else's models. */
  it('repoints every reference at the contract’s own models', () => {
    const contract = wired();
    reissueIds(contract);

    const body = contract.endpoints[0].responses[0].body!;
    expect(body.children[0].ref).toBe(contract.models[0].id);
    expect(body.children[1].itemRef).toBe(contract.models[0].id);
    expect(body.children[0].ref).not.toBe('mod-pag');
  });

  it('carries the remembered view over to the new ids', () => {
    const contract = wired();
    reissueIds(contract);
    expect(contract.view).toEqual({ kind: 'endpoint', id: contract.endpoints[0].id });
  });

  it('carries a view that names a model', () => {
    const contract = wired();
    contract.view = { kind: 'model', id: 'mod-pag' };
    reissueIds(contract);
    expect(contract.view).toEqual({ kind: 'model', id: contract.models[0].id });
  });

  it('drops a view naming something that is not there', () => {
    const contract = wired();
    contract.view = { kind: 'model', id: 'mod-fantasma' };
    reissueIds(contract);
    expect(contract.view).toBeNull();
  });

  /** Already broken; blanking it would throw away what it used to be. */
  it('leaves a reference to a model outside the contract alone', () => {
    const contract = wired();
    contract.endpoints[0].responses[0].body!.children = [refTo('x', 'mod-de-otro')];
    reissueIds(contract);
    expect(contract.endpoints[0].responses[0].body!.children[0].ref).toBe('mod-de-otro');
  });

  it('leaves the content alone', () => {
    const contract = wired();
    contract.endpoints[0].summary = 'Listado';
    reissueIds(contract);
    expect(contract.title).toBe('Catálogo');
    expect(contract.endpoints[0].summary).toBe('Listado');
    expect(contract.models[0].name).toBe('Paginacion');
  });
});

describe('reissuing only a body', () => {
  /** Copying inside the same contract: the models are still there. */
  it('renews the ids and leaves the references pointing where they pointed', () => {
    const body = rootNode();
    body.children = [refTo('paginacion', 'mod-pag')];
    const before = body.children[0].id;

    reissueNodeIds(body);

    expect(body.children[0].id).not.toBe(before);
    expect(body.children[0].ref).toBe('mod-pag');
  });
});
