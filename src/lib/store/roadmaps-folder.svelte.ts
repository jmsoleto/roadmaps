/**
 * Roadmaps' folder connection (carpeta-roadmaps, D7).
 *
 * The flows are `FolderConnection`'s, shared with every application that can
 * keep a folder (carpeta-api-hub, D3). What is Roadmaps' here is its one
 * participant: the store, and how to point it at the browser, at a folder, or
 * at the reason it cannot be read.
 */

import { APPS, ROADMAPS_ID } from '../hub/apps';
import {
  browserDeps,
  FolderConnection,
  type FolderDeps,
  type Participant,
} from '../folder/connection.svelte';
import type { FolderDir } from '../folder/fs';
import { FolderBackend } from './folder-backend';
import { FORMAT, serialize } from './folder-format';
import {
  BrowserBackend,
  UnavailableBackend,
  type RoadmapsBackend,
  type Unavailability,
} from './storage';
import { store as defaultStore, type AppStore } from './app.svelte';

export type { ConnectOutcome, ConnectPlan, FolderDeps } from '../folder/connection.svelte';

/** The roadmaps store, as a participant of the connection. */
export function roadmapsParticipant(store: AppStore): Participant {
  const use = async (backend: RoadmapsBackend) => {
    store.useBackend(backend);
    await store.init();
  };
  return {
    get inBrowser() {
      return store.source === 'browser' && store.unavailable === null;
    },
    get inFolder() {
      return store.source === 'folder';
    },
    async flush() {
      await store.flush();
      await store.backend.settled();
    },
    browser: () => use(new BrowserBackend()),
    folder: (dir: FolderDir) => use(new FolderBackend(dir)),
    unavailable: (reason: string, why: Unavailability) => use(new UnavailableBackend(reason, why)),
    async dump(dir: FolderDir) {
      const data = $state.snapshot(store.data);
      await new FolderBackend(dir).save(data);
      return serialize(data);
    },
  };
}

export class RoadmapsFolder extends FolderConnection {
  constructor(store: AppStore = defaultStore, deps: FolderDeps = browserDeps) {
    super(
      {
        appId: ROADMAPS_ID,
        format: FORMAT,
        appName: 'Roadmaps',
        dataNoun: 'los roadmaps',
        nameOf: (id) => APPS.find((a) => a.id === id)?.name ?? id,
      },
      [roadmapsParticipant(store)],
      deps,
    );
  }
}

export const roadmapsFolder = new RoadmapsFolder();
