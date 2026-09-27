/**
 * The value sources, common to every contract of the application.
 *
 * Same shape as the model library's store, and for most of the same reasons: its
 * own backend, a debounced save, and every mutation refused while the store is
 * unavailable rather than written into a void.
 *
 * Where it differs is the one deliberate exception of this feature (D10): a
 * source is **live**, not a copy. The library hands out copies because a
 * divergent copy would sit **saved** in two places with no server to reconcile
 * it; a source has nothing saved that can diverge, because the mock is derived
 * every time. Editing a list changes what the mocks show, immediately, and it
 * cannot leave any contract describing something that is not there.
 */

import { createValueSourcesBackend, type ValueSourcesBackend } from '../storage';
import {
  emptyValueSources,
  newValueSource,
  type ValueSource,
  type ValueSourcesData,
} from './types';
import { normalizeValueSources } from './normalize';
import { uid } from '../../util/id';

const SAVE_DEBOUNCE_MS = 250;

export type Unavailable = { reason: string } | null;

/** Today, as the ISO date an entry records. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export class ValueSourcesStore {
  private backend: ValueSourcesBackend;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  data = $state<ValueSourcesData>(emptyValueSources());
  unavailable = $state<Unavailable>(null);
  ready = $state<boolean>(false);

  constructor(backend: ValueSourcesBackend = createValueSourcesBackend()) {
    this.backend = backend;
  }

  async init(): Promise<void> {
    const out = await this.backend.load();
    if (out.kind === 'unavailable') {
      this.unavailable = { reason: out.reason };
    } else {
      this.data = out.kind === 'loaded' ? normalizeValueSources(out.data) : emptyValueSources();
      this.unavailable = null;
    }
    this.ready = true;
  }

  get sources(): ValueSource[] {
    return this.data.sources;
  }

  /** One source by id, or `null` — which is what an orphan assignment gets. */
  find(id: string): ValueSource | null {
    return this.data.sources.find((s) => s.id === id) ?? null;
  }

  /** The source under this name. The name is the key, as in the library. */
  named(name: string): ValueSource | null {
    return this.data.sources.find((s) => s.name === name) ?? null;
  }

  /** A name nothing else uses, so creating one never silently replaces another. */
  private freeName(wanted: string): string {
    const base = wanted.trim() === '' ? 'fuente' : wanted.trim();
    if (this.named(base) === null) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base} ${n}`;
      if (this.named(candidate) === null) return candidate;
    }
  }

  create(name = 'fuente'): ValueSource | null {
    if (this.unavailable) return null;
    const source = newValueSource(this.freeName(name), uid('vsr'), today());
    this.data.sources.push(source);
    this.scheduleSave();
    return source;
  }

  /** Change a source. The name is not deduplicated here: renaming is deliberate. */
  update(id: string, patch: Partial<Omit<ValueSource, 'id'>>): void {
    if (this.unavailable) return;
    const source = this.find(id);
    if (source === null) return;
    Object.assign(source, patch, { updated: today() });
    this.scheduleSave();
  }

  /**
   * Remove a source.
   *
   * Nothing goes looking for the assignments that named it. A field keeps its
   * assignment and falls back to what it would have generated anyway, and the
   * validator names it as a minor notice — because the file of sources can come
   * back, and erasing the assignments would lose work over the order two files
   * happened to be opened in.
   */
  remove(id: string): void {
    if (this.unavailable) return;
    const at = this.data.sources.findIndex((s) => s.id === id);
    if (at === -1) return;
    this.data.sources.splice(at, 1);
    this.scheduleSave();
  }

  /**
   * Append imported sources, replacing by name what already had that name.
   *
   * A new source **keeps the id it arrived with**, whenever nothing here is
   * using it. That is what repairs an orphaned assignment: a contract imported
   * from another machine points at that machine's ids, and the sources document
   * from the same machine brings them back under the same ids, so the fields
   * start drawing again without anybody reassigning anything.
   *
   * The two cases where it cannot: a name that is already here — the existing
   * source keeps its own id, because the assignments pointing at *it* matter
   * more than the incoming ones — and an id already taken by something else,
   * which gets a fresh one so nothing is ever overwritten.
   */
  merge(incoming: readonly ValueSource[]): void {
    if (this.unavailable) return;
    for (const source of incoming) {
      const existing = this.named(source.name);
      if (existing !== null) {
        Object.assign(existing, source, { id: existing.id });
        continue;
      }
      const taken = this.find(source.id) !== null;
      this.data.sources.push({ ...source, id: taken ? uid('vsr') : source.id });
    }
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.unavailable) return;
    try {
      await this.backend.save($state.snapshot(this.data) as ValueSourcesData);
    } catch (e) {
      this.unavailable = { reason: e instanceof Error ? e.message : String(e) };
    }
  }
}

export const valueSources = new ValueSourcesStore();
