/**
 * Theme state: which theme is active, the user's own themes, and the editor's
 * live preview. Follows the shape of `store/ui.svelte.ts`.
 *
 * Persistence rides on the existing preference seam (`getPref`/`setPref`), so
 * neither the SQLite schema nor the storage interface had to change.
 */

import { createStorage, type Storage } from '../store/storage';
import { uid } from '../util/id';
import { applyTheme, previewTheme } from './apply';
import { inkOn } from './contrast';
import { DEFAULT_PRESET_ID, PRESETS, findPreset } from './presets';
import { resolveTheme } from './resolve';
import { PALETTE_SLOTS, type Theme, type ResolvedTheme } from './tokens';

const PREF_ACTIVE = 'theme.active';
const PREF_CUSTOM = 'theme.custom';

/** Deep copy, so editing a draft never mutates a preset or a stored theme. */
function clone(theme: Theme): Theme {
  return {
    ...theme,
    base: { ...theme.base },
    overrides: { ...theme.overrides },
    geometry: { ...theme.geometry },
    barPalette: [...theme.barPalette],
  };
}

class ThemeStore {
  private storage: Storage;

  /** Themes the user has created. Presets are in code and never live here. */
  custom = $state<Theme[]>([]);
  activeId = $state<string>(DEFAULT_PRESET_ID);
  /** Set while the editor has unsaved changes; takes over what is displayed. */
  draft = $state<Theme | null>(null);
  ready = $state<boolean>(false);

  constructor(storage: Storage = createStorage()) {
    this.storage = storage;
  }

  /** Every selectable theme: the four built-ins first, then the user's. */
  get all(): Theme[] {
    return [...PRESETS, ...this.custom];
  }

  /** The stored theme currently selected, falling back to a preset if it is gone. */
  get selected(): Theme {
    return this.all.find((t) => t.id === this.activeId) ?? PRESETS[0];
  }

  /** What the app should look like right now — the draft wins while editing. */
  get active(): Theme {
    return this.draft ?? this.selected;
  }

  get resolved(): ResolvedTheme {
    return resolveTheme(this.active);
  }

  /** The color of a palette slot under the active theme. */
  slotColor(slot: number): string {
    const palette = this.active.barPalette;
    return palette[((slot % PALETTE_SLOTS) + PALETTE_SLOTS) % PALETTE_SLOTS] ?? palette[0];
  }

  /**
   * The readable ink for text drawn on that slot's color (D3).
   *
   * No token can express this: the background is chosen by the data, so it has
   * to be computed per element.
   */
  inkFor(slot: number): string {
    return inkOn(this.slotColor(slot), this.active.base);
  }

  // ---- lifecycle ----

  /** Load the stored preference and apply it. Safe to call before the app mounts. */
  async init(): Promise<void> {
    const stored = await this.storage.getPref(PREF_CUSTOM);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) this.custom = parsed as Theme[];
      } catch {
        // A corrupt blob costs the user their custom themes, not the app.
      }
    }
    const active = await this.storage.getPref(PREF_ACTIVE);
    if (active && this.all.some((t) => t.id === active)) this.activeId = active;

    this.apply();
    this.ready = true;
  }

  /** Write the active theme to the document and refresh the boot mirror. */
  private apply(): void {
    applyTheme(this.resolved);
  }

  private persistCustom(): void {
    void this.storage.setPref(PREF_CUSTOM, JSON.stringify(this.custom));
  }

  // ---- selection ----

  select(id: string): void {
    if (!this.all.some((t) => t.id === id)) return;
    this.activeId = id;
    this.draft = null;
    this.apply();
    void this.storage.setPref(PREF_ACTIVE, id);
  }

  // ---- editing ----

  /**
   * Start editing. A built-in is never edited in place (D5): editing one starts
   * a copy, which the user then has to save under its own name.
   */
  beginEdit(): void {
    const source = this.selected;
    this.draft = source.builtin
      ? { ...clone(source), id: uid('th'), name: `${source.name} (copia)`, builtin: false }
      : clone(source);
  }

  /** Start a fresh theme from the current one's colors. */
  duplicate(): void {
    const source = this.active;
    this.draft = {
      ...clone(source),
      id: uid('th'),
      name: `${source.name} (copia)`,
      builtin: false,
    };
  }

  /** Apply a change to the draft and repaint the live preview. */
  edit(mutate: (draft: Theme) => void): void {
    if (!this.draft) return;
    const next = clone(this.draft);
    mutate(next);
    this.draft = next;
    previewTheme(this.resolved);
  }

  /** Commit the draft, adding or replacing it among the user's themes. */
  save(): void {
    const draft = this.draft;
    if (!draft) return;
    const i = this.custom.findIndex((t) => t.id === draft.id);
    if (i >= 0) this.custom[i] = draft;
    else this.custom.push(draft);
    this.activeId = draft.id;
    this.draft = null;
    this.apply();
    this.persistCustom();
    void this.storage.setPref(PREF_ACTIVE, this.activeId);
  }

  /** Throw the draft away and restore what was on screen before. */
  cancel(): void {
    this.draft = null;
    this.apply();
  }

  /** Add an imported theme and select it. */
  add(theme: Theme): void {
    const incoming = { ...clone(theme), id: uid('th'), builtin: false };
    this.custom.push(incoming);
    this.persistCustom();
    this.select(incoming.id);
  }

  rename(id: string, name: string): void {
    const t = this.custom.find((x) => x.id === id);
    if (!t) return;
    t.name = name;
    this.persistCustom();
  }

  /**
   * Delete one of the user's themes.
   *
   * Deleting the active theme falls back to a preset, so the app is never left
   * without something to render.
   */
  remove(id: string): void {
    const i = this.custom.findIndex((t) => t.id === id);
    if (i < 0) return;
    this.custom.splice(i, 1);
    this.persistCustom();
    if (this.activeId === id) {
      this.draft = null;
      this.select(findPreset(DEFAULT_PRESET_ID) ? DEFAULT_PRESET_ID : PRESETS[0].id);
    }
  }
}

export const theme = new ThemeStore();
