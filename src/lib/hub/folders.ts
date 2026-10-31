/**
 * What the folder dialog needs to know about each application that can keep
 * a folder (carpeta-api-hub, task 1.4).
 *
 * The dialog is one component for every application, like the card and the
 * unavailable screen; what changes between them is the connection and a few
 * words. Registered here so the dialog does not import any application.
 */

import type { FolderConnection } from '../folder/connection.svelte';
import type { Unavailability } from '../folder/file-sync';
import type { UnavailableAction } from '../components/StoreUnavailable.svelte';
import { roadmapsFolder } from '../store/roadmaps-folder.svelte';
import { store } from '../store/app.svelte';
import { API_ID, LINKS_ID, ROADMAPS_ID } from './apps';
import { linksFolder } from '../links/folder.svelte';
import { links } from '../links/store.svelte';
import { apiFolder } from '../api/folder.svelte';
import { apiContracts } from '../api/store.svelte';

export interface FolderUi {
  connection: FolderConnection;
  /** The dialog's title. */
  title: string;
  /** What a folder of this application has, as in «repo ya tiene roadmaps». */
  has: string;
  /**
   * What is in the browser right now, as the subject of a sentence: «el
   * roadmap», «los 3 roadmaps». `count` decides singular or plural around it.
   */
  inBrowser(): { count: number; phrase: string };
  /** What stays personal and does not go to the folder. */
  viewNote: string;
}

const FOLDERS: Record<string, FolderUi> = {
  [ROADMAPS_ID]: {
    connection: roadmapsFolder,
    title: 'Carpeta de Roadmaps',
    has: 'roadmaps',
    inBrowser: () => {
      const n = store.source === 'browser' ? store.data.roadmaps.length : 0;
      return { count: n, phrase: n === 1 ? 'el roadmap' : `los ${n} roadmaps` };
    },
    viewNote:
      'Tu vista (el roadmap abierto, las fases plegadas, el zoom) sigue siendo tuya y no va a la carpeta.',
  },
  [API_ID]: {
    connection: apiFolder,
    title: 'Carpeta de API Hub',
    has: 'contratos',
    inBrowser: () => {
      const n = apiContracts.source === 'browser' ? apiContracts.contracts.length : 0;
      const contracts = n === 1 ? 'el contrato' : `los ${n} contratos`;
      // Always plural around it: the library and the value sources go too.
      return { count: n + 2, phrase: `${contracts}, la biblioteca y las fuentes de valores` };
    },
    viewNote:
      'Tu vista (el contrato abierto, lo que ves de cada uno, los campos plegados) sigue siendo tuya y no va a la carpeta.',
  },
  [LINKS_ID]: {
    connection: linksFolder,
    title: 'Carpeta de Links Hub',
    has: 'enlaces',
    inBrowser: () => {
      const n = links.source === 'browser' ? links.areas.length : 0;
      return { count: n, phrase: n === 1 ? 'el área' : `las ${n} áreas` };
    },
    viewNote:
      'Ojo: con una carpeta conectada, Links puede tener que esperar a la carpeta o pedir permiso al abrirse, también en mitad de una guardia. Sin carpeta abre al instante.',
  },
};

export function folderUi(appId: string | null): FolderUi | null {
  return appId ? (FOLDERS[appId] ?? null) : null;
}

/**
 * What an application's unavailable screen offers, from why it is unavailable.
 *
 * The same for every application that keeps a folder: grant the permission
 * when that is what is missing, retry otherwise, and always the way out.
 */
export function unavailableActions(
  appId: string,
  why: Unavailability | undefined,
  source: 'browser' | 'folder',
): UnavailableAction[] {
  const ui = folderUi(appId);
  if (!ui || source !== 'folder') return [];
  const connection = ui.connection;
  return [
    why?.cause === 'permiso'
      ? // The click is the gesture the browser requires to show its prompt.
        { label: 'conceder acceso', primary: true, run: () => connection.grant() }
      : { label: 'reintentar', primary: true, run: () => connection.retry() },
    { label: 'desconectar', run: () => connection.disconnect() },
  ];
}
