/**
 * Where Links Hub keeps its areas and links.
 *
 * `localStorage`, and synchronous, which is the deliberate exception against
 * Decisions and API Hub (D7). Those two live in IndexedDB and carry three
 * loading outcomes — loaded, empty, unavailable — because a contract with its
 * model tree can grow. This one cannot: a few dozen links are a few kilobytes,
 * and the day it is used there must be no state at all between the user and the
 * dashboard they need. "Abriendo los enlaces…" in the middle of an outage is
 * exactly the failure this application exists to remove.
 *
 * Its own key, next to Roadmaps' and never inside it, so neither application
 * can corrupt or evict the other's data.
 */

import { normalize, type LinksData } from './model';

const LS_KEY = 'links:appdata:v1';

export interface LinksBackend {
  load(): LinksData;
  save(data: LinksData): void;
}

export class LocalLinksBackend implements LinksBackend {
  load(): LinksData {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return normalize(null);
      return normalize(JSON.parse(raw));
    } catch {
      // Unreadable content costs the user their links, never the boot.
      return normalize(null);
    }
  }

  /** One `setItem` with the whole state, so a save is all or nothing. */
  save(data: LinksData): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('links save failed', e);
    }
  }
}

export function createLinksBackend(): LinksBackend {
  return new LocalLinksBackend();
}
