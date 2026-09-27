import { describe, it, expect } from 'vitest';
import { exportValueSources, parseValueSourcesImport, VALUE_SOURCES_FILENAME } from './io';
import { ValueSourcesStore } from './store.svelte';
import { ImportError } from '../io';
import { exportContract } from '../io';
import { exportLibrary } from '../library/io';
import { parseLibraryImport } from '../library/io';
import { parseContractImport } from '../io';
import { rootNode } from '../model/factories';
import type { ValueSource } from './types';
import type { ValueSourcesBackend } from '../storage';
import type { ValueSourcesData } from './types';
import type { LoadOutcome } from '../../store/indexeddb';

const source = (id: string, name: string, values: string[] = ['alta', 'baja']): ValueSource => ({
  id,
  name,
  description: '',
  updated: '2026-09-25',
  kind: 'list',
  values,
  recipe: null,
});

class Memory implements ValueSourcesBackend {
  load(): Promise<LoadOutcome<ValueSourcesData>> {
    return Promise.resolve({ kind: 'empty' });
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

async function store() {
  const s = new ValueSourcesStore(new Memory());
  await s.init();
  return s;
}

describe('the document', () => {
  it('declares what it is', () => {
    const doc = JSON.parse(exportValueSources([source('s1', 'estados')]));
    expect(doc.kind).toBe('tech-lead-hub/api-value-sources');
    expect(doc.version).toBe(1);
    expect(doc.exportedAt).toBeTruthy();
  });

  it('round-trips the sources whole', () => {
    const before = [
      source('s1', 'estados', ['alta', 'baja']),
      source('s2', 'sucursales', ['Madrid']),
    ];
    const after = parseValueSourcesImport(exportValueSources(before));
    expect(after.map((s) => s.name)).toEqual(['estados', 'sucursales']);
    expect(after[0].values).toEqual(['alta', 'baja']);
  });

  it('round-trips a recipe', () => {
    const recipe: ValueSource = {
      ...source('s3', 'codigos', []),
      kind: 'recipe',
      recipe: { kind: 'pattern', pattern: 'PED-######' },
    };
    const [back] = parseValueSourcesImport(exportValueSources([recipe]));
    expect(back.kind).toBe('recipe');
    expect(back.recipe).toEqual({ kind: 'pattern', pattern: 'PED-######' });
  });

  it('has a name that survives being saved', () => {
    expect(VALUE_SOURCES_FILENAME).toMatch(/\.json$/);
  });
});

/**
 * Three documents of this application now, so «it is not mine» says nothing.
 * Naming which of the three it is, is the whole point of the message.
 */
describe('a document that is not this one', () => {
  const contract = () =>
    exportContract({
      id: 'c1',
      title: 'Pedidos',
      version: '1.0.0',
      description: '',
      server: '',
      colorSlot: 0,
      models: [],
      endpoints: [],
      view: null,
    });
  const library = () =>
    exportLibrary([
      {
        id: 'lib-1',
        name: 'Paginacion',
        description: '',
        updated: '2026-09-01',
        models: [{ id: 'mod-1', name: 'Paginacion', description: '', node: rootNode() }],
      },
    ]);

  it('says a contract is a contract', () => {
    expect(() => parseValueSourcesImport(contract())).toThrow(/contrato/i);
  });

  it('says a model library is a model library', () => {
    expect(() => parseValueSourcesImport(library())).toThrow(/biblioteca/i);
  });

  it('names the other application when the file belongs to one', () => {
    const roadmap = JSON.stringify({ format: 'roadmaps.v1', roadmap: {} });
    expect(() => parseValueSourcesImport(roadmap)).toThrow(/Roadmaps/);
  });

  it("refuses something that is nobody's without attributing it", () => {
    expect(() => parseValueSourcesImport('{"algo":1}')).toThrow(ImportError);
    expect(() => parseValueSourcesImport('no es json')).toThrow(/JSON/i);
  });

  /** The recognition has to work through every door, not only this one. */
  it('is named by the contract importer and by the library importer', () => {
    const sources = exportValueSources([source('s1', 'estados')]);
    expect(() => parseContractImport(sources)).toThrow(/fuentes de valores/i);
    expect(() => parseLibraryImport(sources)).toThrow(/fuentes de valores/i);
  });
});

/**
 * The repair (D16): a contract arrives with assignments pointing at another
 * machine's ids, and the sources document from that machine brings them back.
 */
describe('importing sources repairs an orphaned assignment', () => {
  it('keeps the id the document brought, so the assignment finds it again', async () => {
    const s = await store();
    // A field somewhere points at `s-estados`, which is not here.
    expect(s.find('s-estados')).toBeNull();

    s.merge(parseValueSourcesImport(exportValueSources([source('s-estados', 'estados')])));

    expect(s.find('s-estados')?.name).toBe('estados');
  });

  it('does not overwrite a source that already holds that id', async () => {
    const s = await store();
    s.merge([source('s-choque', 'mia')]);
    s.merge(parseValueSourcesImport(exportValueSources([source('s-choque', 'ajena')])));

    expect(s.sources.map((x) => x.name).sort()).toEqual(['ajena', 'mia']);
    expect(s.find('s-choque')?.name).toBe('mia');
  });

  it('replaces by name, keeping the id the local assignments point at', async () => {
    const s = await store();
    s.merge([source('s-mio', 'estados', ['viejo'])]);
    s.merge(parseValueSourcesImport(exportValueSources([source('s-otro', 'estados', ['nuevo'])])));

    expect(s.sources).toHaveLength(1);
    expect(s.find('s-mio')?.values).toEqual(['nuevo']);
  });

  it('adds without touching what was already here', async () => {
    const s = await store();
    s.merge([source('s-mio', 'sucursales')]);
    s.merge(parseValueSourcesImport(exportValueSources([source('s-nueva', 'estados')])));
    expect(s.sources).toHaveLength(2);
  });
});
