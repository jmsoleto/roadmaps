import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import {
  buildOpenApi,
  operationId,
  parametersOf,
  prune,
  pascal,
  schemaNames,
  schemaOf,
} from './openapi';
import { toYaml } from './yaml';
import { newEndpoint, newNode, newParam, rootNode } from './model/factories';
import type { ApiEndpoint, Contract } from './model/types';

function contract(over: Partial<Contract> = {}): Contract {
  return {
    id: 'api-1',
    title: 'Catálogo',
    version: '1.0.0',
    description: '',
    server: '',
    colorSlot: 0,
    models: [],
    endpoints: [],
    view: null,
    ...over,
  };
}

/** An endpoint whose 200 body is the given fields. */
function withBody(fields: ReturnType<typeof newNode>[], over: Partial<ApiEndpoint> = {}) {
  const endpoint = { ...newEndpoint('GET', '/catalogo/productos'), ...over };
  endpoint.responses[0].body!.children = fields;
  return endpoint;
}

const body200 = (doc: ReturnType<typeof buildOpenApi>, path = '/catalogo/productos') =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc.paths as any)[path].get.responses['200'].content['application/json'];

describe('a field becomes a schema', () => {
  it('carries the comment as the description', () => {
    const node = newNode('total', 'integer');
    node.description = 'Total de elementos, no de páginas';
    expect(schemaOf(node).description).toBe('Total de elementos, no de páginas');
  });

  it('carries the format, the enumeration and the example', () => {
    const node = newNode('estado');
    node.format = 'date';
    node.enums = ['alta', 'baja'];
    node.example = 'alta';
    expect(schemaOf(node)).toMatchObject({
      type: 'string',
      format: 'date',
      enum: ['alta', 'baja'],
      example: 'alta',
    });
  });

  it('emits a numeric enumeration as numbers', () => {
    const node = newNode('nivel', 'integer');
    node.enums = ['1', '2'];
    expect(schemaOf(node).enum).toEqual([1, 2]);
  });

  it('lists the required fields of an object and leaves out the optional ones', () => {
    const root = rootNode();
    const optional = newNode('apodo');
    optional.required = false;
    root.children = [newNode('id'), newNode('nombre'), optional];
    expect(schemaOf(root).required).toEqual(['id', 'nombre']);
  });

  it('omits `required` entirely when nothing is required', () => {
    const root = rootNode();
    const one = newNode('apodo');
    one.required = false;
    root.children = [one];
    expect(schemaOf(root).required).toBeUndefined();
  });

  it('skips a field being typed, which has no key yet', () => {
    const root = rootNode();
    root.children = [newNode('', 'string'), newNode('nombre')];
    expect(Object.keys(schemaOf(root).properties as object)).toEqual(['nombre']);
  });

  it('describes an array by what it holds', () => {
    const items = newNode('items', 'array');
    items.itemType = 'object';
    items.children = [newNode('id')];
    expect(schemaOf(items)).toMatchObject({ type: 'array', items: { type: 'object' } });

    const tallas = newNode('tallas', 'array');
    tallas.itemType = 'integer';
    expect(schemaOf(tallas).items).toEqual({ type: 'integer' });
  });

  /** OpenAPI 3.0 has no null type. */
  it('describes a null field as a nullable string', () => {
    expect(schemaOf(newNode('borradoEl', 'null'))).toEqual({ type: 'string', nullable: true });
  });

  it('marks a nullable field', () => {
    const node = newNode('apodo');
    node.nullable = true;
    expect(schemaOf(node).nullable).toBe(true);
  });
});

describe('references, which nothing can produce yet', () => {
  const names = { 'mod-1': 'Paginacion' };

  it('points inside the document, never outside it', () => {
    const node = newNode('paginacion', 'ref');
    node.ref = 'mod-1';
    expect(schemaOf(node, names)).toEqual({ $ref: '#/components/schemas/Paginacion' });
  });

  /**
   * The least obvious decision in the PRD: in OAS 3.0.x the siblings of a
   * `$ref` are ignored by the specification, so `$ref` + `description` would
   * drop the comment in silence.
   */
  it('wraps in allOf so a comment on a reference survives', () => {
    const node = newNode('paginacion', 'ref');
    node.ref = 'mod-1';
    node.description = 'El bloque de paginación de siempre';
    expect(schemaOf(node, names)).toEqual({
      allOf: [{ $ref: '#/components/schemas/Paginacion' }],
      description: 'El bloque de paginación de siempre',
    });
  });

  it('says so rather than emitting a dangling reference', () => {
    const node = newNode('x', 'ref');
    node.ref = 'mod-borrado';
    expect(schemaOf(node, names).description).toContain('no existe');
  });
});

