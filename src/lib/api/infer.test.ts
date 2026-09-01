import { describe, it, expect } from 'vitest';
import { formatOf, inferNode, readPaste } from './infer';

describe('recognising a format from the value alone', () => {
  it('recognises the five it can', () => {
    expect(formatOf('2026-01-31T10:00:00Z')).toBe('date-time');
    expect(formatOf('2026-01-31')).toBe('date');
    expect(formatOf('3f2b1c9a-0000-4a3d-9f00-abcdef123456')).toBe('uuid');
    expect(formatOf('usuario@ejemplo.com')).toBe('email');
    expect(formatOf('https://ejemplo.com/recurso')).toBe('uri');
  });

  /** A timestamp also starts with a date; the specific answer is the useful one. */
  it('prefers date-time over date for a timestamp', () => {
    expect(formatOf('2026-01-31T10:00:00Z')).toBe('date-time');
  });

  it('recognises nothing in ordinary text', () => {
    expect(formatOf('Camisa de lino')).toBe('');
    expect(formatOf('')).toBe('');
  });

  /** Nothing in a string says it is a password: these four are chosen by hand. */
  it('never infers the four hand-picked formats', () => {
    const inferred = ['2026-01-31', 'a@b.co', 'https://x.y', '1.5', 'secreto'].map(formatOf);
    expect(inferred).not.toContain('password');
    expect(inferred).not.toContain('byte');
    expect(inferred).not.toContain('int64');
    expect(inferred).not.toContain('float');
  });
});

describe('inferring one field', () => {
  it('tells an integer from a decimal', () => {
    expect(inferNode('total', 137).type).toBe('integer');
    expect(inferNode('precio', 39.95).type).toBe('number');
  });

  it('keeps the value as the field’s example', () => {
    expect(inferNode('nombre', 'Camisa').example).toBe('Camisa');
    expect(inferNode('total', 137).example).toBe('137');
    expect(inferNode('activo', true).example).toBe('true');
  });

  it('marks the format it recognises', () => {
    expect(inferNode('alta', '2026-01-31T10:00:00Z').format).toBe('date-time');
  });

  it('reads null as its own type', () => {
    expect(inferNode('borradoEl', null).type).toBe('null');
  });

  it('descends into an object', () => {
    const node = inferNode('cliente', { nombre: 'Ana', edad: 30 });
    expect(node.type).toBe('object');
    expect(node.children.map((c) => [c.key, c.type])).toEqual([
      ['nombre', 'string'],
      ['edad', 'integer'],
    ]);
  });

  it('describes an array of objects from its first element', () => {
    const node = inferNode('items', [{ id: 'P1', precio: 9.5 }]);
    expect(node.type).toBe('array');
    expect(node.itemType).toBe('object');
    expect(node.children.map((c) => c.key)).toEqual(['id', 'precio']);
  });

  it('describes an array of scalars by its element type', () => {
    expect(inferNode('tallas', ['S', 'M']).itemType).toBe('string');
    expect(inferNode('cantidades', [1, 2]).itemType).toBe('integer');
  });

  it('describes an empty array as holding text, for someone to correct', () => {
    expect(inferNode('items', []).itemType).toBe('string');
  });
});

describe('reading a pasted document', () => {
  it('builds an object', () => {
    const { shape, error } = readPaste('{"pagina":1,"total":137}');
    expect(error).toBeNull();
    expect(shape?.type).toBe('object');
    expect(shape?.children.map((c) => c.key)).toEqual(['pagina', 'total']);
  });

  it('builds an array of objects', () => {
    const { shape } = readPaste('[{"id":"P1"}]');
    expect(shape?.type).toBe('array');
    expect(shape?.itemType).toBe('object');
    expect(shape?.children.map((c) => c.key)).toEqual(['id']);
  });

  /**
   * The whole point of returning a shape rather than mutating: a refusal has
   * nothing to undo, so half an hour of work survives a bad paste.
   */
  it('refuses text that is not JSON, with nothing to apply', () => {
    const { shape, error } = readPaste('esto no es json');
    expect(shape).toBeNull();
    expect(error).toContain('válido');
  });

  it('refuses a bare value', () => {
    expect(readPaste('42').shape).toBeNull();
    expect(readPaste('"hola"').shape).toBeNull();
    expect(readPaste('null').shape).toBeNull();
  });

  it('accepts an empty object as an empty body', () => {
    const { shape, error } = readPaste('{}');
    expect(error).toBeNull();
    expect(shape?.children).toEqual([]);
  });
});
