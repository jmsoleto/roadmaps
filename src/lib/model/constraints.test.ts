import { describe, it, expect } from 'vitest';
import { getMinStart, wouldCreateCycle, enforceConstraints } from './constraints';
import type { Item, Phase, Roadmap } from './types';

function item(
  id: string,
  start: string,
  end: string,
  deps: string[] = [],
  milestone = false,
): Item {
  return {
    id,
    label: id,
    colorSlot: 0,
    startDate: start,
    endDate: milestone ? start : end,
    assigneeId: null,
    notes: '',
    dependsOn: deps,
    isMilestone: milestone,
  };
}

function phase(children: Item[]): Phase {
  return {
    id: 'p',
    name: 'p',
    colorSlot: 0,
    expanded: true,
    assigneeId: null,
    notes: '',
    startDate: null,
    endDate: null,
    children,
  };
}

function roadmap(p: Phase): Roadmap {
  return { id: 'r', name: 'r', startDate: '2026-01-01', windowDays: 730, rows: [p] };
}

describe('getMinStart', () => {
  it('is the latest predecessor end', () => {
    const a = item('a', '2026-01-05', '2026-01-20');
    const b = item('b', '2026-01-06', '2026-01-30');
    const c = item('c', '2026-02-01', '2026-02-10', ['a', 'b']);
    const p = phase([a, b, c]);
    expect(getMinStart(p, c)).toBe('2026-01-30');
  });

  it('uses a milestone predecessor’s single date', () => {
    const m = item('m', '2026-01-15', '2026-01-15', [], true);
    const c = item('c', '2026-02-01', '2026-02-10', ['m']);
    expect(getMinStart(phase([m, c]), c)).toBe('2026-01-15');
  });
});

describe('wouldCreateCycle', () => {
  it('detects direct and transitive cycles', () => {
    const a = item('a', '2026-01-05', '2026-01-10');
    const b = item('b', '2026-01-11', '2026-01-20', ['a']);
    const p = phase([a, b]);
    // a depends on b would close a<->b cycle (b already depends on a)
    expect(wouldCreateCycle(p, a, b)).toBe(true);
    // self-dependency
    expect(wouldCreateCycle(p, a, a)).toBe(true);
  });

  it('allows a valid new dependency', () => {
    const a = item('a', '2026-01-05', '2026-01-10');
    const b = item('b', '2026-01-11', '2026-01-20');
    expect(wouldCreateCycle(phase([a, b]), b, a)).toBe(false);
  });
});

describe('enforceConstraints', () => {
  it('pushes a dependent that starts too early to after its predecessor (snapped forward)', () => {
    const a = item('a', '2026-01-05', '2026-01-23'); // ends Fri 23 Jan
    const b = item('b', '2026-01-10', '2026-01-20', ['a']); // starts before a ends
    const rm = roadmap(phase([a, b]));
    const changed = enforceConstraints(rm);
    expect(changed).toBe(true);
    // 2026-01-23 is a Friday; snapForward keeps it, so b starts on the 23rd.
    expect(b.startDate).toBe('2026-01-23');
    // Duration (10 days) is preserved.
    expect(b.endDate).toBe('2026-02-02');
  });

  it('leaves a satisfied dependency untouched', () => {
    const a = item('a', '2026-01-05', '2026-01-20');
    const b = item('b', '2026-02-01', '2026-02-10', ['a']);
    const rm = roadmap(phase([a, b]));
    expect(enforceConstraints(rm)).toBe(false);
    expect(b.startDate).toBe('2026-02-01');
  });

  it('collapses a milestone dependent onto its predecessor end', () => {
    const a = item('a', '2026-01-05', '2026-01-26'); // Mon 26 Jan
    const m = item('m', '2026-01-10', '2026-01-10', ['a'], true);
    const rm = roadmap(phase([a, m]));
    enforceConstraints(rm);
    expect(m.startDate).toBe('2026-01-26');
    expect(m.endDate).toBe('2026-01-26');
  });
});
