import { describe, it, expect } from 'vitest';
import { exportContract, exportFilename, parseContractImport, ImportError } from './io';
import { buildOpenApi } from './openapi';
import { newEndpoint, newNode, rootNode } from './model/factories';
import type { ApiModel, Contract } from './model/types';

function model(id: string, name: string, fields: ReturnType<typeof newNode>[]): ApiModel {
  const node = rootNode();
  node.children = fields;
  return { id, name, description: '', node };
}

const refTo = (key: string, id: string) => {
  const node = newNode(key, 'ref');
  node.ref = id;
  return node;
};

/** A contract with a model, a reference to it, and something to look at. */
function wired(over: Partial<Contract> = {}): Contract {
  const endpoint = newEndpoint('GET', '/catalogo/productos');
  endpoint.summary = 'Listado';
  const total = newNode('total', 'integer');
  total.description = 'Total de elementos, no de páginas';
  endpoint.responses[0].body!.children = [refTo('paginacion', 'mod-pag'), total];

  return {
    id: 'api-1',
    title: 'Catálogo de productos',
    version: '1.2.0',
    description: 'Los productos y su búsqueda',
    server: 'https://api.ejemplo.com',
    colorSlot: 3,
    models: [model('mod-pag', 'Paginacion', [newNode('pagina', 'integer')])],
    endpoints: [endpoint],
    view: { kind: 'endpoint', id: endpoint.id },
    ...over,
  };
}

describe('exporting', () => {
  it('declares what it is', () => {
    const doc = JSON.parse(exportContract(wired()));
    expect(doc.kind).toBe('tech-lead-hub/api-contract');
    expect(doc.version).toBe(1);
    expect(doc.exportedAt).toBeTruthy();
  });

  it('carries the contract with its models inside', () => {
    const doc = JSON.parse(exportContract(wired()));
    expect(doc.contract.models).toHaveLength(1);
    expect(doc.contract.endpoints).toHaveLength(1);
  });

  /** What somebody was editing belongs to them, not to whoever receives it. */
  it('does not carry what was being edited', () => {
    const doc = JSON.parse(exportContract(wired()));
    expect(doc.contract.view).toBeNull();
  });

  it('names the file after the API and its version', () => {
    expect(exportFilename(wired())).toBe('catalogo-de-productos-v1.2.0-contrato.json');
  });

  it('names a file for a contract with no version', () => {
    expect(exportFilename(wired({ version: '  ' }))).toBe('catalogo-de-productos-contrato.json');
  });
});

describe('importing', () => {
  it('brings the contract back whole', () => {
    const back = parseContractImport(exportContract(wired()));
    expect(back.title).toBe('Catálogo de productos');
    expect(back.version).toBe('1.2.0');
    expect(back.server).toBe('https://api.ejemplo.com');
    expect(back.models[0].name).toBe('Paginacion');
    expect(back.endpoints[0].summary).toBe('Listado');
  });

  it('keeps the comments, which are the point of the tool', () => {
    const back = parseContractImport(exportContract(wired()));
    const total = back.endpoints[0].responses[0].body!.children[1];
    expect(total.description).toBe('Total de elementos, no de páginas');
  });

  it('gives everything a new identity', () => {
    const back = parseContractImport(exportContract(wired()));
    expect(back.id).not.toBe('api-1');
    expect(back.models[0].id).not.toBe('mod-pag');
  });

  /** The failure that matters: pointing at somebody else's models. */
  it('repoints the references at its own models', () => {
    const back = parseContractImport(exportContract(wired()));
    const ref = back.endpoints[0].responses[0].body!.children[0];
    expect(ref.ref).toBe(back.models[0].id);
    expect(ref.ref).not.toBe('mod-pag');
  });

  it('produces two independent contracts when imported twice', () => {
    const text = exportContract(wired());
    const first = parseContractImport(text);
    const second = parseContractImport(text);

    expect(first.id).not.toBe(second.id);
    expect(first.models[0].id).not.toBe(second.models[0].id);
    second.title = 'Otro';
    expect(first.title).toBe('Catálogo de productos');
  });

  it('opens clean, not on whatever the exporter was editing', () => {
    expect(parseContractImport(exportContract(wired())).view).toBeNull();
  });

  it('keeps the palette slot the document brings', () => {
    expect(parseContractImport(exportContract(wired()), 7).colorSlot).toBe(3);
  });

  /** Inside a document its own position is always zero and says nothing. */
  it('takes the slot of where it lands when the document brings none', () => {
    const doc = JSON.parse(exportContract(wired()));
    delete doc.contract.colorSlot;
    expect(parseContractImport(JSON.stringify(doc), 7).colorSlot).toBe(7);
  });

  it('describes the same API after a full round trip', () => {
    const original = wired();
    const back = parseContractImport(exportContract(original));
    // Identity differs by design; what the document says must not.
    expect(JSON.stringify(buildOpenApi(back))).toBe(JSON.stringify(buildOpenApi(original)));
  });
});

