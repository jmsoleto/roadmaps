import { describe, it, expect } from 'vitest';
import { fold, matchSnippet, searchContract } from './search';
import { newEndpoint, newNode, newParam, rootNode } from './factories';
import type { ApiModel, ApiNode, Contract } from './types';

const contract = (over: Partial<Contract> = {}): Contract => ({
  id: 'api-1',
  title: 'Pedidos',
  version: '1.0.0',
  description: '',
  server: '',
  colorSlot: 0,
  models: [],
  endpoints: [],
  ...over,
});

function model(id: string, name: string, fields: ApiNode[] = []): ApiModel {
  const node = rootNode();
  node.children = fields;
  return { id, name, description: '', node };
}

function obj(key: string, children: ApiNode[]): ApiNode {
  const node = newNode(key, 'object');
  node.children = children;
  return node;
}

function arrayOfObjects(key: string, children: ApiNode[]): ApiNode {
  const node = newNode(key, 'array');
  node.itemType = 'object';
  node.children = children;
  return node;
}

/** An endpoint whose 200 body holds the given fields. */
function get(path: string, fields: ApiNode[] = []) {
  const ep = newEndpoint('GET', path);
  ep.responses[0].body!.children = fields;
  return ep;
}

function described(node: ApiNode, description: string): ApiNode {
  node.description = description;
  return node;
}

describe('folding a text for comparison', () => {
  it('drops accents and case', () => {
    expect(fold('Código')).toBe('codigo');
    expect(fold('PAGINACIÓN')).toBe('paginacion');
  });

  it('drops the separators of an identifier', () => {
    expect(fold('codigo_cliente')).toBe('codigocliente');
    expect(fold('codigo-cliente')).toBe('codigocliente');
    expect(fold('codigo cliente')).toBe('codigocliente');
    expect(fold('Código_Cliente-ID')).toBe('codigoclienteid');
  });

  /** A dot is how a path is written; it is not a separator of a name. */
  it('keeps dots and braces', () => {
    expect(fold('data.cliente')).toBe('data.cliente');
    expect(fold('{id}')).toBe('{id}');
  });
});

describe('the fragment of a description that matched', () => {
  it('marks a match at the start', () => {
    expect(matchSnippet('IVA incluido', fold('iva'))).toEqual({
      before: '',
      match: 'IVA',
      after: ' incluido',
    });
  });

  it('marks a match in the middle', () => {
    expect(matchSnippet('importe con IVA incluido', fold('iva'))).toEqual({
      before: 'importe con ',
      match: 'IVA',
      after: ' incluido',
    });
  });

  it('marks a match at the end', () => {
    expect(matchSnippet('importe con IVA', fold('iva'))).toEqual({
      before: 'importe con ',
      match: 'IVA',
      after: '',
    });
  });

  /** The original is what is shown, so the marked part keeps its accent and its `_`. */
  it('marks the original text across an accent or a separator', () => {
    expect(matchSnippet('el código_cliente del pedido', fold('codigo cliente'))).toEqual({
      before: 'el ',
      match: 'código_cliente',
      after: ' del pedido',
    });
  });

  it('trims a long description around the match', () => {
    const long = `${'a'.repeat(60)} email ${'b'.repeat(60)}`;
    const snip = matchSnippet(long, fold('email'))!;
    expect(snip.match).toBe('email');
    expect(snip.before.startsWith('…')).toBe(true);
    expect(snip.after.endsWith('…')).toBe(true);
    expect(snip.before.length).toBeLessThanOrEqual(31);
    expect(snip.after.length).toBeLessThanOrEqual(31);
  });

  it('says null when nothing matches', () => {
    expect(matchSnippet('nada', fold('email'))).toBeNull();
  });
});

