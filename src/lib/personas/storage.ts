/**
 * Where Personas Hub keeps its data in the browser (personas-hub, D1).
 *
 * `localStorage`, synchronous, under its own key next to the others' and never
 * inside them, like Links Hub. One `setItem` with the whole state, so a save is
 * all or nothing. A team of fifteen with a year of absences and sprints is tens
 * of kilobytes: the size does not justify IndexedDB's waiting.
 */

import { emptyData, type PersonasData } from './model';
import { normalize } from './normalize';

export const LS_KEY = 'personas:appdata:v1';

export interface PersonasBackend {
  load(): PersonasData;
  save(data: PersonasData): void;
}

export class LocalPersonasBackend implements PersonasBackend {
  load(): PersonasData {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return emptyData();
      return normalize(JSON.parse(raw));
    } catch {
      // Unreadable content costs the user their data, never the boot.
      return emptyData();
    }
  }

  save(data: PersonasData): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('personas save failed', e);
    }
  }
}
