/**
 * API Hub's folder connection (carpeta-api-hub, D3).
 *
 * One connection, three participants: the contracts, the library and the value
 * sources go to the same `api/` subfolder, are dumped and verified together,
 * and are disconnected together. Each still reads on its own, so a library that
 * cannot be read does not take the contracts with it.
 */

import { APPS, API_ID } from '../hub/apps';
import {
  browserDeps,
  FolderConnection,
  type FolderDeps,
  type Participant,
} from '../folder/connection.svelte';
import type { FileFormat } from '../folder/file-sync';
import type { FolderDir } from '../folder/fs';
import {
  createApiBackend,
  createLibraryBackend,
  createValueSourcesBackend,
  FolderDocBackend,
  UnavailableDocBackend,
  type DocBackend,
} from './storage';
import { CONTRACTS_FORMAT, FORMAT, LIBRARY_FORMAT, SOURCES_FORMAT } from './folder-format';
import { apiContracts, type ApiContractsStore } from './store.svelte';
import { apiLibrary, type ApiLibraryStore } from './library.svelte';
import { valueSources, type ValueSourcesStore } from './sources/store.svelte';

/** What the three stores have in common, as far as the connection is concerned. */
interface DocStore<T> {
  data: T;
  readonly source: 'browser' | 'folder';
  unavailable: unknown;
  useBackend(backend: DocBackend<T>): void;
  init(): Promise<void>;
  flush(): Promise<void>;
  settled(): Promise<void>;
}

function participant<T>(
  store: DocStore<T>,
  format: FileFormat<T>,
  noun: string,
  browserBackend: () => DocBackend<T>,
): Participant {
  const use = async (backend: DocBackend<T>) => {
    store.useBackend(backend);
    await store.init();
  };
  return {
    get inBrowser() {
      return store.source === 'browser' && !store.unavailable;
    },
    get inFolder() {
      return store.source === 'folder';
    },
    async flush() {
      await store.flush();
      await store.settled();
    },
    browser: () => use(browserBackend()),
    folder: (dir: FolderDir) => use(new FolderDocBackend(dir, format, noun)),
    unavailable: (reason, why) => use(new UnavailableDocBackend<T>(reason, why)),
    async dump(dir: FolderDir) {
      const data = $state.snapshot(store.data) as T;
      await new FolderDocBackend(dir, format, noun).save(data);
      return format.serialize(data);
    },
  };
}

export class ApiFolder extends FolderConnection {
  constructor(
    contracts: ApiContractsStore = apiContracts,
    library: ApiLibraryStore = apiLibrary,
    sources: ValueSourcesStore = valueSources,
    deps: FolderDeps = browserDeps,
  ) {
    super(
      {
        appId: API_ID,
        format: FORMAT,
        appName: 'API Hub',
        dataNoun: 'los contratos',
        nameOf: (id) => APPS.find((a) => a.id === id)?.name ?? id,
      },
      [
        participant(contracts, CONTRACTS_FORMAT, 'contratos', createApiBackend),
        participant(library, LIBRARY_FORMAT, 'la biblioteca', createLibraryBackend),
        participant(sources, SOURCES_FORMAT, 'fuentes de valores', createValueSourcesBackend),
      ],
      deps,
    );
  }
}

export const apiFolder = new ApiFolder();
