/**
 * Blockers across the export/import boundary: which catalog entries travel,
 * what survives a round-trip, and how dangling assignments are handled.
 */

import { describe, it, expect } from 'vitest';
import { exportRoadmap, parseImport, mergeBlockers } from './portability';
import type { AppData, Blocker, Item, Roadmap } from '../model/types';

const checkout: Blocker = {
  id: 'bl-checkout',
  name: 'Checkout',
  owner: 'Enrique',
  email: 'a@a.com',
};
const legal: Blocker = { id: 'bl-legal', name: 'Legal', owner: 'Marta', email: '' };

function item(id: string, blockers: Item['blockers']): Item {
  return {
    id,
    label: id,
    colorSlot: 0,
    startDate: '2026-01-05',
    endDate: '2026-01-20',
    assigneeId: null,
    notes: '',
    dependsOn: [],
    blockers,
    isMilestone: false,
  };
}

function roadmapWith(children: Item[]): Roadmap {
  return {
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
        children,
      },
    ],
  };
}

describe('export de bloqueos', () => {
  it('solo lleva los bloqueos que el roadmap referencia', () => {
    const rm = roadmapWith([
      item('i1', [{ id: 'ib1', blockerId: 'bl-checkout', feature: 'formulario', resolved: false }]),
    ]);
    const doc = JSON.parse(exportRoadmap(rm, [], [checkout, legal]));
    expect(doc.blockers.map((b: Blocker) => b.id)).toEqual(['bl-checkout']);
  });

  it('no lleva ninguno cuando el roadmap no tiene asignaciones', () => {
    const doc = JSON.parse(exportRoadmap(roadmapWith([item('i1', [])]), [], [checkout, legal]));
    expect(doc.blockers).toEqual([]);
  });
});

describe('round-trip', () => {
  const rm = roadmapWith([
    item('i1', [
      { id: 'ib1', blockerId: 'bl-checkout', feature: 'Formulario de compra', resolved: false },
      { id: 'ib2', blockerId: 'bl-checkout', feature: 'Pasarela 3DS', resolved: true },
    ]),
  ]);

  it('conserva funcionalidad y estado de resolución de cada asignación', () => {
    const { roadmap: back, blockers } = parseImport(exportRoadmap(rm, [], [checkout]));
    expect(blockers).toEqual([checkout]);
    expect(back.rows[0].children[0].blockers).toEqual([
      { id: 'ib1', blockerId: 'bl-checkout', feature: 'Formulario de compra', resolved: false },
      { id: 'ib2', blockerId: 'bl-checkout', feature: 'Pasarela 3DS', resolved: true },
    ]);
  });

  it('las asignaciones siguen resolviéndose contra el catálogo importado', () => {
    const { roadmap: back, blockers } = parseImport(exportRoadmap(rm, [], [checkout]));
    const ids = new Set(blockers.map((b) => b.id));
    expect(back.rows[0].children[0].blockers.every((a) => ids.has(a.blockerId))).toBe(true);
  });
});

describe('documentos sin bloqueos o con asignaciones huérfanas', () => {
  it('un documento de una versión anterior importa sin bloqueos', () => {
    const old = JSON.stringify({
      format: 'roadmaps.v1',
      exportedAt: '2026-01-01T00:00:00.000Z',
      roadmap: {
        name: 'Antiguo',
        startDate: '2026-01-01',
        windowDays: 730,
        rows: [
          {
            id: 'p',
            name: 'F',
            colorSlot: 0,
            children: [
              {
                id: 'i',
                label: 'X',
                startDate: '2026-01-05',
                endDate: '2026-01-20',
                dependsOn: [],
              },
            ],
          },
        ],
      },
      assignees: [],
    });
    const { roadmap: back, blockers } = parseImport(old);
    expect(blockers).toEqual([]);
    expect(back.rows[0].children[0].blockers).toEqual([]);
  });

  it('descarta la asignación cuyo bloqueo el documento no declara', () => {
    const doc = JSON.stringify({
      format: 'roadmaps.v1',
      roadmap: {
        name: 'Con huérfana',
        startDate: '2026-01-01',
        windowDays: 730,
        rows: [
          {
            id: 'p',
            name: 'F',
            colorSlot: 0,
            children: [
              {
                id: 'i',
                label: 'X',
                startDate: '2026-01-05',
                endDate: '2026-01-20',
                dependsOn: [],
                blockers: [
                  { id: 'ib1', blockerId: 'bl-fantasma', feature: 'x', resolved: false },
                  { id: 'ib2', blockerId: 'bl-checkout', feature: 'formulario', resolved: false },
                ],
              },
            ],
          },
        ],
      },
      assignees: [],
      blockers: [checkout],
    });
    const { roadmap: back } = parseImport(doc);
    expect(back.rows[0].children[0].blockers.map((a) => a.blockerId)).toEqual(['bl-checkout']);
  });

  it('un documento heredado importa sin bloqueos y sin error', () => {
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
    const { roadmap: back, blockers } = parseImport(legacy);
    expect(blockers).toEqual([]);
    expect(back.rows[0].children[0].blockers).toEqual([]);
  });
});

describe('mergeBlockers', () => {
  const app = (blockers: Blocker[]): AppData => ({
    roadmaps: [],
    assignees: [],
    blockers,
    activeId: null,
  });

  it('añade los que no existen', () => {
    const data = app([checkout]);
    mergeBlockers(data, [legal]);
    expect(data.blockers.map((b) => b.id)).toEqual(['bl-checkout', 'bl-legal']);
  });

  it('conserva la entrada local cuando el id ya existe', () => {
    const data = app([{ ...checkout, owner: 'Corregido' }]);
    mergeBlockers(data, [checkout]);
    expect(data.blockers).toHaveLength(1);
    expect(data.blockers[0].owner).toBe('Corregido');
  });
});
