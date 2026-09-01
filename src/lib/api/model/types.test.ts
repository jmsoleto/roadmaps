import { describe, it, expect } from 'vitest';
import { ITEM_TYPES, NODE_TYPES, NODE_FORMATS, INFERRED_FORMATS } from './types';

/**
 * These lists are plain literals, so nothing else fails when one falls out of
 * step with the code that uses it — the type picker just renders a field whose
 * current value is not among its options, and shows blank.
 */
describe('what the pickers offer', () => {
  it('offers every field type, references included', () => {
    expect(NODE_TYPES).toContain('ref');
    expect(NODE_TYPES).toHaveLength(8);
  });

  it('lets an array hold a model', () => {
    expect(ITEM_TYPES).toContain('ref');
  });

  it('offers the ten formats, of which five are the inferred ones', () => {
    expect(NODE_FORMATS).toHaveLength(10);
    for (const format of INFERRED_FORMATS) expect(NODE_FORMATS).toContain(format);
  });
});
