import { describe, it, expect } from 'vitest';
import {
  CONTRACTS_FORMAT,
  LIBRARY_FORMAT,
  ORDER_FILE,
  SOURCES_FILE,
  SOURCES_FORMAT,
  fileForContract,
  fileForEntry,
} from './folder-format';
import { MARKER_FILE } from '../folder/marker';
import { newNode } from './model/factories';
import type { ApiData, ApiNode, Contract } from './model/types';
import type { LibraryData } from './library/types';
import type { ValueSourcesData } from './sources/types';

function contract(id: string): Contract {
  const status = { ...newNode('estado', 'string'), enums: ['alta', 'baja'] };
  const items: ApiNode = { ...newNode('items', 'array'), itemType: 'object', children: [status] };
  return {
    id,
    title: `Contrato ${id}`,
    version: '1.0.0',
    description: 'Pedidos',
    server: 'https://api.ejemplo.com',
    colorSlot: 2,
    models: [
      {
        id: `${id}-m`,
        name: 'Pedido',
        description: '',
        node: { ...newNode('pedido', 'object'), children: [items] },
      },
    ],
    endpoints: [
      {
        id: `${id}-e`,
        method: 'GET',
        path: '/pedidos',
        summary: 'Listar',
        description: '',
        tags: ['pedidos'],
        params: [
          {
            id: `${id}-p`,
            in: 'query',
            name: 'page',
            type: 'integer',
            required: false,
            description: '',
            example: '1',
          },
        ],
        body: null,
        responses: [
          { id: `${id}-r`, code: '200', description: 'ok', body: newNode('respuesta', 'object') },
        ],
      },
    ],
    mock: {
      seed: 7,
      size: 20,
      pageSize: 10,
      variants: {},
      sizes: {},
      pagination: {},
      relations: {},
      collections: {},
      identities: {},
    } as unknown as Contract['mock'],
  };
}

// Built once and cloned: `newNode` issues fresh ids on every call, and two
// "equal" fixtures built separately would not be equal.
const BUILT = new Map<string, Contract>();
const api = (...ids: string[]): ApiData => ({
  contracts: ids.map((id) => {
    if (!BUILT.has(id)) BUILT.set(id, contract(id));
    return structuredClone(BUILT.get(id)!);
  }),
});

const LIB_MODELS = [contract('x').models[0], contract('y').models[0]];
const library = (): LibraryData =>
  structuredClone({
    entries: [
      {
        id: 'lib-2',
        name: 'Paginacion',
        description: '',
        updated: '2026-10-01',
        models: [LIB_MODELS[0]],
      },
      {
        id: 'lib-1',
        name: 'Direccion',
        description: '',
        updated: '2026-10-02',
        models: [LIB_MODELS[1]],
      },
    ],
  });

const sources = (): ValueSourcesData => ({
  sources: [
    {
      id: 'src-1',
      name: 'estados',
      description: '',
      updated: '2026-10-01',
      kind: 'list',
      values: ['alta', 'baja'],
      recipe: null,
    },
  ],
});

function reversedKeys<T>(v: T): T {
  if (Array.isArray(v)) return v.map(reversedKeys) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v)
        .reverse()
        .map(([k, x]) => [k, reversedKeys(x)]),
    ) as T;
  }
  return v;
}

const obj = (m: Map<string, string>) => Object.fromEntries(m);

describe('escribir es determinista', () => {
  it('contratos, biblioteca y fuentes dan los mismos bytes nazca como nazca cada objeto', () => {
    expect(obj(CONTRACTS_FORMAT.serialize(reversedKeys(api('a', 'b'))))).toEqual(
      obj(CONTRACTS_FORMAT.serialize(api('a', 'b'))),
    );
    expect(obj(LIBRARY_FORMAT.serialize(reversedKeys(library())))).toEqual(
      obj(LIBRARY_FORMAT.serialize(library())),
    );
    expect(obj(SOURCES_FORMAT.serialize(reversedKeys(sources())))).toEqual(
      obj(SOURCES_FORMAT.serialize(sources())),
    );
  });

  it('los campos conocidos van en su orden y primero', () => {
    const text = CONTRACTS_FORMAT.serialize(api('a')).get(fileForContract('a'))!;
    const keys = Object.keys(JSON.parse(text));
    expect(keys.slice(0, 6)).toEqual([
      'id',
      'title',
      'version',
      'description',
      'server',
      'colorSlot',
    ]);
    const source = JSON.parse(SOURCES_FORMAT.serialize(sources()).get(SOURCES_FILE)!).sources[0];
    expect(Object.keys(source)).toEqual([
      'id',
      'name',
      'description',
      'updated',
      'kind',
      'values',
      'recipe',
    ]);
  });

  it('un campo que nadie ha listado no se pierde', () => {
    const d = api('a');
    (d.contracts[0].models[0].node as ApiNode & { futuro?: number }).futuro = 42;
    const back = CONTRACTS_FORMAT.parse(CONTRACTS_FORMAT.serialize(d));
    expect(
      back.kind === 'ok' &&
        (back.data.contracts[0].models[0].node as ApiNode & { futuro?: number }).futuro,
    ).toBe(42);
  });

  it('el estado de vista no se escribe aunque venga en memoria', () => {
    const d = api('a') as ApiData & { openId?: string };
    d.openId = 'a';
    (d.contracts[0] as Contract & { view?: unknown }).view = { kind: 'model', id: 'a-m' };
    (d.contracts[0].models[0].node as ApiNode & { open?: boolean }).open = false;
    for (const [, t] of CONTRACTS_FORMAT.serialize(d))
      expect(t).not.toMatch(/"open"|"view"|"openId"/);
  });
});

