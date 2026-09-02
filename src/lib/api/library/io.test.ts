import { describe, it, expect } from 'vitest';
import { exportLibrary, parseLibraryImport } from './io';
import { ImportError } from '../io';
import { newNode, rootNode } from '../model/factories';
import type { ApiModel } from '../model/types';
import type { LibraryEntry } from './types';

function model(id: string, name: string, fields: ReturnType<typeof newNode>[] = []): ApiModel {
  const node = rootNode();
  node.children = fields;
  return { id, name, description: '', node };
}

const entry = (name: string): LibraryEntry => ({
  id: `lib-${name}`,
  name,
  description: 'lo de siempre',
  updated: '2026-09-01T00:00:00Z',
  models: [model(`mod-${name}`, name, [newNode('pagina')])],
});

describe('exporting', () => {
  it('declares what it is', () => {
    const doc = JSON.parse(exportLibrary([entry('Paginacion')]));
    expect(doc.kind).toBe('tech-lead-hub/api-library');
    expect(doc.version).toBe(1);
    expect(doc.entries).toHaveLength(1);
  });
});

describe('importing', () => {
  it('brings the entries back', () => {
    const back = parseLibraryImport(exportLibrary([entry('Paginacion'), entry('Moneda')]));
    expect(back.map((e) => e.name)).toEqual(['Paginacion', 'Moneda']);
    expect(back[0].models[0].node.children[0].key).toBe('pagina');
    expect(back[0].description).toBe('lo de siempre');
  });

  /** Identity is ours, so importing does not depend on the source's ids. */
  it('gives each entry a new identifier', () => {
    const back = parseLibraryImport(exportLibrary([entry('Paginacion')]));
    expect(back[0].id).not.toBe('lib-Paginacion');
  });

  it('drops an entry with no models rather than importing an empty one', () => {
    const doc = JSON.parse(exportLibrary([entry('Paginacion')]));
    doc.entries.push({ id: 'x', name: 'Vacia', models: [] });
    expect(parseLibraryImport(JSON.stringify(doc)).map((e) => e.name)).toEqual(['Paginacion']);
  });
});

describe('rejecting', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseLibraryImport('no soy json')).toThrow(ImportError);
  });

  /** Both are ours, so «not mine» would not be enough to act on. */
  it('says a contract is a contract, not just that it is not a library', () => {
    expect(() => parseLibraryImport('{"kind":"tech-lead-hub/api-contract","contract":{}}')).toThrow(
      /contrato/,
    );
  });

  it('names the application a foreign document belongs to', () => {
    expect(() => parseLibraryImport('{"kind":"tech-lead-hub/decisions","decisions":[]}')).toThrow(
      /Decisions/,
    );
    expect(() => parseLibraryImport('{"format":"roadmaps.v1","roadmap":{}}')).toThrow(/Roadmaps/);
  });

  it('rejects a library with nothing readable in it', () => {
    expect(() => parseLibraryImport('{"kind":"tech-lead-hub/api-library","entries":[]}')).toThrow(
      /ninguna entrada/,
    );
  });
});
