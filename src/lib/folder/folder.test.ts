/**
 * The folder module knows no application. These tests use an invented one on
 * purpose: if they pass with `demo`, API Hub and Links can use the module as it
 * is (carpeta-roadmaps, task 5.4).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { MemoryDir } from './memory-fs';
import { inspectFolder } from './connect';
import { connectedName, forgetHandle, loadHandle, saveHandle } from './handles';
import { queryPermission, requestPermission } from './permission';
import { readAll, readText, removeFile, writeText } from './fs';
import { MARKER_FILE } from './marker';
import type { FolderDir } from './fs';

const APP = 'demo';
const marker = (app: string, format = 1) => JSON.stringify({ app, format });

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  get length() {
    return this.m.size;
  }
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
});

describe('qué es la carpeta elegida', () => {
  it('una raíz vacía está lista, sin datos, y no se escribe nada hasta confirmar', async () => {
    const root = new MemoryDir('repo');
    const r = await inspectFolder(root, APP, 1);
    expect(r).toMatchObject({ kind: 'ready', hasData: false });
    expect(root.snapshot()).toEqual({});

    if (r.kind !== 'ready') return;
    const sub = await r.prepare();
    expect(sub.name).toBe(APP);
    expect(JSON.parse(root.read(`${APP}/${MARKER_FILE}`)!)).toEqual({ app: APP, format: 1 });
  });

  it('una raíz con otras cosas pero sin nuestra subcarpeta también', async () => {
    const root = new MemoryDir('repo')
      .put('README.md', '# equipo')
      .put('api/tech-lead-hub.json', marker('api'));
    const r = await inspectFolder(root, APP, 1);
    expect(r).toMatchObject({ kind: 'ready', hasData: false });
  });

  it('una raíz con nuestra subcarpeta marcada: hay datos, y se usa esa', async () => {
    const root = new MemoryDir('repo').put(`${APP}/${MARKER_FILE}`, marker(APP));
    const r = await inspectFolder(root, APP, 1);
    expect(r).toMatchObject({ kind: 'ready', hasData: true });
    if (r.kind === 'ready') expect((await r.prepare()).name).toBe(APP);
    expect(root.writes).toEqual([]);
  });

  it('la propia subcarpeta, elegida directamente, se usa tal cual', async () => {
    const root = new MemoryDir('repo').put(`${APP}/${MARKER_FILE}`, marker(APP));
    const sub = root.dir(APP);
    const r = await inspectFolder(sub, APP, 1);
    expect(r).toMatchObject({ kind: 'ready', hasData: true });
    if (r.kind === 'ready') expect(await r.prepare()).toBe(sub);
    expect(sub.children.has(APP)).toBe(false);
  });

  it('la carpeta de otra aplicación se rechaza diciendo de cuál', async () => {
    const root = new MemoryDir('repo').put(`api/${MARKER_FILE}`, marker('api'));
    expect(await inspectFolder(root.dir('api'), APP, 1)).toEqual({ kind: 'foreign', app: 'api' });
    expect(root.writes).toEqual([]);
  });

  it('nuestra subcarpeta marcada por otra aplicación se rechaza igual', async () => {
    const root = new MemoryDir('repo').put(`${APP}/${MARKER_FILE}`, marker('links'));
    expect(await inspectFolder(root, APP, 1)).toEqual({ kind: 'foreign', app: 'links' });
  });

  it('una subcarpeta con nuestro nombre y sin marcador no es nuestra', async () => {
    const root = new MemoryDir('repo').put(`${APP}/notas.txt`, 'hola');
    expect(await inspectFolder(root, APP, 1)).toEqual({ kind: 'not-ours', folder: `repo/${APP}` });
    expect(root.writes).toEqual([]);
  });

  it('un marcador ilegible en la carpeta elegida tampoco', async () => {
    const root = new MemoryDir('repo').put(MARKER_FILE, '<<<<<<< HEAD');
    expect(await inspectFolder(root, APP, 1)).toEqual({ kind: 'not-ours', folder: 'repo' });
  });

  it('una versión del formato posterior se rechaza', async () => {
    const root = new MemoryDir('repo').put(`${APP}/${MARKER_FILE}`, marker(APP, 3));
    expect(await inspectFolder(root, APP, 1)).toEqual({ kind: 'future', format: 3 });
    expect(root.writes).toEqual([]);
  });
});

describe('el registro de conexiones', () => {
  it('recuerda el handle y el nombre de cada aplicación por separado', async () => {
    const a = { kind: 'directory', name: 'repo-a' } as unknown as FolderDir;
    const b = { kind: 'directory', name: 'repo-b' } as unknown as FolderDir;
    await saveHandle('uno', a);
    await saveHandle('dos', b);
    expect((await loadHandle('uno'))?.name).toBe('repo-a');
    expect((await loadHandle('dos'))?.name).toBe('repo-b');
    expect(connectedName('uno')).toBe('repo-a');
    expect(connectedName('dos')).toBe('repo-b');
  });

  it('olvidar una no toca la otra', async () => {
    await saveHandle('uno', { kind: 'directory', name: 'a' } as unknown as FolderDir);
    await saveHandle('dos', { kind: 'directory', name: 'b' } as unknown as FolderDir);
    await forgetHandle('uno');
    expect(await loadHandle('uno')).toBeNull();
    expect(connectedName('uno')).toBeNull();
    expect(connectedName('dos')).toBe('b');
  });

  it('sin conexión no hay nombre ni handle', async () => {
    expect(connectedName(APP)).toBeNull();
    expect(await loadHandle(APP)).toBeNull();
  });

  it('no abre la base compartida de las aplicaciones', async () => {
    await saveHandle('uno', { kind: 'directory', name: 'a' } as unknown as FolderDir);
    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names).toEqual(['tech-lead-hub-folders']);
  });
});

describe('el permiso', () => {
  it('consultar no lo concede', async () => {
    const dir = new MemoryDir('repo');
    dir.permission = 'prompt';
    expect(await queryPermission(dir)).toBe('prompt');
    expect(await queryPermission(dir)).toBe('prompt');
  });

  it('pedirlo devuelve lo que contesta el usuario', async () => {
    const dir = new MemoryDir('repo');
    dir.permission = 'prompt';
    dir.grantOnRequest = 'granted';
    expect(await requestPermission(dir)).toBe('granted');
    expect(await queryPermission(dir)).toBe('granted');
  });

  it('negado se queda negado', async () => {
    const dir = new MemoryDir('repo');
    dir.permission = 'prompt';
    dir.grantOnRequest = 'denied';
    expect(await requestPermission(dir)).toBe('denied');
  });
});

describe('leer y escribir ficheros', () => {
  it('escribe, lee, lista y borra', async () => {
    const dir = new MemoryDir('d');
    await writeText(dir, 'a.json', '{}\n');
    await writeText(dir, 'b.json', '[]\n');
    dir.dir('sub');
    expect(await readText(dir, 'a.json')).toBe('{}\n');
    expect(await readText(dir, 'nada.json')).toBeNull();
    expect(Object.fromEntries(await readAll(dir))).toEqual({ 'a.json': '{}\n', 'b.json': '[]\n' });
    await removeFile(dir, 'a.json');
    await removeFile(dir, 'a.json');
    expect(await readText(dir, 'a.json')).toBeNull();
  });

  it('una escritura que falla no deja el fichero a medias', async () => {
    const dir = new MemoryDir('d');
    await writeText(dir, 'a.json', 'viejo\n');
    dir.failWrites = true;
    await expect(writeText(dir, 'a.json', 'nuevo\n')).rejects.toThrow();
    expect(await readText(dir, 'a.json')).toBe('viejo\n');
  });
});
