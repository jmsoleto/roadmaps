/**
 * Links Hub's folder connection (carpeta-links).
 *
 * One participant: the links store. Its browser side stays synchronous, so a
 * Links Hub that is not connected opens with its links already on screen, as
 * it always did; only a connected one can make anyone wait.
 */

import { APPS, LINKS_ID } from '../hub/apps';
import {
  browserDeps,
  FolderConnection,
  type FolderDeps,
  type Participant,
} from '../folder/connection.svelte';
import { FolderDocBackend, UnavailableDocBackend } from '../folder/doc-backend';
import type { FolderDir } from '../folder/fs';
import { FORMAT, LINKS_FORMAT } from './folder-format';
import { LocalLinksBackend } from './storage';
import { links as defaultStore, type LinksStore } from './store.svelte';
import type { LinksData } from './model';

export function linksParticipant(store: LinksStore): Participant {
  const use = async (backend: Parameters<LinksStore['useBackend']>[0]) => {
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
    browser: () => use(new LocalLinksBackend()),
    folder: (dir: FolderDir) => use(new FolderDocBackend(dir, LINKS_FORMAT, 'enlaces')),
    unavailable: (reason, why) => use(new UnavailableDocBackend<LinksData>(reason, why)),
    async dump(dir: FolderDir) {
      const data = $state.snapshot(store.data) as LinksData;
      await new FolderDocBackend(dir, LINKS_FORMAT, 'enlaces').save(data);
      return LINKS_FORMAT.serialize(data);
    },
  };
}

export class LinksFolder extends FolderConnection {
  constructor(store: LinksStore = defaultStore, deps: FolderDeps = browserDeps) {
    super(
      {
        appId: LINKS_ID,
        format: FORMAT,
        appName: 'Links Hub',
        dataNoun: 'los enlaces',
        nameOf: (id) => APPS.find((a) => a.id === id)?.name ?? id,
      },
      [linksParticipant(store)],
      deps,
    );
  }
}

export const linksFolder = new LinksFolder();
