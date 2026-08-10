import { describe, it, expect } from 'vitest';
import { toSlot, normalizeColors, normalizeRecord } from './migrate';
import { PALETTE_V1 } from './presets';
import { PALETTE_SLOTS } from './tokens';

describe('toSlot', () => {
  it('maps every legacy palette color to its own index', () => {
    PALETTE_V1.forEach((hex, i) => {
      expect(toSlot(hex), hex).toBe(i);
      expect(toSlot(hex.toLowerCase()), hex).toBe(i);
    });
  });

  it('snaps a color that is not in the palette to the nearest one', () => {
    // A cyan a few units off #22D3EE.
    expect(toSlot('#20d0ea')).toBe(0);
    // A generic orange lands on the orange slot.
    expect(toSlot('#ff8c33')).toBe(1);
  });

  it('passes an existing slot through', () => {
    expect(toSlot(0)).toBe(0);
    expect(toSlot(7)).toBe(7);
  });

  it('reads a slot stored as text, which is how some legacy documents carry it', () => {
    expect(toSlot('3')).toBe(3);
    expect(toSlot(' 5 ')).toBe(5);
  });

  it('wraps an out-of-range slot instead of leaving a bar uncolored', () => {
    expect(toSlot(PALETTE_SLOTS)).toBe(0);
    expect(toSlot(PALETTE_SLOTS + 3)).toBe(3);
    expect(toSlot(-1)).toBe(PALETTE_SLOTS - 1);
  });

  it('falls back to the first slot for values it cannot read', () => {
    expect(toSlot(undefined)).toBe(0);
    expect(toSlot(null)).toBe(0);
    expect(toSlot('rebeco')).toBe(0);
    expect(toSlot({})).toBe(0);
  });
});

describe('normalizeRecord', () => {
  it('replaces the legacy field with a slot', () => {
    const record: Record<string, unknown> = { color: '#E879F9' };
    normalizeRecord(record);
    expect(record.colorSlot).toBe(2);
    expect('color' in record).toBe(false);
  });

  it('prefers an existing slot over a stale legacy color', () => {
    const record: Record<string, unknown> = { colorSlot: 8, color: '#22D3EE' };
    normalizeRecord(record);
    expect(record.colorSlot).toBe(8);
  });
});

describe('normalizeColors', () => {
  /** Shaped like data on its way in: `color` present, `colorSlot` still absent. */
  type Rec = { id: string; color?: string; colorSlot?: number };
  type Doc = {
    activeId: string;
    roadmaps: { id: string; rows: (Rec & { children: Rec[] })[] }[];
    assignees: Rec[];
  };

  const legacyDoc = (): Doc => ({
    activeId: 'rm1',
    roadmaps: [
      {
        id: 'rm1',
        rows: [
          {
            id: 'p1',
            color: '#22D3EE',
            children: [
              { id: 'i1', color: '#4ADE80' },
              { id: 'i2', color: '#A78BFA' },
            ],
          },
          { id: 'p2', color: '#FACC15', children: [] },
        ],
      },
    ],
    assignees: [
      { id: 'a1', color: '#60A5FA' },
      { id: 'a2', color: '#F472B6' },
    ],
  });

  it('converts phases, items and assignees in one pass', () => {
    const doc = normalizeColors(legacyDoc());
    const [p1, p2] = doc.roadmaps[0].rows;
    expect(p1.colorSlot).toBe(0);
    expect(p1.children[0].colorSlot).toBe(5);
    expect(p1.children[1].colorSlot).toBe(7);
    expect(p2.colorSlot).toBe(6);
    expect(doc.assignees.map((a) => a.colorSlot)).toEqual([3, 8]);
  });

  it('leaves no legacy field behind', () => {
    const doc = normalizeColors(legacyDoc());
    const json = JSON.stringify(doc);
    expect(json).not.toContain('"color"');
    expect(json).not.toContain('#');
  });

  it('is idempotent', () => {
    const once = normalizeColors(legacyDoc());
    const twice = normalizeColors(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
  });

  it('leaves already-migrated data untouched', () => {
    const migrated = {
      roadmaps: [{ rows: [{ colorSlot: 4, children: [{ colorSlot: 9 }] }] }],
      assignees: [{ colorSlot: 2 }],
    };
    const before = JSON.parse(JSON.stringify(migrated));
    expect(normalizeColors(migrated)).toEqual(before);
  });

  it('survives a document missing the parts it looks for', () => {
    expect(() => normalizeColors({})).not.toThrow();
    expect(() => normalizeColors(null)).not.toThrow();
    expect(() => normalizeColors({ roadmaps: [{ rows: [{ color: '#22D3EE' }] }] })).not.toThrow();
  });
});