describe('pruning', () => {
  it('drops what nobody wrote', () => {
    expect(prune({ a: 1, b: '', c: undefined })).toEqual({ a: 1 });
  });

  /** `required: false` says something; `0` is a value. */
  it('keeps false and zero', () => {
    expect(prune({ required: false, total: 0 })).toEqual({ required: false, total: 0 });
  });

  it('reaches inside arrays and nested objects', () => {
    expect(prune({ a: [{ b: '', c: 1 }] })).toEqual({ a: [{ c: 1 }] });
  });
});

describe('the operation id', () => {
  it('joins the method and the path', () => {
    expect(operationId(newEndpoint('GET', '/catalogo/productos'))).toBe('getCatalogoProductos');
  });

  it('drops the braces of a marker', () => {
    expect(operationId(newEndpoint('DELETE', '/clientes/{id}'))).toBe('deleteClientesId');
  });

  it('names the root', () => {
    expect(operationId(newEndpoint('GET', '/'))).toBe('getRoot');
  });
});

describe('parameters', () => {
  it('declares the path markers nobody declared', () => {
    const endpoint = newEndpoint('GET', '/clientes/{id}/pedidos/{pedidoId}');
    expect(parametersOf(endpoint)).toEqual([
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'pedidoId', in: 'path', required: true, schema: { type: 'string' } },
    ]);
  });

  it('does not declare a marker twice when it was declared by hand', () => {
    const endpoint = newEndpoint('GET', '/clientes/{id}');
    const param = { ...newParam(), in: 'path' as const, name: 'id', description: 'El cliente' };
    endpoint.params = [param];

    const params = parametersOf(endpoint);
    expect(params).toHaveLength(1);
    expect(params[0]).toMatchObject({ name: 'id', description: 'El cliente' });
  });

  /** A path parameter is required by definition, whatever the checkbox says. */
  it('makes a declared path parameter required anyway', () => {
    const endpoint = newEndpoint('GET', '/clientes/{id}');
    endpoint.params = [{ ...newParam(), in: 'path', name: 'id', required: false }];
    expect(parametersOf(endpoint)[0]).toMatchObject({ required: true });
  });

  it('keeps a query parameter optional', () => {
    const endpoint = newEndpoint('GET', '/productos');
    endpoint.params = [{ ...newParam(), name: 'pagina', type: 'integer', example: '1' }];
    expect(parametersOf(endpoint)[0]).toEqual({
      name: 'pagina',
      in: 'query',
      required: false,
      schema: { type: 'integer', example: 1 },
    });
  });

  /** `example: '1'` under `type: integer` is a schema violation. */
  it('types the example by the parameter’s own type', () => {
    const endpoint = newEndpoint('GET', '/productos');
    endpoint.params = [
      { ...newParam(), name: 'pagina', type: 'integer', example: '1' },
      { ...newParam(), name: 'activo', type: 'boolean', example: 'true' },
      { ...newParam(), name: 'buscar', type: 'string', example: 'camisa' },
    ];
    const schemas = parametersOf(endpoint).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p) => (p as any).schema.example,
    );
    expect(schemas).toEqual([1, true, 'camisa']);
  });

  it('ignores a parameter row nobody named', () => {
    const endpoint = newEndpoint('GET', '/productos');
    endpoint.params = [newParam()];
    expect(parametersOf(endpoint)).toEqual([]);
  });
});