describe('rejecting', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseContractImport('esto no es json')).toThrow(ImportError);
  });

  it('names the application a foreign document belongs to', () => {
    expect(() => parseContractImport('{"kind":"tech-lead-hub/decisions","decisions":[]}')).toThrow(
      /Decisions/,
    );
    expect(() => parseContractImport('{"format":"roadmaps.v1","roadmap":{}}')).toThrow(/Roadmaps/);
    expect(() => parseContractImport('{"rows":[]}')).toThrow(/Roadmaps/);
  });

  it('rejects a JSON that is nobody’s without blaming anyone', () => {
    expect(() => parseContractImport('{"hola":1}')).toThrow(ImportError);
    expect(() => parseContractImport('{"hola":1}')).not.toThrow(/Roadmaps|Decisions/);
  });

  /**
   * The other half of the pair: the library's parser says «this is a contract»,
   * and this one has to say the mirror. Both are API Hub's own documents, so
   * naming the wrong application is not available as an explanation.
   */
  it('says a library is a library, not just that it is not a contract', () => {
    expect(() => parseContractImport('{"kind":"tech-lead-hub/api-library","entries":[]}')).toThrow(
      /biblioteca de modelos/,
    );
  });

  it('rejects our own document with no contract in it', () => {
    expect(() => parseContractImport('{"kind":"tech-lead-hub/api-contract"}')).toThrow(
      /no contiene/,
    );
  });
});

describe('a contract with a mock travels whole', () => {
  /** A contract with every kind of mock setting somebody could have touched. */
  function withMock(): Contract {
    const base = parseContractImport(exportContract(wired()));
    const endpoint = base.endpoints[0];
    const response = endpoint.responses[0];
    base.mock = {
      seed: 4821,
      size: 45,
      pageSize: 20,
      variants: 3,
      sizes: { clientes: 90 },
      pagination: {
        [response.id]: {
          items: 'data',
          page: 'meta.page',
          size: 'meta.size',
          total: 'meta.totalElements',
          hasNext: '',
          next: '',
          prev: '',
          base: 0,
          pageSize: 25,
        },
      },
      relations: { [endpoint.id]: { parent: 'clientes', foreignKey: 'clienteId' } },
      collections: { [endpoint.id]: 'clientes' },
      identities: { clientes: 'clienteId' },
    };
    if (base.models[0]?.node.children[0]) {
      base.models[0].node.children[0].source = {
        sourceId: 's-estados',
        recipe: null,
        draw: 'cycle',
      };
    }
    return base;
  }

  it('carries the settings and the assignments', () => {
    const back = parseContractImport(exportContract(withMock()));
    expect(back.mock?.seed).toBe(4821);
    expect(back.mock?.sizes).toEqual({ clientes: 90 });
    expect(back.mock?.identities).toEqual({ clientes: 'clienteId' });
    expect(back.models[0].node.children[0].source).toEqual({
      sourceId: 's-estados',
      recipe: null,
      draw: 'cycle',
    });
  });

  /**
   * Identity is reissued on the way in, and the corrections are keyed by it. If
   * they were not remapped, importing would silently throw away every envelope
   * somebody had corrected and the mock would quietly go back to guessing.
   */
  it('keeps the corrections reachable under the new identity', () => {
    const back = parseContractImport(exportContract(withMock()));
    const endpoint = back.endpoints[0];
    const response = endpoint.responses[0];

    expect(Object.keys(back.mock!.pagination)).toEqual([response.id]);
    expect(back.mock!.pagination[response.id].total).toBe('meta.totalElements');
    expect(back.mock!.pagination[response.id].base).toBe(0);
    expect(back.mock!.relations[endpoint.id]).toEqual({
      parent: 'clientes',
      foreignKey: 'clienteId',
    });
    expect(back.mock!.collections[endpoint.id]).toBe('clientes');
  });

  it('does not grow with unreachable entries on every round trip', () => {
    const once = parseContractImport(exportContract(withMock()));
    const twice = parseContractImport(exportContract(once));
    expect(Object.keys(twice.mock!.pagination)).toHaveLength(1);
    expect(Object.keys(twice.mock!.relations)).toHaveLength(1);
  });

  /** A contract written before any of this existed must come in untouched. */
  it('lets a contract with no mock in without inventing one', () => {
    const plain = wired();
    const back = parseContractImport(exportContract(plain));
    expect(back.mock).toBeUndefined();
  });

  /**
   * D16: the document stays self-contained for what it describes. The values of
   * a source are not the contract, so an assignment arriving without them is
   * **kept** — the file of sources may come later, and erasing it would lose
   * work over the order two files happened to be opened in.
   */
  it('keeps an assignment whose source is nowhere to be found', () => {
    const back = parseContractImport(exportContract(withMock()));
    expect(back.models[0].node.children[0].source?.sourceId).toBe('s-estados');
  });
});
