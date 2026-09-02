/**
 * Reactive store for the model library (design decision D5).
 *
 * Apart from the contracts store, not beside it. The contracts document is
 * rewritten whole on every save, so a library living inside it would be
 * re-serialised on every keystroke in a field — which is exactly why it got its
 * own object store back in the first change, before there was anything to put
 * in it.
 *
 * Same shape as the other stores: the document in `$state`, mutations through
 * methods that schedule a debounced save, three load outcomes, and every
 * mutation refused while the store is unavailable.
 */

import { uid } from '../util/id';
import { createLibraryBackend, type LibraryBackend } from './storage';
import { bundleOf } from './library/bundle';
import { bringBundle, type Resolution } from './library/bring';
import { emptyLibrary, type LibraryData, type LibraryEntry } from './library/types';
import type { Contract } from './model/types';

const SAVE_DEBOUNCE_MS = 250;

export type Unavailable = { reason: string } | null;

export class ApiLibraryStore {
  private backend: LibraryBackend;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  data = $state<LibraryData>(emptyLibrary());
  unavailable = $state<Unavailable>(null);
  ready = $state<boolean>(false);

  constructor(backend: LibraryBackend = createLibraryBackend()) {
    this.backend = backend;
  }

  async init(): Promise<void> {
    const out = await this.backend.load();
    if (out.kind === 'unavailable') {
      this.unavailable = { reason: out.reason };
    } else {
      this.data =
        out.kind === 'loaded' && Array.isArray(out.data?.entries) ? out.data : emptyLibrary();
      this.unavailable = null;
    }
    this.ready = true;
  }

  get entries(): LibraryEntry[] {
    return this.data.entries;
  }

  /** The entry stored under this name, if any. The name is the key (D6). */
  entryNamed(name: string): LibraryEntry | null {
    return this.data.entries.find((e) => e.name === name) ?? null;
  }

  /**
   * Save a model, with everything it depends on.
   *
   * Replaces the entry of the same name rather than adding a second one: two
   * entries called `Paginacion` make no sense in a library whose purpose is
   * that everybody uses the same `Paginacion` (D6). The screen warns before
   * this runs; here it just does what was confirmed.
   */
  save(contract: Contract, modelId: string): LibraryEntry | null {
    if (this.unavailable) return null;
    const entry = bundleOf($state.snapshot(contract) as Contract, modelId);
    if (!entry) return null;

    const i = this.data.entries.findIndex((e) => e.name === entry.name);
    if (i === -1) this.data.entries.push(entry);
    else this.data.entries[i] = entry;

    this.scheduleSave();
    return entry;
  }

  remove(entryId: string): void {
    if (this.unavailable) return;
    const i = this.data.entries.findIndex((e) => e.id === entryId);
    if (i === -1) return;
    this.data.entries.splice(i, 1);
    this.scheduleSave();
  }

  /** Append imported entries, replacing by name what already had that name. */
  append(entries: readonly LibraryEntry[]): void {
    if (this.unavailable) return;
    for (const entry of entries) {
      const i = this.data.entries.findIndex((e) => e.name === entry.name);
      if (i === -1) this.data.entries.push(entry);
      else this.data.entries[i] = entry;
    }
    this.scheduleSave();
  }

  /**
   * Work out what a contract would receive.
   *
   * The merge itself is pure and lives in `bring.ts`; this only unwraps the
   * reactive entry so the pure side never meets a proxy. Committing the result
   * is the contracts store's job — the library is not the one that edits a
   * contract.
   */
  bring(
    contract: Contract,
    entryId: string,
    decisions: ReadonlyMap<string, Resolution>,
  ): ReturnType<typeof bringBundle> {
    const entry = this.data.entries.find((e) => e.id === entryId);
    if (!entry) return null;
    return bringBundle(
      $state.snapshot(contract) as Contract,
      $state.snapshot(entry) as LibraryEntry,
      decisions,
    );
  }

  /** The entry to look at, unwrapped, for the pure helpers the screen calls. */
  entry(entryId: string): LibraryEntry | null {
    const found = this.data.entries.find((e) => e.id === entryId);
    return found ? ($state.snapshot(found) as LibraryEntry) : null;
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
      await this.backend.save($state.snapshot(this.data) as LibraryData);
    } catch (e) {
      this.unavailable = { reason: e instanceof Error ? e.message : String(e) };
    }
  }
}

/** A fresh identifier for an imported entry, so identity is ours. */
export function reissueEntryId(entry: LibraryEntry): LibraryEntry {
  return { ...entry, id: uid('lib') };
}

export const apiLibrary = new ApiLibraryStore();
