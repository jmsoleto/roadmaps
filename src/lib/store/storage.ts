/**
 * Storage seam.
 *
 * The whole app talks to this async interface, never to a concrete backend.
 * There are two: `BrowserBackend`, the browser's local storage, where the
 * roadmaps have always lived; and the folder backend (`../folder/`), for when
 * the user connects Roadmaps to a folder on the device (carpeta-roadmaps).
 *
 * The interface was kept async while `localStorage` was the only backend, so
 * that a backend which really is asynchronous could arrive without touching the
 * store. The folder is that backend.
 */

import type { AppData } from '../model/types';

/**
 * Why the data cannot be read, as a closed value rather than a sentence.
 *
 * Closed because the hub card has to decide from it whether to offer
 * «Conceder acceso» (carpeta-roadmaps, D5), and a decision taken by parsing a
 * message breaks the first time somebody rewords the message.
 */
export type Unavailability =
  | { cause: 'permiso' }
  | { cause: 'carpeta-ausente' }
  | { cause: 'fichero-ilegible'; file: string }
  | { cause: 'error'; detail: string };

/**
 * The three ways a load can end, as in `indexeddb.ts`, with the cause added.
 *
 * `empty` and `unavailable` are kept apart for the reason `local-persistence`
 * gives: showing a blank plan over data that could not be read invites writing
 * over it, and there is no server to recover it from.
 */
export type RoadmapsLoad =
  | { kind: 'loaded'; data: AppData }
  | { kind: 'empty' }
  | { kind: 'unavailable'; reason: string; why: Unavailability };

export type DataSource = 'browser' | 'folder';

export interface RoadmapsBackend {
  /** Where the data lives. Only the browser gets the example roadmap on an empty start. */
  readonly source: DataSource;
  load(): Promise<RoadmapsLoad>;
  save(data: AppData): Promise<void>;
  /** True while a write is running or queued. Always false in the browser, whose write is synchronous. */
  readonly pending: boolean;
  /** Resolve once nothing is pending. */
  settled(): Promise<void>;
}

/**
 * Preferences: how each person looks at the hub, never what is planned.
 *
 * A seam of its own and not two more methods on the backend, because the two
 * stop living together once Roadmaps can keep its data in a folder: the data
 * moves there, and the zoom, the column widths, the theme and the usage stay in
 * this browser (`local-persistence`, «Persistencia del estado de sesión»).
 */
export interface Prefs {
  getPref(key: string): Promise<string | null>;
  setPref(key: string, value: string): Promise<void>;
}

const LS_DATA = 'roadmaps:appdata:v1';
const LS_PREF = (k: string) => `roadmaps:pref:${k}`;

/**
 * The browser's local storage: Roadmaps' store while it is not connected to a
 * folder, under the key it has always had.
 *
 * Content that cannot be read comes back as `empty`, not `unavailable`. That is
 * the behaviour `local-persistence` has always promised here («Datos guardados
 * en un formato no reconocible»), and nothing in this change is about it.
 */
export class BrowserBackend implements RoadmapsBackend {
  readonly source = 'browser';
  readonly pending = false;

  async load(): Promise<RoadmapsLoad> {
    try {
      const raw = localStorage.getItem(LS_DATA);
      if (!raw) return { kind: 'empty' };
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as AppData).roadmaps)) {
        return { kind: 'loaded', data: parsed as AppData };
      }
      return { kind: 'empty' };
    } catch {
      return { kind: 'empty' };
    }
  }

  /**
   * One `setItem` with the whole serialized state, so a save is all or nothing:
   * a later read sees either the previous state or the new one, never a mix.
   *
   * Synchronous up to the `setItem`, which is what lets the close handler land
   * the write before the page unloads.
   */
  async save(data: AppData): Promise<void> {
    try {
      localStorage.setItem(LS_DATA, JSON.stringify(data));
    } catch (e) {
      console.error('storage save failed', e);
    }
  }

  async settled(): Promise<void> {}
}

/**
 * A folder that cannot be used yet: the permission is missing, or the handle
 * is gone. It loads as unavailable, with its cause, and never writes.
 *
 * Exists so that every way of not being able to read the roadmaps goes through
 * the same path in the store, and ends on the same screen.
 */
export class UnavailableBackend implements RoadmapsBackend {
  readonly source = 'folder';
  readonly pending = false;
  constructor(
    private reason: string,
    private why: Unavailability,
  ) {}
  async load(): Promise<RoadmapsLoad> {
    return { kind: 'unavailable', reason: this.reason, why: this.why };
  }
  async save(): Promise<void> {}
  async settled(): Promise<void> {}
}

/** Preferences in `localStorage`, under the keys they have always had. */
export class LocalStoragePrefs implements Prefs {
  async getPref(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(LS_PREF(key));
    } catch {
      return null;
    }
  }

  async setPref(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(LS_PREF(key), value);
    } catch (e) {
      // A full store costs a preference, never the data.
      console.error('pref save failed', e);
    }
  }
}

/** The browser backend. */
export function createStorage(): RoadmapsBackend {
  return new BrowserBackend();
}

/** The preference backend every store shares. */
export function createPrefs(): Prefs {
  return new LocalStoragePrefs();
}
