import { describe, it, expect } from 'vitest';
import { FolderBackend } from './folder-backend';
import { MemoryDir } from '../folder/memory-fs';
import { markerText, serialize, MARKER_FILE } from './folder-format';
import { AppStore } from './app.svelte';
import type { Prefs } from './storage';
import type { AppData, Roadmap } from '../model/types';

const roadmap = (id: string, name = id): Roadmap => ({
  id,
  name,
  colorSlot: 0,
  startDate: '2026-01-01',
  windowDays: 730,
  baselineDate: null,
  rows: [],
});

const data = (...ids: string[]): AppData => ({
  roadmaps: ids.map((id) => roadmap(id)),
  assignees: [{ id: 'as1', name: 'Ana', colorSlot: 0 }],
  blockers: [],
});

/** A `roadmaps/` subfolder holding `d`, as a previous save would have left it. */
function folderWith(d: AppData | null): MemoryDir {
  const root = new MemoryDir('repo');
  const sub = root.dir('roadmaps');
  if (d) for (const [name, text] of serialize(d)) sub.put(name, text);
  else sub.put(MARKER_FILE, markerText());
  root.writes = [];
  return sub;
}

describe('leer la carpeta (6.1)', () => {
  it('con roadmaps los carga', async () => {
    const b = new FolderBackend(folderWith(data('rm-1-a', 'rm-2-b')));
    const r = await b.load();
    expect(r.kind === 'loaded' && r.data.roadmaps.map((x) => x.id)).toEqual(['rm-1-a', 'rm-2-b']);
  });

  it('marcada y sin nada más está vacía', async () => {
    expect(await new FolderBackend(folderWith(null)).load()).toEqual({ kind: 'empty' });
  });

  it('un fichero ilegible la deja no disponible, nombrándolo', async () => {
    const dir = folderWith(data('rm-1-a'));
    dir.put('rm-1-a.json', '<<<<<<< HEAD\n');
    const r = await new FolderBackend(dir).load();
    expect(r).toMatchObject({
      kind: 'unavailable',
      why: { cause: 'fichero-ilegible', file: 'rm-1-a.json' },
    });
    expect(r.kind === 'unavailable' && r.reason).toContain('roadmaps/rm-1-a.json');
  });

  it('una carpeta que ya no está la deja no disponible', async () => {
    const dir = folderWith(data('rm-1-a'));
    dir.gone = true;
    expect(await new FolderBackend(dir).load()).toMatchObject({
      kind: 'unavailable',
      why: { cause: 'carpeta-ausente' },
    });
  });

  it('los ficheros ajenos no se leen como roadmaps', async () => {
    const dir = folderWith(data('rm-1-a'));
    dir.put('README.md', '# no soy JSON');
    dir.put('package.json', '{ "name": "x" }');
    const r = await new FolderBackend(dir).load();
    expect(r.kind).toBe('loaded');
  });
});

