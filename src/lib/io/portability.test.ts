import { describe, it, expect } from 'vitest';
import { exportRoadmap, parseImport } from './portability';
import type { Assignee, Roadmap } from '../model/types';

const assignees: Assignee[] = [
  { id: 'as1', name: 'Ana', colorSlot: 3 },
  { id: 'as2', name: 'Beto', colorSlot: 1 },
];

const roadmap: Roadmap = {
  id: 'rm1',
  name: 'Demo',
  startDate: '2026-01-01',
  windowDays: 730,
  rows: [
    {
      id: 'p1',
      name: 'Fase A',
      colorSlot: 0,
      expanded: true,
      assigneeId: null,
      notes: '',
      startDate: null,
      endDate: null,
      children: [
        {
          id: 'i1',
          label: 'Tarea 1',
          colorSlot: 0,
          startDate: '2026-01-05',
          endDate: '2026-01-20',
          assigneeId: 'as1',
          notes: 'nota',
          dependsOn: [],
          isMilestone: false,
        },
        {
          id: 'i2',
          label: 'Tarea 2',
          colorSlot: 0,
          startDate: '2026-01-21',
          endDate: '2026-02-10',
          assigneeId: 'as2',
          notes: '',
          dependsOn: ['i1'],
          isMilestone: false,
        },
      ],
    },
  ],
};

describe('export → import round-trip', () => {
  it('preserves structure, dependencies and referenced assignees', () => {
    const json = exportRoadmap(roadmap, assignees);
    const { roadmap: back, assignees: backAssignees } = parseImport(json);

    // Only referenced assignees are exported (both are used here).
    expect(backAssignees.map((a) => a.id).sort()).toEqual(['as1', 'as2']);

    const items = back.rows[0].children;
    expect(items.map((i) => i.label)).toEqual(['Tarea 1', 'Tarea 2']);
    expect(items[1].dependsOn).toEqual(['i1']); // dependency preserved
    expect(items[0].assigneeId).toBe('as1'); // assignment preserved
    expect(items[0].startDate).toBe('2026-01-05'); // absolute dates preserved
    expect(back.name).toBe('Demo');
  });

  it('gives the imported roadmap a fresh id', () => {
    const json = exportRoadmap(roadmap, assignees);
    const { roadmap: back } = parseImport(json);
    expect(back.id).not.toBe('rm1');
  });
});

describe('legacy import (day-index format)', () => {
  it('converts integer day offsets to absolute ISO dates', () => {
    const legacy = JSON.stringify({
      id: 'old',
      name: 'Antiguo',
      rows: [
        {
          id: 'p',
          label: 'Fase vieja', // legacy phases use `label`
          color: '#E879F9',
          expanded: true,
          children: [
            { id: 'a', label: 'X', start: 4, end: 22, dependsOn: [], isMilestone: false },
            { id: 'm', label: 'Hito', start: 25, end: 25, dependsOn: ['a'], isMilestone: true },
          ],
        },
      ],
    });
    const { roadmap: back } = parseImport(legacy);
    expect(back.name).toBe('Antiguo');
    expect(back.rows[0].name).toBe('Fase vieja'); // label -> name
    const [x, m] = back.rows[0].children;
    // 2026-01-01 is day 0; day 4 = 2026-01-05, day 22 = 2026-01-23.
    expect(x.startDate).toBe('2026-01-05');
    expect(x.endDate).toBe('2026-01-23');
    expect(m.isMilestone).toBe(true);
    expect(m.startDate).toBe('2026-01-26');
    expect(m.endDate).toBe('2026-01-26'); // milestone start == end
    expect(m.dependsOn).toEqual(['a']);
  });

  it('converts the phase hex color to its palette slot', () => {
    const legacy = JSON.stringify({
      name: 'Antiguo',
      rows: [{ id: 'p', label: 'Fase', color: '#E879F9', children: [] }],
    });
    const { roadmap: back } = parseImport(legacy);
    expect(back.rows[0].colorSlot).toBe(2); // #E879F9 is slot 2 of the v1 palette
  });

  it('lets an item without a color inherit its phase slot', () => {
    const legacy = JSON.stringify({
      name: 'Antiguo',
      rows: [
        {
          id: 'p',
          label: 'Fase',
          color: '#4ADE80',
          children: [{ id: 'a', label: 'X', start: 0, end: 3 }],
        },
      ],
    });
    const { roadmap: back } = parseImport(legacy);
    expect(back.rows[0].colorSlot).toBe(5);
    expect(back.rows[0].children[0].colorSlot).toBe(5);
  });
});

describe('import of pre-theming exports (hex colors)', () => {
  it('converts phase, item and assignee colors to slots', () => {
    const preTheming = JSON.stringify({
      format: 'roadmaps.v1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      roadmap: {
        id: 'rm1',
        name: 'Antes de los temas',
        startDate: '2026-01-01',
        windowDays: 730,
        rows: [
          {
            id: 'p1',
            name: 'Fase',
            color: '#FACC15',
            expanded: true,
            assigneeId: null,
            notes: '',
            startDate: null,
            endDate: null,
            children: [
              {
                id: 'i1',
                label: 'Tarea',
                color: '#A78BFA',
                startDate: '2026-01-05',
                endDate: '2026-01-20',
                assigneeId: 'as1',
                notes: '',
                dependsOn: [],
                isMilestone: false,
              },
            ],
          },
        ],
      },
      assignees: [{ id: 'as1', name: 'Ana', color: '#34D399' }],
    });

    const { roadmap: back, assignees: backAssignees } = parseImport(preTheming);
    expect(back.rows[0].colorSlot).toBe(6);
    expect(back.rows[0].children[0].colorSlot).toBe(7);
    expect(backAssignees[0].colorSlot).toBe(9);
  });

  it('snaps a color that was never in the palette to the nearest slot', () => {
    const odd = JSON.stringify({
      format: 'roadmaps.v1',
      roadmap: { name: 'Raro', rows: [{ id: 'p', name: 'F', color: '#21d2ed', children: [] }] },
      assignees: [],
    });
    const { roadmap: back } = parseImport(odd);
    expect(back.rows[0].colorSlot).toBe(0); // nearest to #22D3EE
  });
});

describe('parseImport errors', () => {
  it('rejects invalid JSON and unknown shapes', () => {
    expect(() => parseImport('{not json')).toThrow();
    expect(() => parseImport('{"foo":1}')).toThrow();
  });
});