describe('searching the open contract', () => {
  it('finds a datum whatever way it is spelled', () => {
    const a = newNode('codigoCliente');
    const post = newEndpoint('POST', '/pedidos');
    const b = newNode('codigo_cliente');
    post.body!.children = [b];
    const c = contract({ endpoints: [get('/pedidos/{id}', [a]), post] });
    expect(searchContract(c, 'Código cliente').map((h) => h.itemId)).toEqual([a.id, b.id]);
  });

  it('matches on «contains»', () => {
    const a = newNode('email');
    const b = newNode('emailContacto');
    const c = contract({ endpoints: [get('/x', [a, b])] });
    expect(searchContract(c, 'email').map((h) => h.path)).toEqual(['email', 'emailContacto']);
  });

  it('says where a deep field is, its path and its type', () => {
    const email = newNode('email');
    const ep = get('/pedidos/{id}', [arrayOfObjects('data', [obj('cliente', [email])])]);
    const [hit] = searchContract(contract({ endpoints: [ep] }), 'email');
    expect(hit).toEqual({
      target: { kind: 'endpoint', id: ep.id },
      itemId: email.id,
      where: 'GET /pedidos/{id} · 200',
      path: 'data[].cliente.email',
      type: 'string',
      reason: 'key',
      snippet: null,
    });
  });

  it('finds a parameter by its name', () => {
    const ep = get('/pedidos');
    const param = newParam();
    param.name = 'emailFiltro';
    ep.params = [param];
    const [hit] = searchContract(contract({ endpoints: [ep] }), 'email');
    expect(hit).toMatchObject({
      itemId: param.id,
      where: 'GET /pedidos · consulta',
      path: 'emailFiltro',
      type: 'string',
      reason: 'param',
    });
  });

  it('finds a path marker nobody declared', () => {
    const ep = get('/pedidos/{idPedido}');
    const [hit] = searchContract(contract({ endpoints: [ep] }), 'idPedido');
    expect(hit).toMatchObject({
      target: { kind: 'endpoint', id: ep.id },
      itemId: null,
      where: 'GET /pedidos/{idPedido} · ruta',
      path: 'idPedido',
      reason: 'param',
    });
  });

  it('does not repeat a marker that is declared', () => {
    const ep = get('/pedidos/{idPedido}');
    const param = newParam();
    param.in = 'path';
    param.name = 'idPedido';
    ep.params = [param];
    const hits = searchContract(contract({ endpoints: [ep] }), 'idPedido');
    expect(hits.map((h) => h.itemId)).toEqual([param.id]);
  });

  it('finds a field by its description, with the fragment', () => {
    const importe = described(newNode('importe', 'number'), 'importe con IVA incluido');
    const [hit] = searchContract(contract({ endpoints: [get('/x', [importe])] }), 'iva');
    expect(hit).toMatchObject({
      itemId: importe.id,
      path: 'importe',
      reason: 'description',
      snippet: { before: 'importe con ', match: 'IVA', after: ' incluido' },
    });
  });

  it('finds a parameter by its description', () => {
    const ep = get('/x');
    const param = newParam();
    param.name = 'q';
    param.description = 'filtra por email';
    ep.params = [param];
    const [hit] = searchContract(contract({ endpoints: [ep] }), 'email');
    expect(hit).toMatchObject({ itemId: param.id, reason: 'description' });
  });

  /** One field, one line: the key is what was asked for, the description the fallback. */
  it('lists a field once when key and description both match', () => {
    const email = described(newNode('email'), 'el email del cliente');
    const hits = searchContract(contract({ endpoints: [get('/x', [email])] }), 'email');
    expect(hits).toHaveLength(1);
    expect(hits[0].reason).toBe('key');
  });

  it('shows a field of a model in the model, not in every endpoint that uses it', () => {
    const email = newNode('email');
    const cliente = model('mod-cli', 'Cliente', [email]);
    const refs = ['/a', '/b', '/c'].map((p) => {
      const ref = newNode('cliente', 'ref');
      ref.ref = 'mod-cli';
      return get(p, [ref]);
    });
    const hits = searchContract(contract({ models: [cliente], endpoints: refs }), 'email');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      target: { kind: 'model', id: 'mod-cli' },
      itemId: email.id,
      where: 'modelo Cliente',
      path: 'email',
    });
  });

  it('finds a reference field by its own key', () => {
    const ref = newNode('cliente', 'ref');
    ref.ref = 'mod-cli';
    const hits = searchContract(
      contract({ models: [model('mod-cli', 'Cliente')], endpoints: [get('/x', [ref])] }),
      'cliente',
    );
    expect(hits.map((h) => h.itemId)).toEqual([ref.id]);
    expect(hits[0].type).toBe('ref');
  });

  it('lists in the order of the contract: parameters, request, responses, then models', () => {
    const post = newEndpoint('POST', '/x');
    const param = newParam();
    param.name = 'id';
    post.params = [param];
    const inBody = newNode('id');
    post.body!.children = [inBody];
    const inResponse = newNode('id');
    post.responses[0].body!.children = [inResponse];
    const inModel = newNode('id');
    const c = contract({ endpoints: [post], models: [model('mod-a', 'A', [inModel])] });
    expect(searchContract(c, 'id').map((h) => h.itemId)).toEqual([
      param.id,
      inBody.id,
      inResponse.id,
      inModel.id,
    ]);
  });

  it('finds nothing when nothing matches', () => {
    expect(searchContract(contract({ endpoints: [get('/x', [newNode('id')])] }), 'zzz')).toEqual(
      [],
    );
  });

  /** An empty string is contained in everything, and that is not a result. */
  it('does not search an empty query, even after folding', () => {
    const c = contract({ endpoints: [get('/x', [newNode('id')])] });
    expect(searchContract(c, '')).toEqual([]);
    expect(searchContract(c, ' _- ')).toEqual([]);
  });
});
