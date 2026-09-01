import { describe, it, expect } from 'vitest';
import { issueCount, validateContract } from './validate';
import { newEndpoint, newNode } from './model/factories';
import type { ApiEndpoint, Contract } from './model/types';

function contract(endpoints: ApiEndpoint[] = []): Contract {
  return {
    id: 'api-1',
    title: 'Catálogo',
    version: '1.0.0',
    description: '',
    server: '',
    colorSlot: 0,
    models: [],
    endpoints,
    view: null,
  };
}

/** An endpoint whose 200 body holds the given fields. */
function withFields(fields: ReturnType<typeof newNode>[], path = '/productos') {
  const endpoint = newEndpoint('GET', path);
  endpoint.responses[0].body!.children = fields;
  return endpoint;
}

describe('endpoints', () => {
  it('catches a path that does not start with a slash', () => {
    const issues = validateContract(contract([withFields([newNode('id')], 'catalogo/productos')]));
    expect(issues.map((i) => i.what)).toContain('la ruta debe empezar por «/»');
  });

  it('catches an endpoint with no responses', () => {
    const endpoint = newEndpoint('GET', '/productos');
    endpoint.responses = [];
    const issues = validateContract(contract([endpoint]));
    expect(issues.map((i) => i.what)).toContain('no tiene ninguna respuesta declarada');
  });
});

describe('fields', () => {
  it('catches a key repeated inside the same object', () => {
    const issues = validateContract(
      contract([withFields([newNode('nombre'), newNode('precio'), newNode('nombre')])]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].what).toContain('«nombre»');
  });

  it('reports a repeated key once, however many times it repeats', () => {
    const issues = validateContract(
      contract([withFields([newNode('a'), newNode('a'), newNode('a')])]),
    );
    expect(issues).toHaveLength(1);
  });

  /** The same key in two different objects is not a repetition. */
  it('does not confuse the same key in two different objects', () => {
    const outer = newNode('cliente', 'object');
    outer.children = [newNode('id')];
    const issues = validateContract(contract([withFields([newNode('id'), outer])]));
    expect(issues).toEqual([]);
  });

  it('catches a field with no name, once per object', () => {
    const issues = validateContract(
      contract([withFields([newNode('', 'string'), newNode('', 'string'), newNode('ok')])]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].what).toBe('hay un campo sin nombre');
  });

  it('catches a body declared and left empty', () => {
    const issues = validateContract(contract([withFields([])]));
    expect(issues.map((i) => i.what)).toContain('el cuerpo está declarado y no tiene ningún campo');
  });

  it('looks inside nested objects', () => {
    const nested = newNode('direccion', 'object');
    nested.children = [newNode('calle'), newNode('calle')];
    const issues = validateContract(contract([withFields([nested])]));
    expect(issues.map((i) => i.what)).toContain(
      'la clave «calle» está repetida en el mismo objeto',
    );
  });
});

describe('where it happens', () => {
  /** «hay una clave duplicada» and nothing else makes you go and find it. */
  it('names the endpoint and the response', () => {
    const issues = validateContract(
      contract([withFields([newNode('a'), newNode('a')], '/catalogo/productos')]),
    );
    expect(issues[0].where).toBe('GET /catalogo/productos · 200');
  });

  it('names the request body apart from the responses', () => {
    const endpoint = withFields([newNode('ok')]);
    endpoint.body = newNode('', 'object');
    endpoint.body.children = [newNode('x'), newNode('x')];
    const issues = validateContract(contract([endpoint]));
    expect(issues[0].where).toContain('petición');
  });
});

describe('a contract with nothing wrong', () => {
  it('produces no issues', () => {
    expect(validateContract(contract([withFields([newNode('id'), newNode('nombre')])]))).toEqual(
      [],
    );
  });
});

describe('counting for the hub', () => {
  /** Unstarted is not the same as wrong (D5). */
  it('says nothing about a contract with no endpoints', () => {
    expect(issueCount(contract())).toBe(0);
  });

  it('counts the problems of a contract that has some', () => {
    const broken = withFields([newNode('a'), newNode('a')], 'sin-barra');
    expect(issueCount(contract([broken]))).toBe(2);
  });

  it('counts zero for a coherent contract', () => {
    expect(issueCount(contract([withFields([newNode('id')])]))).toBe(0);
  });
});

describe('a document that is not what it should be', () => {
  /**
   * This runs on the hub's landing, where the three applications share a page.
   * Throwing here over a corrupt contract would take Roadmaps and Decisions
   * down with it, which is a much worse failure than a wrong count.
   */
  it('does not throw over an endpoint missing its fields', () => {
    const corrupt = contract([{ id: 'ep-1' } as unknown as ApiEndpoint]);
    expect(() => validateContract(corrupt)).not.toThrow();
    expect(validateContract(corrupt).length).toBeGreaterThan(0);
  });

  it('does not throw over a body missing its children', () => {
    const endpoint = newEndpoint('GET', '/x');
    // @ts-expect-error deliberately malformed, as a corrupt document would be
    endpoint.responses[0].body.children = undefined;
    expect(() => validateContract(contract([endpoint]))).not.toThrow();
  });
});
