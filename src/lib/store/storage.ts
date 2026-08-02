/**
 * Storage seam.
 *
 * The whole app talks to this async interface, never to a concrete backend.
 * `TauriBackend` persists to SQLite through Rust commands when running inside
 * the desktop shell; `LocalStorageBackend` is the browser-dev fallback so
 * `npm run dev` keeps working without Tauri.
 */

import type { AppData } from '../model/types';

export interface Storage {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  getPref(key: string): Promise<string | null>;
  setPref(key: string, value: string): Promise<void>;
}

/** True when running inside the Tauri desktop shell. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const LS_DATA = 'roadmaps:appdata:v1';
const LS_PREF = (k: string) => `roadmaps:pref:${k}`;

/** Browser-local backend used during web development (no Tauri). */
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

/**
 * Palette slots travel to SQLite as text.
 *
 * The `color` column predates theming and is `TEXT`, so storing the slot there
 * needs no schema migration (theming, design decision D4). The Rust side keeps
 * the field a `String` so a pre-theming hex value survives the trip back and
 * the frontend can map it to the nearest slot — which is where the palette and
 * the color math live. This function is the other half of that arrangement.
 */
function slotsAsText(data: AppData): unknown {
  return {
    ...data,
    assignees: data.assignees.map((a) => ({ ...a, colorSlot: String(a.colorSlot) })),
    roadmaps: data.roadmaps.map((rm) => ({
      ...rm,
      rows: rm.rows.map((p) => ({
        ...p,
        colorSlot: String(p.colorSlot),
        children: p.children.map((c) => ({ ...c, colorSlot: String(c.colorSlot) })),
      })),
    })),
  };
}

/** SQLite-backed desktop backend, via Tauri commands (see src-tauri/src/db.rs). */
export class TauriBackend implements Storage {
  private async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }

  /**
   * Slots come back as text (and, on a database written before theming, as hex
   * colors). Both are normalized by `normalizeColors` at the store's load
   * boundary, so nothing is converted here.
   */
  load(): Promise<AppData | null> {
    return this.invoke<AppData | null>('load_app_data');
  }

  save(data: AppData): Promise<void> {
    return this.invoke<void>('save_app_data', { data: slotsAsText(data) });
  }

  getPref(key: string): Promise<string | null> {
    return this.invoke<string | null>('get_pref', { key });
  }

  setPref(key: string, value: string): Promise<void> {
    return this.invoke<void>('set_pref', { key, value });
  }
}

/** Pick the right backend for the current runtime. */
export function createStorage(): Storage {
  return isTauri() ? new TauriBackend() : new LocalStorageBackend();
}
