import { describe, it, expect } from 'vitest';
import { getSprintSegments, getQuarterSegments } from './segments';

describe('getSprintSegments', () => {
  it('numbers Sprint 09 at its absolute anchor (2026-06-29) from a 2026-01-01 window', () => {
    const segs = getSprintSegments('2026-01-01', 730);
    const anchor = segs.find((s) => s.start === 179); // 2026-06-29 is day 179
    expect(anchor?.num).toBe(9);
  });

  it('covers the whole window with contiguous 14-day sprints', () => {
    const segs = getSprintSegments('2026-01-01', 730);
    expect(segs[0].start).toBe(0);
    expect(segs[segs.length - 1].end).toBe(730);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].start).toBe(segs[i - 1].end);
      expect(segs[i].num).toBe(segs[i - 1].num + 1);
    }
  });

  it('keeps absolute numbering when the roadmap starts on a different date', () => {
    // Starting two weeks later shifts the anchor offset but not its number.
    const segs = getSprintSegments('2026-01-15', 730);
    const anchor = segs.find((s) => s.num === 9);
    expect(anchor).toBeDefined();
  });
});

describe('getQuarterSegments', () => {
  it('produces quarters within the window in day-offset space', () => {
    const segs = getQuarterSegments('2026-01-01', 730);
    expect(segs.length).toBeGreaterThan(0);
    expect(segs[0].start).toBe(0);
    expect(segs.every((s) => s.q >= 1 && s.q <= 4)).toBe(true);
    // Q1 boundary (1 Mar 2026) is day 59.
    const q1 = segs.find((s) => s.q === 1 && s.year === 2026);
    expect(q1?.start).toBe(59);
  });
});
