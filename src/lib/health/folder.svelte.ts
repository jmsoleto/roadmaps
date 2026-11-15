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
import { readText, type FolderDir } from '../folder/fs';
import { INDEX_FILE } from './fuente/read';
import { FORMAT, HEALTH_FORMAT } from './folder-format';
import { datosIniciales, type HealthData } from './model';
import { health as defaultStore, type HealthStore } from './store.svelte';

const NOUN = 'Health Hub';

/**
 * The collector's data folder is the source, read only: connecting it as Health
 * Hub's own folder would create `health/` inside the collector's worktree.
 */
export async function esCarpetaDelColector(dir: FolderDir): Promise<boolean> {
  const texto = await readText(dir, INDEX_FILE);
  if (texto === null) return false;
  try {
    const v = JSON.parse(texto) as unknown;
    return typeof v === 'object' && v !== null && 'formatVersion' in v && 'apps' in v;
  } catch {
    return false;
  }
}

export const RECHAZO_COLECTOR = (nombre: string) =>
  `«${nombre}» es la carpeta de datos del colector: Health Hub la lee como fuente, con «⧉ fuente», y no escribe en ella. Para su propia carpeta elige la raíz de un repo privado: ahí creará «health/» con las aplicaciones, versiones y notas.`;

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
        refuse: async (dir) =>
          (await esCarpetaDelColector(dir)) ? RECHAZO_COLECTOR(dir.name) : null,
      },
      [healthParticipant(store)],
      deps,
    );
  }
}

export const healthFolder = new HealthFolder();
