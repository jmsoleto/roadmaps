import { describe, it, expect } from 'vitest';
import { getMetaWindow } from './derive';
import { addDays, dayIndex } from '../time/timeline';
import type { Item, Phase, Roadmap } from './types';

const TODAY = '2026-08-03';

function item(start: string, end: string): Item {
  return {
    id: `i-${start}`,
    label: start,
    colorSlot: 0,
    startDate: start,
    endDate: end,
    assigneeId: null,
    notes: '',
    dependsOn: [],
    blockers: [],
    isMilestone: false,
  };
}

function phase(children: Item[]): Phase {
  return {
    id: `p-${children[0]?.id ?? 'empty'}`,
    name: 'fase',
    colorSlot: 0,
    expanded: true,
    assigneeId: null,
    notes: '',
    startDate: null,
    endDate: null,
    children,
  };
}

/** A roadmap whose window starts at `startDate` and holds one item spanning the range. */
function roadmap(id: string, startDate: string, itemStart: string, itemEnd: string): Roadmap {
  return {
    id,
    name: id,
    startDate,
    windowDays: 730,
    rows: [phase([item(itemStart, itemEnd)])],
  };
}

/** A roadmap with a configured window but nothing scheduled in it. */
function emptyRoadmap(id: string, startDate: string): Roadmap {
  return { id, name: id, startDate, windowDays: 730, rows: [] };
}

describe('getMetaWindow', () => {
  it('keeps the earliest roadmap start as origin when today is inside the range', () => {
    const rms = [
      roadmap('a', '2026-03-01', '2026-03-10', '2026-09-30'),
      roadmap('b', '2026-05-01', '2026-06-01', '2026-12-15'),
    ];
    const { origin } = getMetaWindow(rms, TODAY);
    expect(origin).toBe('2026-03-01');
  });

  it('covers the latest extent end with slack when today is inside the range', () => {
    // The end is far enough out that the tail, not the one-year floor, decides.
    const rms = [roadmap('a', '2026-03-01', '2026-03-10', '2027-06-30')];
    const { origin, windowDays } = getMetaWindow(rms, TODAY);
    expect(windowDays).toBe(dayIndex(origin, '2027-06-30') + 30);
    expect(windowDays).toBeGreaterThan(365);
  });

  it('never returns a window shorter than a year', () => {
    const rms = [roadmap('a', '2026-07-01', '2026-07-05', '2026-07-20')];
    const { windowDays } = getMetaWindow(rms, TODAY);
    expect(windowDays).toBe(365);
  });

  it('moves the origin back to today minus the lead when every roadmap is in the future', () => {
    const rms = [
      roadmap('a', '2027-01-01', '2027-01-10', '2027-06-30'),
      roadmap('b', '2027-03-01', '2027-03-10', '2027-08-30'),
    ];
    const { origin } = getMetaWindow(rms, TODAY);
    expect(origin).toBe(addDays(TODAY, -30));
  });

  it('stretches the window past today when every roadmap is in the past', () => {
    const rms = [roadmap('a', '2024-01-01', '2024-02-01', '2024-06-30')];
    const { origin, windowDays } = getMetaWindow(rms, TODAY);
    expect(origin).toBe('2024-01-01');
    expect(windowDays).toBe(dayIndex(origin, TODAY) + 30);
  });

  it('always leaves today inside the window', () => {
    const cases: Roadmap[][] = [
      [roadmap('a', '2026-03-01', '2026-03-10', '2026-12-15')], // today inside
      [roadmap('a', '2027-01-01', '2027-01-10', '2027-06-30')], // all future
      [roadmap('a', '2024-01-01', '2024-02-01', '2024-06-30')], // all past
      [emptyRoadmap('a', '2030-01-01')], // future, nothing scheduled
      [], // no roadmaps at all
    ];
    for (const rms of cases) {
      const { origin, windowDays } = getMetaWindow(rms, TODAY);
      const today = dayIndex(origin, TODAY);
      expect(today).toBeGreaterThanOrEqual(0);
      expect(today).toBeLessThanOrEqual(windowDays);
    }
  });

  it('keeps today clear of the left edge when it drives the origin', () => {
    const { origin } = getMetaWindow(
      [roadmap('a', '2027-01-01', '2027-01-10', '2027-06-30')],
      TODAY,
    );
    expect(dayIndex(origin, TODAY)).toBe(30);
  });

  it('ignores roadmaps with no dates when sizing the tail', () => {
    const rms = [
      roadmap('a', '2026-03-01', '2026-03-10', '2027-06-30'),
      emptyRoadmap('b', '2026-04-01'),
    ];
    const { origin, windowDays } = getMetaWindow(rms, TODAY);
    expect(origin).toBe('2026-03-01');
    expect(windowDays).toBe(dayIndex(origin, '2027-06-30') + 30);
  });
});
