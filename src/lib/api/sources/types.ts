/**
 * Where a mock's values come from when the type and the format are not enough.
 *
 * A source is **the vocabulary of somebody's domain**: the real states of a real
 * order, the names of the branches, the product codes that mean something to
 * whoever is looking at the screen. That is the half no engine can deduce, and
 * the reason this exists at all.
 *
 * Two classes, and both earned their place (D12):
 *
 *  - a **list**, written or pasted, which is the one that carries the domain;
 *  - a **recipe**, for the shapes the engine can vary but nobody wants to type
 *    forty times — an integer in a range, ten digits, a pattern like `PED-######`.
 *
 * What `scalarValue` already knows —`uuid`, `date-time`, `email`, `uri`, `byte`,
 * an enumeration— is deliberately **not** re-declared here. Without that line,
 * recipes is a surface with no bottom.
 *
 * Sources live in their own object store, apart from the contracts and apart
 * from the model library, for the reason `local-persistence` gives about the
 * document being rewritten whole on every save — and because they are edited
 * somewhere else, for another reason, by somebody thinking about something else.
 */

import type { Recipe } from '../model/types';

export type SourceKind = 'list' | 'recipe';

export interface ValueSource {
  id: string;
  /**
   * The name, and the library's key.
   *
   * Two sources called `estados-pedido` make no sense in something whose whole
   * purpose is that everybody draws from the same one — the same argument the
   * model library makes about `Paginacion`.
   */
  name: string;
  description: string;
  /** When it was last saved, as an ISO date. */
  updated: string;
  kind: SourceKind;
  /** The written values, when `kind` is `list`. */
  values: string[];
  /** The recipe, when `kind` is `recipe`. */
  recipe: Recipe | null;
}

export interface ValueSourcesData {
  sources: ValueSource[];
}

export function emptyValueSources(): ValueSourcesData {
  return { sources: [] };
}

/** What a new source looks like: a list, because that is the one worth naming. */
export function newValueSource(name: string, id: string, today: string): ValueSource {
  return { id, name, description: '', updated: today, kind: 'list', values: [], recipe: null };
}

/**
 * A pasted block of values, cleaned the way an enumeration already is.
 *
 * Commas and newlines both, because one person pastes a column out of a
 * spreadsheet and the next types `alta, baja, pendiente` on one line, and making
 * them learn which is which would be a rule with nothing behind it.
 */
export function parseValues(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter((v) => v !== '');
}

/** How a source reads in one line, for a list that has to fit in a panel. */
export function sourceSummary(source: ValueSource): string {
  if (source.kind === 'list') {
    const n = source.values.length;
    return n === 0 ? 'lista vacía' : `${n} ${n === 1 ? 'valor' : 'valores'}`;
  }
  return source.recipe === null ? 'receta sin definir' : recipeSummary(source.recipe);
}

/** How a recipe reads, in the words somebody would use out loud. */
export function recipeSummary(recipe: Recipe): string {
  switch (recipe.kind) {
    case 'integer':
      return `entero entre ${recipe.min} y ${recipe.max}`;
    case 'decimal':
      return `decimal entre ${recipe.min} y ${recipe.max}, ${recipe.decimals} dec.`;
    case 'text':
      return `texto de ${recipe.length}`;
    case 'digits':
      return `${recipe.length} dígitos`;
    case 'boolean':
      return `booleano, ${Math.round(recipe.trueRatio * 100)}% cierto`;
    case 'date':
      return `fecha entre ${recipe.from} y ${recipe.to}`;
    default:
      return `patrón ${recipe.pattern}`;
  }
}

/** The recipe a kind starts as, so choosing one never lands on an empty form. */
export function defaultRecipe(kind: Recipe['kind']): Recipe {
  switch (kind) {
    case 'integer':
      return { kind: 'integer', min: 1, max: 10 };
    case 'decimal':
      return { kind: 'decimal', min: 0, max: 999.99, decimals: 2 };
    case 'text':
      return { kind: 'text', length: 10 };
    case 'digits':
      return { kind: 'digits', length: 10 };
    case 'boolean':
      return { kind: 'boolean', trueRatio: 0.5 };
    case 'date':
      return { kind: 'date', from: '2026-01-01', to: '2026-12-31' };
    default:
      return { kind: 'pattern', pattern: 'PED-######' };
  }
}
