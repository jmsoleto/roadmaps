/**
 * Health Hub's folder connection (health-hub, D7).
 *
 * A participant with no browser side. `FolderConnection` only ever asks a
 * participant to read from somewhere, so «the browser» can simply mean «no
 * folder»: the rejections, the permission and the remembered connection come as
 * they are, with their tests, and `lib/folder/` does not change.
 *
 * Connecting to an empty folder has nothing to copy, so the dump writes what a
 * new folder starts with, and the existing flow verifies it.
 */

import { APPS, HEALTH_ID } from '../hub/apps';
import {
  browserDeps,
  FolderConnection,
  type FolderDeps,
  type Participant,
} from '../folder/connection.svelte';
import { FolderDocBackend, UnavailableDocBackend } from '../folder/doc-backend';
import type { FolderDir } from '../folder/fs';
import { FORMAT, HEALTH_FORMAT } from './folder-format';
import { datosIniciales, type HealthData } from './model';
import { health as defaultStore, type HealthStore } from './store.svelte';

const NOUN = 'Health Hub';

export function healthParticipant(store: HealthStore): Participant {
  return {
    get inBrowser() {
      return store.sinCarpeta && store.unavailable === null;
    },
    get inFolder() {
      return !store.sinCarpeta;
    },
    async flush() {
      await store.flush();
      await store.settled();
    },
    async browser() {
      store.useBackend(null);
      await store.init();
    },
    async folder(dir: FolderDir) {
      store.useBackend(new FolderDocBackend(dir, HEALTH_FORMAT, NOUN));
      await store.init();
    },
    async unavailable(reason, why) {
      store.useBackend(new UnavailableDocBackend<HealthData>(reason, why));
      await store.init();
    },
    async dump(dir: FolderDir) {
      const inicial = datosIniciales();
      await new FolderDocBackend(dir, HEALTH_FORMAT, NOUN).save(inicial);
      return HEALTH_FORMAT.serialize(inicial);
    },
  };
}

export class HealthFolder extends FolderConnection {
  constructor(store: HealthStore = defaultStore, deps: FolderDeps = browserDeps) {
    super(
      {
        appId: HEALTH_ID,
        format: FORMAT,
        appName: 'Health Hub',
        dataNoun: 'los datos de salud',
        nameOf: (id) => APPS.find((a) => a.id === id)?.name ?? id,
      },
      [healthParticipant(store)],
      deps,
    );
  }
}

export const healthFolder = new HealthFolder();