describe('guardar en la carpeta (6.2)', () => {
  it('guardar dos veces lo mismo no escribe la segunda', async () => {
    const dir = folderWith(data('rm-1-a'));
    const b = new FolderBackend(dir);
    const r = await b.load();
    if (r.kind !== 'loaded') throw new Error(r.kind);
    await b.save(r.data);
    expect(dir.writes).toEqual([]);
  });

  it('editar un roadmap escribe solo su fichero', async () => {
    const dir = folderWith(data('rm-1-a', 'rm-2-b'));
    const b = new FolderBackend(dir);
    const r = await b.load();
    if (r.kind !== 'loaded') throw new Error(r.kind);
    r.data.roadmaps[1].name = 'otro';
    await b.save(r.data);
    expect(dir.writes).toEqual(['rm-2-b.json']);
  });

  it('borrar un roadmap borra solo su fichero', async () => {
    const dir = folderWith(data('rm-1-a', 'rm-2-b'));
    const b = new FolderBackend(dir);
    const r = await b.load();
    if (r.kind !== 'loaded') throw new Error(r.kind);
    r.data.roadmaps.splice(0, 1);
    await b.save(r.data);
    expect(dir.removals).toEqual(['rm-1-a.json']);
    expect(dir.writes).toEqual(['order.json']);
    expect(dir.read('rm-2-b.json')).toBeDefined();
  });

  it('un README y un roadmap que llegó después no se tocan', async () => {
    const dir = folderWith(data('rm-1-a'));
    dir.put('README.md', '# equipo');
    const b = new FolderBackend(dir);
    const r = await b.load();
    if (r.kind !== 'loaded') throw new Error(r.kind);
    // Un `git pull` trae un roadmap nuevo mientras la app está abierta.
    dir.put('rm-9-z.json', serialize(data('rm-9-z')).get('rm-9-z.json')!);
    r.data.roadmaps[0].name = 'cambio';
    await b.save(r.data);
    expect(dir.read('README.md')).toBe('# equipo');
    expect(dir.read('rm-9-z.json')).toBeDefined();
    expect(dir.removals).toEqual([]);
  });

  it('diez guardados seguidos son como mucho dos escrituras por fichero', async () => {
    const dir = folderWith(data('rm-1-a'));
    dir.writeDelay = 5;
    const b = new FolderBackend(dir);
    const r = await b.load();
    if (r.kind !== 'loaded') throw new Error(r.kind);
    const saves: Promise<void>[] = [];
    for (let i = 0; i < 10; i++) {
      const d = structuredClone(r.data);
      d.roadmaps[0].name = `v${i}`;
      saves.push(b.save(d));
    }
    expect(b.pending).toBe(true);
    await Promise.all(saves);
    expect(b.pending).toBe(false);
    expect(dir.writes.filter((w) => w === 'rm-1-a.json').length).toBeLessThanOrEqual(2);
    expect(JSON.parse(dir.read('rm-1-a.json')!).name).toBe('v9');
  });

  it('una escritura que falla se reintenta en el siguiente guardado', async () => {
    const dir = folderWith(data('rm-1-a'));
    const b = new FolderBackend(dir);
    const r = await b.load();
    if (r.kind !== 'loaded') throw new Error(r.kind);
    r.data.roadmaps[0].name = 'nuevo';
    dir.failWrites = true;
    await expect(b.save(r.data)).rejects.toThrow();
    expect(b.pending).toBe(false);
    dir.failWrites = false;
    await b.save(r.data);
    expect(JSON.parse(dir.read('rm-1-a.json')!).name).toBe('nuevo');
  });
});

class NoPrefs implements Prefs {
  async getPref(): Promise<string | null> {
    return null;
  }
  async setPref(): Promise<void> {}
}

describe('el indicador de guardado (6.3)', () => {
  it('se enciende cuando la cola se vacía, no al lanzar la escritura', async () => {
    const dir = folderWith(data('rm-1-a'));
    dir.writeDelay = 30;
    const store = new AppStore(new FolderBackend(dir), new NoPrefs());
    await store.init();
    store.renameRoadmap('rm-1-a', 'lento');
    const flushing = store.flush();
    await new Promise((r) => setTimeout(r, 5));
    expect(store.pending).toBe(true);
    expect(store.justSaved).toBe(false);
    await flushing;
    expect(store.pending).toBe(false);
    expect(store.justSaved).toBe(true);
    expect(JSON.parse(dir.read('rm-1-a.json')!).name).toBe('lento');
  });

  it('una escritura fallida no lo enciende y lo dice', async () => {
    const dir = folderWith(data('rm-1-a'));
    const store = new AppStore(new FolderBackend(dir), new NoPrefs());
    await store.init();
    dir.failWrites = true;
    store.renameRoadmap('rm-1-a', 'x');
    await store.flush();
    expect(store.justSaved).toBe(false);
    expect(store.saveError).toBe('disk full');
  });
});
