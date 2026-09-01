import { describe, it, expect } from 'vitest';
import {
  dropBlockIndex,
  dropIndex,
  getMetaWindow,
  getPhaseBlocks,
  getVisibleRows,
  moveInArray,
  previewRows,
  rowKey,
} from './derive';
import { addDays, dayIndex } from '../time/timeline';
import { ROW_H } from '../config';
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
    completedDate: null,
    endAtCompletion: null,
    baselineEnd: null,
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
    colorSlot: 0,
    startDate,
    windowDays: 730,
    baselineDate: null,
    rows: [phase([item(itemStart, itemEnd)])],
  };
}

/** A roadmap with a configured window but nothing scheduled in it. */
function emptyRoadmap(id: string, startDate: string): Roadmap {
  return { id, name: id, colorSlot: 0, startDate, windowDays: 730, rows: [], baselineDate: null };
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

// ---- reordering geometry ----

/** A phase with an explicit id and `n` items, expanded or not. */
function namedPhase(id: string, n: number, expanded = true): Phase {
  const children: Item[] = [];
  for (let k = 0; k < n; k++) {
    const it = item(`${id}-${k}`, `${id}-${k}`);
    it.id = `${id}i${k}`;
    children.push(it);
  }
  return {
    id,
    name: id,
    colorSlot: 0,
    expanded,
    assigneeId: null,
    notes: '',
    startDate: null,
    endDate: null,
    children,
  };
}

function rmOf(rows: Phase[]): Roadmap {
  return {
    id: 'r',
    name: 'r',
    colorSlot: 0,
    startDate: '2026-01-01',
    windowDays: 730,
    rows,
    baselineDate: null,
  };
}

const keys = (rm: Roadmap, drag: Parameters<typeof previewRows>[1]) =>
  previewRows(rm, drag).map(rowKey);

describe('getPhaseBlocks', () => {
  it('spans header, items and add row for an expanded phase', () => {
    const rm = rmOf([namedPhase('a', 3)]);
    expect(getPhaseBlocks(rm)).toEqual([{ phaseId: 'a', start: 0, len: 5 }]);
  });

  it('spans a single row for a collapsed phase, whatever it holds', () => {
    const rm = rmOf([namedPhase('a', 4, false)]);
    expect(getPhaseBlocks(rm)).toEqual([{ phaseId: 'a', start: 0, len: 1 }]);
  });

  it('spans header and add row for an expanded phase with no items', () => {
    const rm = rmOf([namedPhase('a', 0)]);
    expect(getPhaseBlocks(rm)).toEqual([{ phaseId: 'a', start: 0, len: 2 }]);
  });

  it('chains the starts across a mix of collapsed and expanded phases', () => {
    const rm = rmOf([namedPhase('a', 2), namedPhase('b', 3, false), namedPhase('c', 1)]);
    expect(getPhaseBlocks(rm)).toEqual([
      { phaseId: 'a', start: 0, len: 4 },
      { phaseId: 'b', start: 4, len: 1 },
      { phaseId: 'c', start: 5, len: 3 },
    ]);
    // The last block ends exactly where the flattened list does.
    expect(getVisibleRows(rm)).toHaveLength(8);
  });

  it('returns nothing for a roadmap with no phases', () => {
    expect(getPhaseBlocks(rmOf([]))).toEqual([]);
  });
});

describe('dropIndex', () => {
  it('lands on the row the pointer has travelled to', () => {
    expect(dropIndex(1, 2 * ROW_H, 5)).toBe(3);
    expect(dropIndex(3, -2 * ROW_H, 5)).toBe(1);
  });

  it('rounds at the halfway point, so a row swaps once it is half crossed', () => {
    expect(dropIndex(0, ROW_H * 0.49, 5)).toBe(0);
    expect(dropIndex(0, ROW_H * 0.51, 5)).toBe(1);
  });

  it('stays put for a gesture that never leaves the row', () => {
    expect(dropIndex(2, 0, 5)).toBe(2);
  });

  it('clamps at the top however far the pointer goes', () => {
    expect(dropIndex(1, -50 * ROW_H, 5)).toBe(0);
  });

  it('clamps at the bottom however far the pointer goes', () => {
    expect(dropIndex(3, 50 * ROW_H, 5)).toBe(4);
  });

  it('has nowhere to go when there is only one sibling', () => {
    expect(dropIndex(0, 9 * ROW_H, 1)).toBe(0);
    expect(dropIndex(0, -9 * ROW_H, 1)).toBe(0);
  });
});

describe('dropBlockIndex', () => {
  // a(4 filas: cabecera + 2 items + añadir), b(1, plegada), c(3): alturas
  // distintas, que es justo el caso que dropIndex no sabe leer.
  const rm = rmOf([namedPhase('a', 2), namedPhase('b', 3, false), namedPhase('c', 1)]);
  const blocks = getPhaseBlocks(rm);

  it('deja la fase donde está mientras el gesto no llega a media fila', () => {
    expect(dropBlockIndex(blocks, 0, 0)).toBe(0);
    expect(dropBlockIndex(blocks, 0, ROW_H * 0.4)).toBe(0);
  });

  it('cruza una fase plegada con una fila de recorrido, no más', () => {
    // Quitada a, la cabecera solo tiene que bajar 1 fila para quedar tras b.
    expect(dropBlockIndex(blocks, 0, ROW_H * 0.6)).toBe(1);
    expect(dropBlockIndex(blocks, 0, ROW_H * 2)).toBe(1);
  });

  it('exige recorrer una fase larga entera para cruzarla', () => {
    // Para quedar tras c la cabecera tiene que bajar 4 filas: b(1) + c(3).
    expect(dropBlockIndex(blocks, 0, ROW_H * 2.4)).toBe(1);
    expect(dropBlockIndex(blocks, 0, ROW_H * 2.6)).toBe(2);
  });

  it('sube contando lo que va quedando por encima', () => {
    expect(dropBlockIndex(blocks, 2, 0)).toBe(2);
    expect(dropBlockIndex(blocks, 2, -ROW_H * 0.6)).toBe(1);
    expect(dropBlockIndex(blocks, 2, -ROW_H * 5)).toBe(0);
  });

  it('nunca se sale del rango por lejos que llegue el puntero', () => {
    expect(dropBlockIndex(blocks, 1, ROW_H * 99)).toBe(2);
    expect(dropBlockIndex(blocks, 1, -ROW_H * 99)).toBe(0);
  });

  it('no tiene adónde ir con una sola fase', () => {
    const one = getPhaseBlocks(rmOf([namedPhase('a', 2)]));
    expect(dropBlockIndex(one, 0, ROW_H * 9)).toBe(0);
    expect(dropBlockIndex(one, 0, -ROW_H * 9)).toBe(0);
  });
});

describe('moveInArray', () => {
  it('moves an element forward', () => {
    expect(moveInArray([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
  });

  it('moves an element backward', () => {
    expect(moveInArray([1, 2, 3, 4], 3, 1)).toEqual([1, 4, 2, 3]);
  });

  it('is a no-op when from equals to', () => {
    expect(moveInArray([1, 2, 3], 1, 1)).toEqual([1, 2, 3]);
  });

  it('leaves the original array untouched', () => {
    const arr = [1, 2, 3];
    moveInArray(arr, 0, 2);
    expect(arr).toEqual([1, 2, 3]);
  });
});

describe('previewRows', () => {
  it('is the plain flattening when nothing is being dragged', () => {
    const rm = rmOf([namedPhase('a', 1), namedPhase('b', 1)]);
    expect(keys(rm, null)).toEqual(getVisibleRows(rm).map(rowKey));
  });

  it('is the plain flattening when the drop index equals the origin', () => {
    const rm = rmOf([namedPhase('a', 1), namedPhase('b', 1)]);
    const drag = { kind: 'phase', phaseId: 'a', from: 0, to: 0 } as const;
    expect(keys(rm, drag)).toEqual(getVisibleRows(rm).map(rowKey));
  });

  it('carries a phase block whole, items and add row included', () => {
    const rm = rmOf([namedPhase('a', 2), namedPhase('b', 0, false)]);
    expect(keys(rm, { kind: 'phase', phaseId: 'a', from: 0, to: 1 })).toEqual([
      'p:b',
      'p:a',
      'i:ai0',
      'i:ai1',
      'a:a',
    ]);
  });

  it('reorders items inside their own phase and leaves the rest alone', () => {
    const rm = rmOf([namedPhase('a', 3), namedPhase('b', 1)]);
    expect(keys(rm, { kind: 'item', phaseId: 'a', itemId: 'ai0', from: 0, to: 2 })).toEqual([
      'p:a',
      'i:ai1',
      'i:ai2',
      'i:ai0',
      'a:a',
      'p:b',
      'i:bi0',
      'a:b',
    ]);
  });

  it('does not mutate the roadmap it previews', () => {
    const rm = rmOf([namedPhase('a', 2), namedPhase('b', 1)]);
    previewRows(rm, { kind: 'phase', phaseId: 'a', from: 0, to: 1 });
    previewRows(rm, { kind: 'item', phaseId: 'a', itemId: 'ai0', from: 0, to: 1 });
    expect(rm.rows.map((p) => p.id)).toEqual(['a', 'b']);
    expect(rm.rows[0].children.map((c) => c.id)).toEqual(['ai0', 'ai1']);
  });
});
