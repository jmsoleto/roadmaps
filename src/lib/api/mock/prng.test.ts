import { describe, it, expect } from 'vitest';
import { coordinate, newSeed, pick, unit, unitAt } from './prng';

describe('the value of a coordinate', () => {
  it('is always the same for the same seed', () => {
    const a = unit(4821, 'clientes/7/nombre');
    const b = unit(4821, 'clientes/7/nombre');
    expect(a).toBe(b);
  });

  it('lands in [0,1)', () => {
    for (let i = 0; i < 500; i++) {
      const v = unit(4821, coordinate('clientes', i, 'nombre'));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('has no state: the order it is asked in changes nothing', () => {
    const forwards = [0, 1, 2].map((i) => unit(7, coordinate('c', i, 'k')));
    const backwards = [2, 1, 0].map((i) => unit(7, coordinate('c', i, 'k'))).reverse();
    expect(forwards).toEqual(backwards);
  });
});

/**
 * The requirement `El mock es estable mientras se edita` rests on this: a
 * coordinate one character away must land nowhere near, or every entity would
 * read as a gradient of its neighbour.
 */
describe('two coordinates that barely differ', () => {
  it('are not neighbours', () => {
    // One pair could be close by chance, so this asks of a hundred: a hash that
    // kept adjacent coordinates adjacent would hold every gap tiny.
    const gaps = [];
    for (let i = 0; i < 100; i++) {
      gaps.push(
        Math.abs(
          unit(1, coordinate('clientes', i, 'nombre')) -
            unit(1, coordinate('clientes', i + 1, 'nombre')),
        ),
      );
    }
    const average = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    expect(average).toBeGreaterThan(0.2);
  });

  it('spread over the range rather than clustering', () => {
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 1000; i++) {
      buckets[Math.floor(unit(99, coordinate('clientes', i, 'nombre')) * 10)]++;
    }
    // Uniform enough that nothing is starved: a clustered hash would leave
    // whole buckets empty and make every mock look alike.
    for (const count of buckets) expect(count).toBeGreaterThan(40);
  });
});

describe('changing the seed', () => {
  it('changes the value of every coordinate', () => {
    const coords = [0, 1, 2, 3, 4].map((i) => coordinate('clientes', i, 'nombre'));
    const before = coords.map((c) => unit(1, c));
    const after = coords.map((c) => unit(2, c));
    for (let i = 0; i < coords.length; i++) expect(before[i]).not.toBe(after[i]);
  });
});

describe('a second value for the same coordinate', () => {
  it('is the first one when nth is 0', () => {
    expect(unitAt(5, 'a/0/b', 0)).toBe(unit(5, 'a/0/b'));
  });

  it('differs from the first, and is stable', () => {
    expect(unitAt(5, 'a/0/b', 1)).not.toBe(unitAt(5, 'a/0/b', 0));
    expect(unitAt(5, 'a/0/b', 1)).toBe(unitAt(5, 'a/0/b', 1));
  });
});

describe('picking one of n', () => {
  it('never reaches n', () => {
    for (let i = 0; i < 500; i++) {
      expect(pick(3, coordinate('c', i, 'k'), 45)).toBeLessThan(45);
    }
  });

  it('gives 0 for an empty pool rather than NaN', () => {
    expect(pick(3, 'c/0/k', 0)).toBe(0);
    expect(pick(3, 'c/0/k', -1)).toBe(0);
  });
});

describe('a new seed', () => {
  it('is a whole number in range', () => {
    for (let i = 0; i < 20; i++) {
      const s = newSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(4294967296);
    }
  });
});
