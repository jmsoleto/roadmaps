import { describe, it, expect } from 'vitest';
import { enumIsNumeric, enumValue, enumValues, formatList, parseList } from './csv';

describe('reading a comma-separated box', () => {
  it('absorbs the stray spaces and the trailing comma', () => {
    expect(parseList('alta, baja , pendiente,')).toEqual(['alta', 'baja', 'pendiente']);
  });

  it('reads an empty box as no values', () => {
    expect(parseList('')).toEqual([]);
    expect(parseList('  ,  , ')).toEqual([]);
  });

  it('keeps a single value', () => {
    expect(parseList('alta')).toEqual(['alta']);
  });

  it('keeps the spaces inside a value', () => {
    expect(parseList('en curso, sin empezar')).toEqual(['en curso', 'sin empezar']);
  });
});

describe('writing the box back', () => {
  it('separates with a comma and a space', () => {
    expect(formatList(['alta', 'baja'])).toBe('alta, baja');
  });

  it('round-trips a canonical list unchanged', () => {
    const values = ['alta', 'baja', 'pendiente'];
    expect(parseList(formatList(values))).toEqual(values);
  });
});

describe('deducing what an enumeration is made of', () => {
  it('reads a list of whole numbers as numeric', () => {
    expect(enumIsNumeric(['1', '2'])).toBe(true);
    expect(enumIsNumeric(['0', '10', '137'])).toBe(true);
  });

  it('reads a list of words as text', () => {
    expect(enumIsNumeric(['alta', 'baja'])).toBe(false);
  });

  // The case the whole rule exists for: `Number('01')` is a perfectly valid 1,
  // and delivering 1 where somebody agreed 01 changes the agreed value.
  it('keeps a code with a leading zero as text', () => {
    expect(enumIsNumeric(['01', '02'])).toBe(false);
  });

  it('keeps a prefix as text', () => {
    expect(enumIsNumeric(['+34', '+351'])).toBe(false);
  });

  it('keeps a decimal with a trailing zero as text', () => {
    expect(enumIsNumeric(['1.50', '2.00'])).toBe(false);
  });

  it('reads a decimal that survives the round trip as numeric', () => {
    expect(enumIsNumeric(['1.5', '2.25'])).toBe(true);
  });

  it('needs every value to survive, not just the first', () => {
    expect(enumIsNumeric(['1', '2', 'tres'])).toBe(false);
    expect(enumIsNumeric(['1', '01'])).toBe(false);
  });

  it('reads an empty list as text, because there is nothing to deduce from', () => {
    expect(enumIsNumeric([])).toBe(false);
  });

  // Declared as a known cost (D5): a list of years is a list of numbers, and
  // nothing in it says it was meant as text.
  it('reads a list of years as numeric, which is the accepted cost', () => {
    expect(enumIsNumeric(['2026', '2027'])).toBe(true);
  });
});

describe('emitting an enumerated value with the type it deduced', () => {
  it('emits a numeric enumeration as numbers', () => {
    expect(enumValue('2', ['1', '2', '3'])).toBe(2);
  });

  it('emits a text enumeration as text', () => {
    expect(enumValue('baja', ['alta', 'baja'])).toBe('baja');
  });

  it('emits a code with a leading zero exactly as it was written', () => {
    expect(enumValue('01', ['01', '02'])).toBe('01');
  });

  // A hand-written example that is not in the list: never NaN.
  it('leaves a value that is not in a numeric list as it came', () => {
    expect(enumValue('fuera', ['1', '2'])).toBe('fuera');
  });

  it('emits the whole list at once for the document', () => {
    expect(enumValues(['1', '2'])).toEqual([1, 2]);
    expect(enumValues(['alta', 'baja'])).toEqual(['alta', 'baja']);
  });

  it('does not share the array it was given', () => {
    const values = ['alta', 'baja'];
    const out = enumValues(values);
    expect(out).not.toBe(values);
  });
});