describe('ida y vuelta', () => {
  it('los contratos, en su orden', () => {
    const d = api('b', 'a');
    expect(CONTRACTS_FORMAT.parse(CONTRACTS_FORMAT.serialize(d))).toEqual({ kind: 'ok', data: d });
  });

  it('la biblioteca, ordenada por nombre', () => {
    const back = LIBRARY_FORMAT.parse(LIBRARY_FORMAT.serialize(library()));
    expect(back.kind === 'ok' && back.data.entries.map((e) => e.name)).toEqual([
      'Direccion',
      'Paginacion',
    ]);
  });

  it('las fuentes de valores', () => {
    expect(SOURCES_FORMAT.parse(SOURCES_FORMAT.serialize(sources()))).toEqual({
      kind: 'ok',
      data: sources(),
    });
  });

  it('una carpeta sin fuentes es un catálogo vacío', () => {
    expect(SOURCES_FORMAT.parse(new Map())).toEqual({ kind: 'ok', data: { sources: [] } });
  });
});

describe('los ficheros de la carpeta', () => {
  it('cada documento solo reclama los suyos', () => {
    const all = [
      MARKER_FILE,
      ORDER_FILE,
      SOURCES_FILE,
      fileForContract('a'),
      fileForEntry('lib-1'),
      'README.md',
    ];
    expect(all.filter(CONTRACTS_FORMAT.owns)).toEqual([
      MARKER_FILE,
      ORDER_FILE,
      fileForContract('a'),
    ]);
    expect(all.filter(LIBRARY_FORMAT.owns)).toEqual([fileForEntry('lib-1')]);
    expect(all.filter(SOURCES_FORMAT.owns)).toEqual([SOURCES_FILE]);
  });

  it('el marcador no se borra nunca', () => {
    expect(CONTRACTS_FORMAT.deletable(MARKER_FILE)).toBe(false);
    expect(CONTRACTS_FORMAT.deletable(ORDER_FILE)).toBe(false);
  });

  it('un id raro no escapa de la carpeta', () => {
    expect(fileForContract('../x')).toMatch(/^c-x[0-9a-f]+\.json$/);
  });
});

describe('un cambio pequeño es un diff pequeño', () => {
  it('la descripción de un campo cambia una línea de un fichero', () => {
    const before = CONTRACTS_FORMAT.serialize(api('a', 'b'));
    const d = api('a', 'b');
    d.contracts[1].models[0].node.children[0].description = 'los pedidos';
    const after = CONTRACTS_FORMAT.serialize(d);
    const changed = [...after.keys()].filter((k) => after.get(k) !== before.get(k));
    expect(changed).toEqual([fileForContract('b')]);
    const a = before.get(fileForContract('b'))!.split('\n');
    const b = after.get(fileForContract('b'))!.split('\n');
    expect(b.filter((l, i) => l !== a[i])).toHaveLength(1);
  });
});

describe('lo que no se puede leer', () => {
  it('un contrato con un conflicto de git', () => {
    const files = CONTRACTS_FORMAT.serialize(api('a'));
    files.set(fileForContract('a'), '<<<<<<< HEAD\n');
    expect(CONTRACTS_FORMAT.parse(files)).toEqual({
      kind: 'unreadable',
      file: fileForContract('a'),
    });
  });

  it('dos contratos con el mismo id', () => {
    const files = CONTRACTS_FORMAT.serialize(api('a'));
    files.set('c-copia.json', files.get(fileForContract('a'))!);
    // The second in file order is the one named.
    expect(CONTRACTS_FORMAT.parse(files)).toEqual({ kind: 'unreadable', file: 'c-copia.json' });
  });

  it('un order.json que no es una lista', () => {
    const files = CONTRACTS_FORMAT.serialize(api('a'));
    files.set(ORDER_FILE, '{ "contratos": 1 }');
    expect(CONTRACTS_FORMAT.parse(files)).toEqual({ kind: 'unreadable', file: ORDER_FILE });
  });

  it('una entrada sin modelos', () => {
    const files = LIBRARY_FORMAT.serialize(library());
    files.set(fileForEntry('lib-1'), '{ "id": "lib-1", "name": "x" }');
    expect(LIBRARY_FORMAT.parse(files)).toEqual({
      kind: 'unreadable',
      file: fileForEntry('lib-1'),
    });
  });

  it('un catálogo de fuentes sin su lista', () => {
    expect(SOURCES_FORMAT.parse(new Map([[SOURCES_FILE, '{}']]))).toEqual({
      kind: 'unreadable',
      file: SOURCES_FILE,
    });
  });
});

describe('order.json desalineado tras un merge', () => {
  it('un contrato sin listar va al final y un id sin fichero se ignora', () => {
    const files = CONTRACTS_FORMAT.serialize(api('a', 'b'));
    files.set(ORDER_FILE, '{ "contracts": ["b", "fantasma"] }');
    const back = CONTRACTS_FORMAT.parse(files);
    expect(back.kind === 'ok' && back.data.contracts.map((c) => c.id)).toEqual(['b', 'a']);
  });
});
