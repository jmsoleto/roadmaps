/**
 * API Hub's three documents in one folder (carpeta-api-hub, group 4).
 */

import { describe, it, expect } from 'vitest';
import { MemoryDir } from '../folder/memory-fs';
import { FolderDocBackend, UnavailableDocBackend } from './storage';
import { CONTRACTS_FORMAT, LIBRARY_FORMAT, SOURCES_FORMAT, SOURCES_FILE } from './folder-format';
import { ApiContractsStore } from './store.svelte';
import { ApiLibraryStore } from './library.svelte';
import { ValueSourcesStore } from './sources/store.svelte';
import type { Prefs } from '../store/storage';

class NoPrefs implements Prefs {
  async getPref(): Promise<string | null> {
    return null;
  }
  async setPref(): Promise<void> {}
}

function folder() {
  return new MemoryDir('repo').dir('api');
}

async function stores(dir: MemoryDir) {
  const contracts = new ApiContractsStore(
    new FolderDocBackend(dir, CONTRACTS_FORMAT, 'contratos'),
    new NoPrefs(),
  );
  const library = new ApiLibraryStore(new FolderDocBackend(dir, LIBRARY_FORMAT, 'biblioteca'));
  const sources = new ValueSourcesStore(
    new FolderDocBackend(dir, SOURCES_FORMAT, 'fuentes de valores'),
  );
  await Promise.all([contracts.init(), library.init(), sources.init()]);
  return { contracts, library, sources };
}

describe('tres documentos en la misma carpeta (4.1)', () => {
  it('cada uno escribe los suyos y ninguno toca los de otro', async () => {
    const dir = folder();
    const { contracts, library, sources } = await stores(dir);
    expect(contracts.source).toBe('folder');

    const c = contracts.addContract('Pedidos')!;
    const model = contracts.addModel('Pedido')!;
    await contracts.flush();
    const afterContracts = [...dir.writes];
    expect(afterContracts.some((w) => w.startsWith('c-'))).toBe(true);

    dir.writes = [];
    library.save(contracts.contract(c.id)!, model.id);
    await library.flush();
    expect(dir.writes.every((w) => w.startsWith('lib-'))).toBe(true);

    dir.writes = [];
    sources.create('estados');
    await sources.flush();
    expect(dir.writes).toEqual([SOURCES_FILE]);

    const again = await stores(dir);
    expect(again.contracts.contracts.map((x) => x.title)).toEqual(['Pedidos']);
    expect(again.library.entries.map((e) => e.name)).toEqual(['Pedido']);
    expect(again.sources.sources.map((s) => s.name)).toEqual(['estados']);
  });

  it('un conflicto en la biblioteca no deja sin contratos', async () => {
    const dir = folder();
    const first = await stores(dir);
    first.contracts.addContract('Pedidos');
    const model = first.contracts.addModel('Pedido')!;
    await first.contracts.flush();
    const entry = first.library.save(first.contracts.open!, model.id)!;
    await first.library.flush();

    dir.put(`lib-${entry.id}.json`, '<<<<<<< HEAD\n');
    const again = await stores(dir);
    expect(again.library.unavailable?.why).toEqual({
      cause: 'fichero-ilegible',
      file: `lib-${entry.id}.json`,
    });
    expect(again.contracts.unavailable).toBeNull();
    expect(again.contracts.contracts).toHaveLength(1);
    expect(again.sources.unavailable).toBeNull();
  });
});

describe('un guardado fallido (4.2)', () => {
  it('en una carpeta se dice y no bloquea', async () => {
    const dir = folder();
    const { contracts } = await stores(dir);
    contracts.addContract('Pedidos');
    dir.failWrites = true;
    await contracts.flush();
    expect(contracts.saveError).toBe('disk full');
    expect(contracts.unavailable).toBeNull();
    expect(contracts.justSaved).toBe(false);

    dir.failWrites = false;
    contracts.addContract('Otro');
    await contracts.flush();
    expect(contracts.saveError).toBeNull();
    const again = await stores(dir);
    expect(again.contracts.contracts).toHaveLength(2);
  });

  it('en el navegador deja el documento no disponible, como siempre', async () => {
    const backend = {
      load: async () => ({ kind: 'empty' as const }),
      save: async (): Promise<void> => {
        throw new Error('se fue la base');
      },
    };
    const contracts = new ApiContractsStore(backend, new NoPrefs());
    await contracts.init();
    contracts.addContract('x');
    await contracts.flush();
    expect(contracts.unavailable?.reason).toBe('se fue la base');
    expect(contracts.saveError).toBeNull();
  });
});

describe('sin poder leer no se escribe (4.3)', () => {
  it('ninguno de los tres crea ni guarda', async () => {
    const why = { cause: 'permiso' as const };
    const contracts = new ApiContractsStore(new UnavailableDocBackend('x', why), new NoPrefs());
    const library = new ApiLibraryStore(new UnavailableDocBackend('x', why));
    const sources = new ValueSourcesStore(new UnavailableDocBackend('x', why));
    await Promise.all([contracts.init(), library.init(), sources.init()]);
    expect(contracts.addContract('x')).toBeNull();
    expect(sources.create('x')).toBeNull();
    expect(contracts.unavailable?.why).toEqual(why);
    expect(library.unavailable?.why).toEqual(why);
  });

  it('cambiar a un backend que no se puede leer vacía lo que había en pantalla', async () => {
    const dir = folder();
    const { contracts } = await stores(dir);
    contracts.addContract('Pedidos');
    contracts.useBackend(new UnavailableDocBackend('x', { cause: 'permiso' }));
    await contracts.init();
    expect(contracts.contracts).toEqual([]);
  });
});
