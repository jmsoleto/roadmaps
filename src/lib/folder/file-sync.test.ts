/**
 * `FileSync` with an invented document, on purpose: if it holds for notes, it
 * holds for roadmaps, contracts and areas (carpeta-api-hub, task 1.1).
 */

import { describe, it, expect } from 'vitest';
import { FileSync, type FileFormat, type FileMap } from './file-sync';
import { MemoryDir } from './memory-fs';

type Notes = Record<string, string>;

/** Notes are `n-<id>.txt`; the shared marker belongs to whoever is first, and nobody deletes it. */
const notes = (prefix: string, marker = false): FileFormat<Notes> => ({
  owns: (name) => name.startsWith(prefix) || (marker && name === 'marker.json'),
  serialize: (data) => {
    const files: FileMap = new Map();
    if (marker) files.set('marker.json', '{"app":"notas"}\n');
    for (const [id, text] of Object.entries(data)) files.set(`${prefix}${id}.txt`, text + '\n');
    return files;
  },
  parse: (files) => {
    const data: Notes = {};
    for (const [name, text] of files) {
      if (!name.startsWith(prefix)) continue;
      if (text.includes('<<<<<<<')) return { kind: 'unreadable', file: name };
      data[name.slice(prefix.length, -4)] = text.replace(/\n$/, '');
    }
    return { kind: 'ok', data };
  },
  isEmpty: (data) => Object.keys(data).length === 0,
  deletable: (name) => name.startsWith(prefix),
});

function folder(): MemoryDir {
  return new MemoryDir('repo').dir('notas');
}

describe('FileSync', () => {
  it('una carpeta sin ficheros propios está vacía', async () => {
    const dir = folder();
    dir.put('README.md', '# hola');
    expect(await new FileSync(dir, notes('n-')).load()).toEqual({ kind: 'empty' });
  });

  it('escribe solo lo que cambia y borra solo lo suyo', async () => {
    const dir = folder();
    dir.put('README.md', '# hola');
    const sync = new FileSync(dir, notes('n-', true));
    await sync.load();
    await sync.save({ a: 'uno', b: 'dos' });
    expect(dir.writes.sort()).toEqual(['marker.json', 'n-a.txt', 'n-b.txt']);

    dir.writes = [];
    await sync.save({ a: 'uno', b: 'DOS' });
    expect(dir.writes).toEqual(['n-b.txt']);

    await sync.save({ b: 'DOS' });
    expect(dir.removals).toEqual(['n-a.txt']);
    expect(dir.read('README.md')).toBe('# hola');
    expect(dir.read('marker.json')).toBeDefined();
  });

  it('el marcador no se borra aunque el estado no lo traiga', async () => {
    const dir = folder();
    dir.put('marker.json', '{"app":"notas"}\n');
    const sync = new FileSync(dir, {
      ...notes('n-'),
      owns: (n) => n === 'marker.json' || n.startsWith('n-'),
    });
    await sync.load();
    await sync.save({ a: 'x' });
    expect(dir.removals).toEqual([]);
    expect(dir.read('marker.json')).toBeDefined();
  });

  it('dos documentos en la misma carpeta no se ven ni se pisan', async () => {
    const dir = folder();
    const first = new FileSync(dir, notes('n-', true));
    const second = new FileSync(dir, notes('m-'));
    await first.load();
    await second.load();
    await first.save({ a: 'de la primera' });
    await second.save({ a: 'de la segunda' });
    await first.save({});
    expect(dir.read('n-a.txt')).toBeUndefined();
    expect(dir.read('m-a.txt')).toBe('de la segunda\n');

    const again = await new FileSync(dir, notes('m-')).load();
    expect(again).toEqual({ kind: 'loaded', data: { a: 'de la segunda' } });
  });

  it('un fichero que llegó después no se borra', async () => {
    const dir = folder();
    const sync = new FileSync(dir, notes('n-'));
    await sync.load();
    await sync.save({ a: 'x' });
    dir.put('n-z.txt', 'llegó con un pull\n');
    await sync.save({});
    expect(dir.read('n-z.txt')).toBe('llegó con un pull\n');
  });

  it('un fichero ilegible se nombra', async () => {
    const dir = folder();
    dir.put('n-a.txt', '<<<<<<< HEAD\n');
    expect(await new FileSync(dir, notes('n-')).load()).toEqual({
      kind: 'unavailable',
      why: { cause: 'fichero-ilegible', file: 'n-a.txt' },
    });
  });

  it('una carpeta que no está es una causa, no una excepción', async () => {
    const dir = folder();
    dir.gone = true;
    expect(await new FileSync(dir, notes('n-')).load()).toEqual({
      kind: 'unavailable',
      why: { cause: 'carpeta-ausente' },
    });
  });

  it('los guardados en ráfaga se quedan con el último', async () => {
    const dir = folder();
    dir.writeDelay = 5;
    const sync = new FileSync(dir, notes('n-'));
    await sync.load();
    const saves = Array.from({ length: 10 }, (_, i) => sync.save({ a: `v${i}` }));
    expect(sync.pending).toBe(true);
    await Promise.all(saves);
    expect(sync.pending).toBe(false);
    expect(dir.writes.length).toBeLessThanOrEqual(2);
    expect(dir.read('n-a.txt')).toBe('v9\n');
  });
});
