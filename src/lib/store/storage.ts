/**
 * Storage seam.
 *
 * The whole app talks to this async interface, never to a concrete backend.
 * `LocalStorageBackend` is that backend: the browser's local storage, scoped to
 * one origin and one profile, is where the roadmaps live.
 *
 * The interface stays async even though `localStorage` is synchronous. It is
 * what kept the app buildable in a browser while a desktop shell existed, and
 * it is what would keep the store untouched if the data ever outgrew
 * `localStorage` and moved to IndexedDB, which is asynchronous by nature.
 */

import type { AppData } from '../model/types';

export interface Storage {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  getPref(key: string): Promise<string | null>;
  setPref(key: string, value: string): Promise<void>;
}

const LS_DATA = 'roadmaps:appdata:v1';
const LS_PREF = (k: string) => `roadmaps:pref:${k}`;

/** Browser-local backend: the app's store. */
export class LocalStorageBackend implements Storage {
  async load(): Promise<AppData | null> {
    try {
      const raw = localStorage.getItem(LS_DATA);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as AppData).roadmaps)) {
        return parsed as AppData;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * One `setItem` with the whole serialized state, so a save is all or nothing:
   * a later read sees either the previous state or the new one, never a mix.
   */
  async save(data: AppData): Promise<void> {
    try {
      localStorage.setItem(LS_DATA, JSON.stringify(data));
    } catch (e) {
      console.error('storage save failed', e);
    }
  }

  async getPref(key: string): Promise<string | null> {
    return localStorage.getItem(LS_PREF(key));
  }

  async setPref(key: string, value: string): Promise<void> {
    localStorage.setItem(LS_PREF(key), value);
  }
}

/** The app's storage backend. */
export function createStorage(): Storage {
  return new LocalStorageBackend();
}
