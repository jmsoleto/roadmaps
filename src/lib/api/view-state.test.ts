import { describe, it, expect } from 'vitest';
import { followView, liftApiView, stripNodeOpen, contractNodes } from './view-state';
import { newNode } from './model/factories';
import type { ApiNode, Contract } from './model/types';

const node = (key: string, children: ApiNode[] = []) => ({ ...newNode(key, 'object'), children });

function contract(id: string): Contract {
  return {
    id,
    title: id,
    version: '1.0.0',
    description: '',
    server: '',
    colorSlot: 0,
    models: [{ id: `${id}-m`, name: 'M', description: '', node: node('m', [node('m1')]) }],
    endpoints: [
      {
        id: `${id}-e`,
        method: 'GET',
        path: '/x',
        summary: '',
        description: '',
        tags: [],
        params: [],
        body: node('body'),
        responses: [{ id: `${id}-r`, code: '200', description: '', body: node('resp') }],
      },
    ],
  };
}

/** What a version before carpeta-api-hub wrote: view state inside. */
function legacy() {
  const a = contract('a') as Contract & { view?: unknown };
  const b = contract('b') as Contract & { view?: unknown };
  a.view = { kind: 'endpoint', id: 'a-e' };
  b.view = null;
  for (const n of contractNodes(a)) (n as ApiNode & { open?: boolean }).open = true;
  for (const n of contractNodes(b)) (n as ApiNode & { open?: boolean }).open = true;
  (a.models[0].node as ApiNode & { open?: boolean }).open = false;
  (b.endpoints[0].responses[0].body as ApiNode & { open?: boolean }).open = false;
  return { contracts: [a, b], openId: 'b' };
}

describe('subir el estado de vista de documentos antiguos', () => {
  it('saca el contrato abierto, la vista de cada contrato y los nodos plegados', () => {
    const doc = legacy();
    const b = doc.contracts[1];
    expect(liftApiView(doc)).toEqual({
      openId: 'b',
      views: { a: { kind: 'endpoint', id: 'a-e' } },
      collapsed: [doc.contracts[0].models[0].node.id, b.endpoints[0].responses[0].body!.id],
    });
  });

  it('los borra del documento', () => {
    const doc = legacy();
    liftApiView(doc);
    expect(JSON.stringify(doc)).not.toMatch(/"view"|"open"|"openId"/);
  });

  it('es idempotente', () => {
    const doc = legacy();
    liftApiView(doc);
    expect(liftApiView(doc)).toEqual({ openId: undefined, views: undefined, collapsed: undefined });
  });

  it('un documento que no es un documento no dice nada', () => {
    expect(liftApiView(null)).toEqual({
      openId: undefined,
      views: undefined,
      collapsed: undefined,
    });
  });
});

describe('la biblioteca no guarda plegado', () => {
  it('se quita de todos sus nodos', () => {
    const m = { node: node('x', [node('y')]) };
    (m.node as ApiNode & { open?: boolean }).open = false;
    (m.node.children[0] as ApiNode & { open?: boolean }).open = true;
    stripNodeOpen([m]);
    expect(JSON.stringify(m)).not.toContain('"open"');
  });
});

describe('la vista de una copia', () => {
  it('sigue al endpoint equivalente', () => {
    const a = contract('a');
    const copy = contract('copia');
    expect(followView(a, copy, { kind: 'endpoint', id: 'a-e' })).toEqual({
      kind: 'endpoint',
      id: 'copia-e',
    });
  });

  it('sigue al modelo equivalente', () => {
    expect(followView(contract('a'), contract('c'), { kind: 'model', id: 'a-m' })).toEqual({
      kind: 'model',
      id: 'c-m',
    });
  });

  it('lo que no existe no se sigue', () => {
    expect(followView(contract('a'), contract('c'), { kind: 'model', id: 'nada' })).toBeNull();
    expect(followView(contract('a'), contract('c'), null)).toBeNull();
  });
});
