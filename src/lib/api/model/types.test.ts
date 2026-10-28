import { describe, it, expect } from 'vitest';
import { ITEM_TYPES, NODE_TYPES, NODE_FORMATS, INFERRED_FORMATS, PARAM_TYPES } from './types';

/**
 * These lists are plain literals, so nothing else fails when one falls out of
 * step with the code that uses it — the type picker just renders a field whose
 * current value is not among its options, and shows blank.
 */
describe('what the pickers offer', () => {
  it('offers every field type, references and enumerations included', () => {
    expect(NODE_TYPES).toContain('ref');
    expect(NODE_TYPES).toContain('enum');
    expect(NODE_TYPES).toHaveLength(9);
  });

  /**
   * The position is the feature (D2). The list of admitted values was already
   * in the document and already exported; what was missing was anybody finding
   * it. Every field is born `string`, so a type that fixes «I did not know you
   * could say that» and sits at the end of the list fixes nothing.
   */
  it('offers the enumeration right where the eye already is', () => {
    expect(NODE_TYPES.indexOf('enum')).toBe(NODE_TYPES.indexOf('string') + 1);
  });

  it('lets an array hold a model', () => {
    expect(ITEM_TYPES).toContain('ref');
  });

  /** Both deliberately out of this change, and both need a model decision. */
  it('does not offer an enumeration as what an array holds, nor as a parameter', () => {
    expect(ITEM_TYPES).not.toContain('enum');
    expect(PARAM_TYPES).not.toContain('enum');
  });

  it('offers the ten formats, of which five are the inferred ones', () => {
    expect(NODE_FORMATS).toHaveLength(10);
    for (const format of INFERRED_FORMATS) expect(NODE_FORMATS).toContain(format);
  });
});
