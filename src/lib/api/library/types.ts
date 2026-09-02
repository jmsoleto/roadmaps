/**
 * What the model library holds.
 *
 * An entry is a **bundle**, not a model: the model somebody asked to save plus
 * everything it needs to mean anything (design decision D1). Saving
 * `ItemProducto` alone, when it references `Paginacion`, would put an entry in
 * the library that arrives broken wherever it is brought.
 *
 * The library lives apart from the contracts document — its own object store
 * since the very first change — because the document is rewritten whole on
 * every save, and with the library inside it, typing a letter in a field would
 * rewrite every saved model.
 */

import type { ApiModel } from '../model/types';

export interface LibraryEntry {
  id: string;
  /**
   * The name of the model that was saved, and the library's key (D6).
   *
   * Two entries called `Paginacion` make no sense in a library whose whole
   * purpose is that everybody uses the same `Paginacion`. That is the opposite
   * of a contract title, which may repeat because it is a name to recognise
   * something by. Here the name **is** the agreement.
   */
  name: string;
  description: string;
  /** When it was last saved, as an ISO date. */
  updated: string;
  /** The saved model first, then everything it depends on. */
  models: ApiModel[];
}

export interface LibraryData {
  entries: LibraryEntry[];
}

export function emptyLibrary(): LibraryData {
  return { entries: [] };
}

/** The model the entry is named after: the one somebody chose to save. */
export function entryModel(entry: LibraryEntry): ApiModel | null {
  return entry.models[0] ?? null;
}

/** The ones that came along because the saved model needs them. */
export function entryDependencies(entry: LibraryEntry): ApiModel[] {
  return entry.models.slice(1);
}
