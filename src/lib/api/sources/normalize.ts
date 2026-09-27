/**
 * What comes out of the store gets normalised, same two rules as everywhere:
 * idempotent, and it does not force a write of its own.
 */

import { normalizeRecipe } from '../model/normalize';
import { emptyValueSources, type ValueSource, type ValueSourcesData } from './types';

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** One source, or `null` when what is there cannot be read. */
export function normalizeValueSource(raw: unknown): ValueSource | null {
  if (raw === null || typeof raw !== 'object') return null;
  const s = raw as Partial<ValueSource>;
  // No id is not repairable: issuing one would make a duplicate on the next
  // load, since nothing links it to what it was. Same rule as a contract.
  if (typeof s.id !== 'string' || s.id === '') return null;
  const recipe = normalizeRecipe(s.recipe);
  // A source that says it is a recipe but has none readable is a list of
  // nothing, which is at least a thing somebody can fix on screen.
  const kind = s.kind === 'recipe' && recipe !== null ? 'recipe' : 'list';
  return {
    id: s.id,
    name: str(s.name, 'fuente sin nombre'),
    description: str(s.description),
    updated: str(s.updated),
    kind,
    values: Array.isArray(s.values)
      ? s.values.filter((v): v is string => typeof v === 'string')
      : [],
    recipe: kind === 'recipe' ? recipe : null,
  };
}

export function normalizeValueSources(raw: unknown): ValueSourcesData {
  if (raw === null || typeof raw !== 'object') return emptyValueSources();
  const d = raw as Partial<ValueSourcesData>;
  if (!Array.isArray(d.sources)) return emptyValueSources();
  return {
    sources: d.sources.map(normalizeValueSource).filter((s): s is ValueSource => s !== null),
  };
}
