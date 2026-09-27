/**
 * A field's value when a source was assigned to it.
 *
 * Everything here turns a **unit value** —a number in `[0,1)` that came from the
 * field's coordinate— into a value. Nothing in this file draws a random number
 * of its own, which is what keeps the mock stable while the contract is edited:
 * the randomness lives in the coordinate, and this only spends it.
 */

import { unitAt } from './prng';
import type { JsonValue } from '../example';
import type { NodeSource, Recipe, SourceDraw } from '../model/types';
import type { ValueSource } from '../sources/types';

/** `#` is a digit, `A` a letter, anything else itself. */
const DIGITS = '0123456789';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function epochDay(iso: string): number | null {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 86400000);
}

/** What one recipe produces at a coordinate. */
export function fromRecipe(recipe: Recipe, seed: number, coord: string): JsonValue {
  const u = (nth = 0) => unitAt(seed, coord, nth);
  switch (recipe.kind) {
    case 'integer': {
      const lo = Math.min(recipe.min, recipe.max);
      const hi = Math.max(recipe.min, recipe.max);
      return lo + Math.floor(u() * (hi - lo + 1));
    }
    case 'decimal': {
      const lo = Math.min(recipe.min, recipe.max);
      const hi = Math.max(recipe.min, recipe.max);
      const factor = 10 ** Math.max(0, Math.min(6, recipe.decimals));
      return Math.round((lo + u() * (hi - lo)) * factor) / factor;
    }
    case 'text': {
      let out = '';
      for (let i = 0; i < recipe.length; i++) out += LETTERS[Math.floor(u(i) * LETTERS.length)];
      return out;
    }
    case 'digits': {
      let out = '';
      for (let i = 0; i < recipe.length; i++) out += DIGITS[Math.floor(u(i) * 10)];
      return out;
    }
    case 'boolean':
      return u() < recipe.trueRatio;
    case 'date': {
      const a = epochDay(recipe.from) ?? epochDay('2026-01-01')!;
      const b = epochDay(recipe.to) ?? epochDay('2026-12-31')!;
      const lo = Math.min(a, b);
      const day = lo + Math.floor(u() * (Math.abs(b - a) + 1));
      return new Date(day * 86400000).toISOString().slice(0, 10);
    }
    default: {
      let out = '';
      let nth = 0;
      for (const ch of recipe.pattern) {
        if (ch === '#') out += DIGITS[Math.floor(u(nth++) * 10)];
        else if (ch === 'A') out += LETTERS[Math.floor(u(nth++) * LETTERS.length)].toUpperCase();
        else out += ch;
      }
      return out;
    }
  }
}

/**
 * What a source of `n` values gives to the `index`-th thing that asks.
 *
 * The three modes are of the **assignment**, not of the source (D13), so the
 * same list of forty names can repeat in one field and not in another without
 * anybody keeping two copies of it.
 */
export function drawIndex(
  draw: SourceDraw,
  count: number,
  index: number,
  seed: number,
  coord: string,
): number {
  if (count <= 0) return -1;
  if (draw === 'cycle') return index % count;
  // `unique` walks the list in order and stops rather than wrapping: running out
  // is a fact about the mock that has to be said, not papered over.
  if (draw === 'unique') return index < count ? index : -1;
  return Math.floor(unitAt(seed, coord, 0) * count);
}

/** Whether an assignment can run out, and at what point it does. */
export function exhaustedAt(draw: SourceDraw, count: number, needed: number): number | null {
  return draw === 'unique' && needed > count ? count : null;
}

/** What one assignment is worth, or `null` to let the deduction answer. */
export function fromSource(
  assignment: NodeSource,
  lookup: (id: string) => ValueSource | null,
  seed: number,
  coord: string,
  index: number,
): JsonValue | null {
  if (assignment.sourceId === '') {
    return assignment.recipe === null ? null : fromRecipe(assignment.recipe, seed, coord);
  }
  const source = lookup(assignment.sourceId);
  // An assignment naming a source that is not here is **kept** and ignored: the
  // file of sources may arrive later, and deleting the assignment would lose
  // somebody's work over the order two files were opened in.
  if (source === null) return null;
  if (source.kind === 'recipe') {
    return source.recipe === null ? null : fromRecipe(source.recipe, seed, coord);
  }
  const at = drawIndex(assignment.draw, source.values.length, index, seed, coord);
  return at < 0 ? null : source.values[at];
}
