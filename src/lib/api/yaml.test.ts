import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import { scalar, toYaml, type YamlValue } from './yaml';

/**
 * `js-yaml` is a **dev** dependency, here and nowhere else.
 *
 * The emitter's failure mode is silent: a document that parses into the wrong
 * value gives no error anywhere. The only way to prove it is to read what it
 * wrote with a parser that is not ours. Same argument that put `fake-indexeddb`
 * in the project. Nothing ships it.
 */
const roundTrip = (value: YamlValue) => load(toYaml(value));

describe('quoting', () => {
  /**
   * Every one of these, left bare, would parse as something other than the
   * string it is. This is the table the whole emitter exists to get right.
   */
  it.each([
    ['true'],
    ['True'],
    ['FALSE'],
    ['null'],
    ['Null'],
    ['~'],
    ['yes'],
    ['no'],
    ['on'],
    ['off'],
    ['42'],
    ['-7'],
    ['3.14'],
    ['.5'],
    ['1e10'],
    ['0x1f'],
    ['0b101'],
    [''],
    [' con espacio delante'],
    ['con espacio detrás '],
    ['clave: valor'],
    ['acaba en dos puntos:'],
    ['algo # con almohadilla'],
    ['- parece una lista'],
    ['? parece una clave compleja'],
    ['{ llave'],
    ['[ corchete'],
    ['#comentario'],
    ['&ancla'],
    ['*alias'],
    ['!etiqueta'],
    ['|bloque'],
    ['>plegado'],
    ["'comilla"],
    ['"comilla doble'],
    ['%directiva'],
    ['@arroba'],
    ['`backtick'],
    ['con\nsalto'],
    ['con\ttabulador'],
  ])('survives %j', (text) => {
    expect(roundTrip({ k: text })).toEqual({ k: text });
  });

  /**
   * The other half: not quoting what does not need it. A comment written by a
   * person is mostly commas and accents, and quoting all of it would make every
   * exported document unreadable.
   */
  it.each([
    ['Total de elementos, no de páginas'],
    ['El identificador del pedido'],
    ['catálogo/productos'],
    ['algo(entre paréntesis)'],
    ['un email@ejemplo.com dentro'],
    ['a:b sin espacio'],
    ['almohadilla#pegada'],
  ])('leaves %j bare', (text) => {
    expect(toYaml({ k: text })).toBe(`k: ${text}\n`);
    expect(roundTrip({ k: text })).toEqual({ k: text });
  });

  it('writes the scalars that are not strings as themselves', () => {
    expect(scalar(true)).toBe('true');
    expect(scalar(42)).toBe('42');
    expect(scalar(null)).toBe('null');
    expect(scalar(undefined)).toBe('null');
  });
});

describe('shape', () => {
  it('writes a flat mapping', () => {
    expect(toYaml({ openapi: '3.0.3', version: 1 })).toBe('openapi: 3.0.3\nversion: 1\n');
  });

  it('nests mappings by indentation', () => {
    expect(toYaml({ info: { title: 'API', version: '1.0.0' } })).toBe(
      'info:\n  title: API\n  version: 1.0.0\n',
    );
  });

  it('writes a sequence of scalars', () => {
    expect(toYaml({ tags: ['catalogo', 'publico'] })).toBe('tags:\n  - catalogo\n  - publico\n');
  });

  /** Where a naive emitter breaks: the dash shares the line with the first key. */
  it('writes a sequence of mappings with the dash on the first key', () => {
    expect(toYaml({ params: [{ name: 'id', in: 'path' }] })).toBe(
      'params:\n  - name: id\n    in: path\n',
    );
  });

  it('nests a mapping inside a sequence item', () => {
    const out = toYaml({ params: [{ name: 'id', schema: { type: 'string' } }] });
    expect(out).toBe('params:\n  - name: id\n    schema:\n      type: string\n');
    expect(roundTrip({ params: [{ name: 'id', schema: { type: 'string' } }] })).toEqual({
      params: [{ name: 'id', schema: { type: 'string' } }],
    });
  });

  it('writes an empty collection inline', () => {
    expect(toYaml({ a: {}, b: [] })).toBe('a: {}\nb: []\n');
  });

  it('quotes a key that is not a plain name', () => {
    expect(toYaml({ '/clientes/{id}': 1 })).toBe('"/clientes/{id}": 1\n');
    expect(roundTrip({ '/clientes/{id}': 1 })).toEqual({ '/clientes/{id}': 1 });
  });

  it('leaves a path key without markers bare', () => {
    expect(toYaml({ '/catalogo/productos': 1 })).toBe('/catalogo/productos: 1\n');
  });
});

describe('round trip', () => {
  it('reads back a document shaped like the ones this app emits', () => {
    const document = {
      openapi: '3.0.3',
      info: { title: 'Catálogo', version: '1.0.0', description: 'Productos y su búsqueda' },
      servers: [{ url: 'https://api.ejemplo.com' }],
      paths: {
        '/catalogo/productos': {
          get: {
            summary: 'Listado de productos',
            operationId: 'getCatalogoProductos',
            tags: ['catalogo'],
            parameters: [
              {
                name: 'pagina',
                in: 'query',
                required: false,
                description: 'Por defecto 1',
                schema: { type: 'integer', example: 1 },
              },
            ],
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        total: {
                          type: 'integer',
                          description: 'Total de elementos, no de páginas',
                        },
                        activo: { type: 'boolean' },
                        estado: { type: 'string', enum: ['alta', 'baja'] },
                      },
                      required: ['total'],
                    },
                    example: { total: 137, activo: true, estado: 'alta' },
                  },
                },
              },
              '204': { description: 'Sin contenido' },
            },
          },
        },
      },
    };

    expect(roundTrip(document)).toEqual(document);
  });

  it('reads back the awkward values inside a real shape', () => {
    const document = {
      paths: {
        '/x/{id}': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        // Every one of these would be read as another type bare.
                        texto: { type: 'string', example: 'true' },
                        codigo: { type: 'string', example: '007' },
                        vacio: { type: 'string', example: '' },
                        nota: { type: 'string', description: 'ojo: esto lleva dos puntos' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    expect(roundTrip(document)).toEqual(document);
  });
});
