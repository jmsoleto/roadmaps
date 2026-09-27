import { describe, it, expect } from 'vitest';
import { drawIndex, exhaustedAt, fromRecipe, fromSource } from './values';
import type { Recipe } from '../model/types';
import type { ValueSource } from '../sources/types';

const coord = 'clientes/3/estado';

const list = (values: string[]): ValueSource => ({
  id: 's1',
  name: 'estados',
  description: '',
  updated: '2026-09-25',
  kind: 'list',
  values,
  recipe: null,
});

describe('each recipe respects what it declares', () => {
  const at = (recipe: Recipe, i: number) => fromRecipe(recipe, 7, `c/${i}/k`);

  it('keeps an integer inside its range, both ends included', () => {
    const seen = new Set<unknown>();
    for (let i = 0; i < 300; i++) {
      const v = at({ kind: 'integer', min: 1, max: 10 }, i) as number;
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
      seen.add(v);
    }
    expect(seen.size).toBe(10);
  });

  it('reads a backwards range forwards instead of giving nothing', () => {
    for (let i = 0; i < 50; i++) {
      const v = at({ kind: 'integer', min: 10, max: 1 }, i) as number;
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('gives a decimal its range and no more decimals than asked', () => {
    for (let i = 0; i < 100; i++) {
      const v = at({ kind: 'decimal', min: 0, max: 999.99, decimals: 2 }, i) as number;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(999.99);
      expect(Math.round(v * 100)).toBeCloseTo(v * 100, 6);
    }
  });

  it('gives a text and a run of digits their length', () => {
    expect(at({ kind: 'text', length: 10 }, 1)).toMatch(/^[a-z]{10}$/);
    expect(at({ kind: 'digits', length: 10 }, 1)).toMatch(/^\d{10}$/);
  });

  it('respects a boolean ratio', () => {
    let trues = 0;
    for (let i = 0; i < 400; i++) if (at({ kind: 'boolean', trueRatio: 0.25 }, i)) trues++;
    expect(trues / 400).toBeGreaterThan(0.15);
    expect(trues / 400).toBeLessThan(0.35);
  });

  it('never says true when the ratio is zero', () => {
    for (let i = 0; i < 100; i++) expect(at({ kind: 'boolean', trueRatio: 0 }, i)).toBe(false);
  });

  it('keeps a date inside its window', () => {
    for (let i = 0; i < 100; i++) {
      const v = at({ kind: 'date', from: '2026-03-01', to: '2026-03-31' }, i) as string;
      expect(v >= '2026-03-01' && v <= '2026-03-31').toBe(true);
    }
  });

  it('fills a pattern and leaves its literals alone', () => {
    expect(at({ kind: 'pattern', pattern: 'PED-######' }, 1)).toMatch(/^PED-\d{6}$/);
    expect(at({ kind: 'pattern', pattern: 'AA-##' }, 1)).toMatch(/^[A-Z]{2}-\d{2}$/);
  });

  it('gives the same value for the same coordinate', () => {
    const recipe: Recipe = { kind: 'pattern', pattern: 'PED-######' };
    expect(fromRecipe(recipe, 7, coord)).toBe(fromRecipe(recipe, 7, coord));
  });
});

describe('how a list is consumed', () => {
  it('walks in order when the mode is in cycle, and wraps', () => {
    const out = [0, 1, 2, 3, 4].map((i) => drawIndex('cycle', 3, i, 7, coord));
    expect(out).toEqual([0, 1, 2, 0, 1]);
  });

  it('does not repeat while there are values left, when the mode is unique', () => {
    const out = [0, 1, 2].map((i) => drawIndex('unique', 3, i, 7, coord));
    expect(new Set(out).size).toBe(3);
  });

  it('runs out rather than inventing, when the mode is unique', () => {
    expect(drawIndex('unique', 3, 3, 7, coord)).toBe(-1);
    expect(exhaustedAt('unique', 10, 45)).toBe(10);
    expect(exhaustedAt('unique', 45, 45)).toBeNull();
    expect(exhaustedAt('random', 10, 45)).toBeNull();
  });

  it('may repeat when the mode is at random', () => {
    const out = Array.from({ length: 40 }, (_, i) => drawIndex('random', 3, i, 7, `c/${i}/k`));
    expect(out.every((i) => i >= 0 && i < 3)).toBe(true);
    expect(new Set(out).size).toBeLessThanOrEqual(3);
  });

  it('gives nothing from an empty list instead of an index nobody can use', () => {
    expect(drawIndex('random', 0, 0, 7, coord)).toBe(-1);
  });
});

describe('an assignment', () => {
  const lookup = (id: string) => (id === 's1' ? list(['alta', 'baja', 'pendiente']) : null);

  it('draws from the saved source', () => {
    const v = fromSource({ sourceId: 's1', recipe: null, draw: 'cycle' }, lookup, 7, coord, 1);
    expect(v).toBe('baja');
  });

  it('uses a loose recipe when no source is named', () => {
    const v = fromSource(
      { sourceId: '', recipe: { kind: 'digits', length: 4 }, draw: 'random' },
      lookup,
      7,
      coord,
      0,
    );
    expect(v).toMatch(/^\d{4}$/);
  });

  /** Kept, not deleted: the file of sources may arrive later (D16). */
  it('lets the deduction answer when the source is not here', () => {
    const v = fromSource(
      { sourceId: 'se-borro', recipe: null, draw: 'random' },
      lookup,
      7,
      coord,
      0,
    );
    expect(v).toBeNull();
  });

  it('lets the deduction answer when a unique list has run out', () => {
    const v = fromSource({ sourceId: 's1', recipe: null, draw: 'unique' }, lookup, 7, coord, 9);
    expect(v).toBeNull();
  });
});
