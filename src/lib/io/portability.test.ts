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
  baselineDate: null,
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
          blockers: [],
          isMilestone: false,
          completedDate: null,
          endAtCompletion: null,
          baselineEnd: null,
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
          blockers: [],
          isMilestone: false,
          completedDate: null,
          endAtCompletion: null,
          baselineEnd: null,
        },
      ],
    },
  ],
};

describe('export → import round-trip', () => {
  it('preserves structure, dependencies and referenced assignees', () => {
    const json = exportRoadmap(roadmap, assignees, []);
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
    const json = exportRoadmap(roadmap, assignees, []);
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

describe('legacy import (ISO date format, schemaVersion 1)', () => {
  // Shape of the later `roadmap_tool` exports: same fields as the day-index
  // format, but `start`/`end` are already absolute days.
  const isoLegacy = JSON.stringify({
    schemaVersion: 1,
    name: 'Plan',
    assignees: [{ id: 'assg-1', name: 'Sergio Martin', color: '#22D3EE' }],
    rows: [
      {
        id: 'row-1',
        label: 'APP',
        color: '#FB923C',
        expanded: true,
        assigneeId: null,
        notes: '',
        start: null,
        end: null,
        children: [
          {
            id: 'item-1',
            label: 'Wallet en Perfil',
            isMilestone: false,
            completedDate: null,
            endAtCompletion: null,
            baselineEnd: null,
            start: '2026-06-28',
            end: '2026-07-12',
            assigneeId: 'assg-1',
            notes: '',
            dependsOn: [],
          },
          {
            id: 'item-2',
            label: 'Entrega',
            isMilestone: true,
            completedDate: null,
            endAtCompletion: null,
            baselineEnd: null,
            start: '2026-09-20',
            end: '2026-09-20',
            assigneeId: null,
            notes: '',
            dependsOn: ['item-1'],
          },
        ],
      },
    ],
  });

  it('keeps absolute ISO dates instead of collapsing them to the origin', () => {
    const { roadmap: back } = parseImport(isoLegacy);
    const [a, b] = back.rows[0].children;
    expect(a.startDate).toBe('2026-06-28');
    expect(a.endDate).toBe('2026-07-12');
    expect(b.isMilestone).toBe(true);
    expect(b.startDate).toBe('2026-09-20');
    expect(b.endDate).toBe('2026-09-20');
    expect(b.dependsOn).toEqual(['item-1']);
  });

  it('imports the assignees the document declares, so assignments still resolve', () => {
    const { roadmap: back, assignees } = parseImport(isoLegacy);
    expect(assignees).toEqual([{ id: 'assg-1', name: 'Sergio Martin', colorSlot: 0 }]);
    const assigned = back.rows[0].children[0].assigneeId;
    expect(assignees.some((a) => a.id === assigned)).toBe(true);
  });

  it('reads each date by its own value, so a mixed document survives', () => {
    const mixed = JSON.stringify({
      name: 'Mixto',
      rows: [
        {
          id: 'p',
          label: 'Fase',
          children: [
            { id: 'a', label: 'Índice', start: 4, end: 22 },
            { id: 'b', label: 'ISO', start: '2026-03-02', end: '2026-03-16' },
          ],
        },
      ],
    });
    const [a, b] = parseImport(mixed).roadmap.rows[0].children;
    expect([a.startDate, a.endDate]).toEqual(['2026-01-05', '2026-01-23']);
    expect([b.startDate, b.endDate]).toEqual(['2026-03-02', '2026-03-16']);
  });

  it('treats an unreadable date as absent without touching the other items', () => {
    const broken = JSON.stringify({
      name: 'Roto',
      rows: [
        {
          id: 'p',
          label: 'Fase',
          children: [
            { id: 'a', label: 'Malo', start: '01/07/2026', end: 'mañana' },
            { id: 'b', label: 'Bueno', start: '2026-07-01', end: '2026-07-31' },
          ],
        },
      ],
    });
    const [a, b] = parseImport(broken).roadmap.rows[0].children;
    expect(a.startDate).toBe('2026-01-01'); // default for a dateless item
    expect(a.endDate).toBe('2026-01-01');
    expect(b.startDate).toBe('2026-07-01'); // unaffected
    expect(b.endDate).toBe('2026-07-31');
  });
});

describe('timeline window of an imported legacy roadmap', () => {
  const withDates = (start: string, end: string) =>
    JSON.stringify({
      name: 'X',
      rows: [{ id: 'p', label: 'F', children: [{ id: 'a', label: 'I', start, end }] }],
    });

  it('is left at the default when the content fits in it', () => {
    const { roadmap } = parseImport(withDates('2026-06-28', '2026-12-27'));
    expect(roadmap.startDate).toBe('2026-01-01');
    expect(roadmap.windowDays).toBe(730);
  });

  it('starts at the month of the content when it begins before the default', () => {
    const { roadmap } = parseImport(withDates('2025-03-17', '2025-09-30'));
    expect(roadmap.startDate).toBe('2025-03-01');
    expect(roadmap.windowDays).toBe(730); // default already reaches past the end
  });

  it('widens enough to cover content that runs past the default window', () => {
    const { roadmap } = parseImport(withDates('2026-01-05', '2029-06-30'));
    expect(roadmap.startDate).toBe('2026-01-01');
    expect(roadmap.windowDays).toBe(1277); // 2026-01-01 .. 2029-06-30 inclusive
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
        baselineDate: null,
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
                completedDate: null,
                endAtCompletion: null,
                baselineEnd: null,
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

describe('completitud en el intercambio', () => {
  /** The fixture roadmap with a fixed plan and its first item completed. */
  function completed(): Roadmap {
    const rm = structuredClone(roadmap);
    rm.baselineDate = '2026-01-02';
    const a = rm.rows[0].children[0];
    a.completedDate = '2026-02-15';
    a.endAtCompletion = '2026-02-10';
    a.baselineEnd = '2026-01-31';
    return rm;
  }

  it('conserva completitud y línea base en la ida y vuelta', () => {
    const { roadmap: back } = parseImport(exportRoadmap(completed(), assignees, []));
    const a = back.rows[0].children[0];
    expect(back.baselineDate).toBe('2026-01-02');
    expect(a.completedDate).toBe('2026-02-15');
    expect(a.endAtCompletion).toBe('2026-02-10');
    expect(a.baselineEnd).toBe('2026-01-31');
  });

  it('importa sin completitud un documento que no la declara', () => {
    const older = JSON.stringify({
      format: 'roadmaps.v1',
      roadmap: { name: 'Antiguo', rows: [{ id: 'p', name: 'F', children: [{ id: 'i' }] }] },
      assignees: [],
    });
    const { roadmap: back } = parseImport(older);
    expect(back.baselineDate).toBeNull();
    expect(back.rows[0].children[0].completedDate).toBeNull();
    expect(back.rows[0].children[0].baselineEnd).toBeNull();
  });

  it('importa sin completitud un documento en formato heredado', () => {
    const legacy = JSON.stringify({
      name: 'Heredado',
      rows: [{ id: 'p', label: 'F', children: [{ id: 'i', label: 'T', start: 10, end: 20 }] }],
    });
    const { roadmap: back } = parseImport(legacy);
    expect(back.baselineDate).toBeNull();
    expect(back.rows[0].children[0].completedDate).toBeNull();
  });

  it('descompleta al importar un item cuyo predecesor llega pendiente', () => {
    const rm = completed();
    const [a, b] = rm.rows[0].children;
    a.completedDate = null; // el predecesor llega pendiente...
    a.endAtCompletion = null;
    b.dependsOn = [a.id];
    b.completedDate = '2026-03-01'; // ...y el dependiente completado
    b.endAtCompletion = '2026-03-01';

    const { roadmap: back } = parseImport(exportRoadmap(rm, assignees, []));
    expect(back.rows[0].children[1].completedDate).toBeNull();
    expect(back.rows[0].children[1].endAtCompletion).toBeNull();
    expect(back.rows[0].children[0].label).toBe('Tarea 1'); // el resto se importa
  });

  it('importa un item completado sin línea base', () => {
    const rm = completed();
    rm.rows[0].children[0].baselineEnd = null;
    const { roadmap: back } = parseImport(exportRoadmap(rm, assignees, []));
    const a = back.rows[0].children[0];
    expect(a.completedDate).toBe('2026-02-15');
    expect(a.baselineEnd).toBeNull();
  });
});
