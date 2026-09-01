import { describe, it, expect } from 'vitest';
import { formatList, parseList } from './csv';

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