describe('the whole document', () => {
  it('declares the version and the API', () => {
    const doc = buildOpenApi(contract({ server: 'https://api.ejemplo.com' }));
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.info).toEqual({ title: 'Catálogo', version: '1.0.0' });
    expect(doc.servers).toEqual([{ url: 'https://api.ejemplo.com' }]);
  });

  it('leaves out the server when there is none', () => {
    expect(buildOpenApi(contract()).servers).toBeUndefined();
  });

  it('puts each endpoint under its path and method', () => {
    const doc = buildOpenApi(
      contract({ endpoints: [newEndpoint('GET', '/a'), newEndpoint('POST', '/a')] }),
    );
    expect(Object.keys(doc.paths as object)).toEqual(['/a']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(Object.keys((doc.paths as any)['/a'])).toEqual(['get', 'post']);
  });

  it('does not emit what nobody wrote', () => {
    const doc = buildOpenApi(contract({ endpoints: [newEndpoint('GET', '/a')] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = (doc.paths as any)['/a'].get;
    expect(op.summary).toBeUndefined();
    expect(op.description).toBeUndefined();
    expect(op.tags).toBeUndefined();
  });

  it('gives a response with no description one of its own', () => {
    const endpoint = newEndpoint('GET', '/a');
    endpoint.responses[0].code = '404';
    endpoint.responses[0].description = '';
    const doc = buildOpenApi(contract({ endpoints: [endpoint] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((doc.paths as any)['/a'].get.responses['404'].description).toBe('No encontrado');
  });

  it('gives an endpoint with no responses a generic success', () => {
    const endpoint = newEndpoint('GET', '/a');
    endpoint.responses = [];
    const doc = buildOpenApi(contract({ endpoints: [endpoint] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((doc.paths as any)['/a'].get.responses).toEqual({ '200': { description: 'OK' } });
  });

  it('emits a response with no body as code and description alone', () => {
    const endpoint = newEndpoint('GET', '/a');
    endpoint.responses[0].code = '204';
    endpoint.responses[0].body = null;
    const doc = buildOpenApi(contract({ endpoints: [endpoint] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (doc.paths as any)['/a'].get.responses['204'];
    expect(response.content).toBeUndefined();
    expect(response.description).toBeTruthy();
  });

  it('emits the body with its schema and its example', () => {
    const total = newNode('total', 'integer');
    total.example = '137';
    total.description = 'Total de elementos, no de páginas';
    const doc = buildOpenApi(contract({ endpoints: [withBody([total])] }));

    expect(body200(doc).schema.properties.total.description).toBe(
      'Total de elementos, no de páginas',
    );
    expect(body200(doc).example).toEqual({ total: 137 });
  });

  it('has no components while there are no models', () => {
    expect(buildOpenApi(contract({ endpoints: [newEndpoint()] })).components).toBeUndefined();
  });

  /** The property the PRD calls a hard requirement for a coding agent. */
  it('references nothing outside itself', () => {
    const doc = buildOpenApi(contract({ endpoints: [withBody([newNode('id')])] }));
    const refs = [...JSON.stringify(doc).matchAll(/"\$ref":"([^"]+)"/g)].map((m) => m[1]);
    for (const ref of refs) expect(ref.startsWith('#/')).toBe(true);
  });
});

describe('the emitted document reads back', () => {
  it('round-trips through YAML into the same tree', () => {
    const total = newNode('total', 'integer');
    total.example = '137';
    total.description = 'Total de elementos, no de páginas';

    const doc = buildOpenApi(
      contract({
        server: 'https://api.ejemplo.com',
        endpoints: [withBody([total], { path: '/clientes/{id}/pedidos' })],
      }),
    );

    expect(load(toYaml(doc))).toEqual(JSON.parse(JSON.stringify(doc)));
  });
});

describe('naming models', () => {
  it('normalises to PascalCase', () => {
    expect(pascal('item producto')).toBe('ItemProducto');
    expect(pascal('')).toBe('Modelo');
  });

  /** `paginación` → `PaginaciN` is what happens without folding the accent. */
  it('folds accents instead of splitting on them', () => {
    expect(pascal('paginación')).toBe('Paginacion');
    expect(pascal('Ítem de pedido')).toBe('ItemDePedido');
  });

  it('numbers a name that would collide', () => {
    const names = schemaNames([
      { id: 'a', name: 'Paginacion', description: '', node: rootNode() },
      { id: 'b', name: 'paginacion', description: '', node: rootNode() },
    ]);
    expect(Object.values(names)).toEqual(['Paginacion', 'Paginacion2']);
  });
});
