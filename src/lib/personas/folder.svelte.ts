/**
 * Personas Hub's folder connection (personas-hub, D6).
 *
 * One participant: the store. Its browser side stays synchronous, as in Links
 * Hub, so a Personas Hub that is not connected opens with its data already on
 * screen; only a connected one says it is opening.
 */

import { APPS, PERSONAS_ID } from '../hub/apps';
import {
  browserDeps,
  FolderConnection,
  type FolderDeps,
  type Participant,
} from '../folder/connection.svelte';
import { FolderDocBackend, UnavailableDocBackend } from '../folder/doc-backend';
import type { FolderDir } from '../folder/fs';
import { FORMAT, PERSONAS_FORMAT } from './folder-format';
import { LocalPersonasBackend } from './storage';
import { personas as defaultStore, type PersonasStore } from './store.svelte';
import type { PersonasData } from './model';

const NOUN = 'Personas Hub';

export function personasParticipant(store: PersonasStore): Participant {
  const use = async (backend: Parameters<PersonasStore['useBackend']>[0]) => {
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
      await store.settled();
    },
    browser: () => use(new LocalPersonasBackend()),
    folder: (dir: FolderDir) => use(new FolderDocBackend(dir, PERSONAS_FORMAT, NOUN)),
    unavailable: (reason, why) => use(new UnavailableDocBackend<PersonasData>(reason, why)),
    async dump(dir: FolderDir) {
      const data = $state.snapshot(store.data) as PersonasData;
      await new FolderDocBackend(dir, PERSONAS_FORMAT, NOUN).save(data);
      return PERSONAS_FORMAT.serialize(data);
    },
  };
}

export class PersonasFolder extends FolderConnection {
  constructor(store: PersonasStore = defaultStore, deps: FolderDeps = browserDeps) {
    super(
      {
        appId: PERSONAS_ID,
        format: FORMAT,
        appName: 'Personas Hub',
        dataNoun: 'los equipos',
        nameOf: (id) => APPS.find((a) => a.id === id)?.name ?? id,
      },
      [personasParticipant(store)],
      deps,
    );
  }
}

export const personasFolder = new PersonasFolder();
