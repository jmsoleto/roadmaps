import { describe, it, expect } from 'vitest';
import { briefOf } from './brief';
import { newEndpoint, newNode, newParam } from './model/factories';
import type { Contract } from './model/types';

function contract(over: Partial<Contract> = {}): Contract {
  return {
    id: 'api-1',
    title: 'Catálogo',
    version: '1.2.0',
    description: '',
    server: 'https://api.ejemplo.com',
    colorSlot: 0,
    models: [],
    endpoints: [],
    view: null,
    ...over,
  };
}

describe('the briefing', () => {
  it('opens with the API and its version', () => {
    expect(briefOf(contract())).toContain('# Catálogo v1.2.0');
  });

  it('says of itself that the OpenAPI is the source of truth', () => {
    expect(briefOf(contract())).toContain('fuente de verdad');
  });

  it('says so when there is no server', () => {
    expect(briefOf(contract({ server: '' }))).toContain('(sin servidor)');
  });

  it('carries the comment of each field', () => {
    const total = newNode('total', 'integer');
    total.description = 'Total de elementos, no de páginas';
    const endpoint = newEndpoint('GET', '/productos');
    endpoint.responses[0].body!.children = [total];

    expect(briefOf(contract({ endpoints: [endpoint] }))).toContain(
      '- `total`: integer — Total de elementos, no de páginas',
    );
  });

  it('marks the optional fields and leaves the required ones alone', () => {
    const optional = newNode('apodo');
    optional.required = false;
    const endpoint = newEndpoint('GET', '/x');
    endpoint.responses[0].body!.children = [newNode('id'), optional];

    const md = briefOf(contract({ endpoints: [endpoint] }));
    expect(md).toContain('- `apodo`: string (opcional)');
    expect(md).toContain('- `id`: string');
    expect(md).not.toContain('- `id`: string (opcional)');
  });

  it('indents the nested fields', () => {
    const direccion = newNode('direccion', 'object');
    direccion.children = [newNode('calle')];
    const endpoint = newEndpoint('GET', '/x');
    endpoint.responses[0].body!.children = [direccion];

    expect(briefOf(contract({ endpoints: [endpoint] }))).toContain('  - `calle`: string');
  });

  it('describes an array by what it holds', () => {
    const items = newNode('items', 'array');
    items.itemType = 'object';
    const endpoint = newEndpoint('GET', '/x');
    endpoint.responses[0].body!.children = [items];

    expect(briefOf(contract({ endpoints: [endpoint] }))).toContain('- `items`: array<object>');
  });

  it('lists the parameters, marking a path one as required', () => {
    const endpoint = newEndpoint('GET', '/clientes/{id}');
    endpoint.params = [{ ...newParam(), in: 'path', name: 'id', description: 'El cliente' }];

    expect(briefOf(contract({ endpoints: [endpoint] }))).toContain(
      '- `id` (path, string, obligatorio) — El cliente',
    );
  });

  it('says when a response has no body', () => {
    const endpoint = newEndpoint('GET', '/x');
    endpoint.responses[0].body = null;
    expect(briefOf(contract({ endpoints: [endpoint] }))).toContain('- sin cuerpo');
  });

  it('says so when nothing has been described yet', () => {
    expect(briefOf(contract())).toContain('Ninguno descrito todavía.');
  });

  it('shows the format and the admitted values', () => {
    const estado = newNode('estado');
    estado.format = 'date';
    estado.enums = ['alta', 'baja'];
    const endpoint = newEndpoint('GET', '/x');
    endpoint.responses[0].body!.children = [estado];

    const md = briefOf(contract({ endpoints: [endpoint] }));
    expect(md).toContain('[date]');
    expect(md).toContain('∈ {alta, baja}');
  });
});
