import { describe, expect, it } from 'vitest';
import { exportNotice, exportPersonas, ImportError, parsePersonasImport } from './io';
import { computeCapacity } from './capacity';
import { takeSnapshot } from './snapshot';
import { emptyData, type PersonasData } from './model';

const data = (): PersonasData => ({
  ...emptyData(),
  locations: [
    {
      id: 'mad',
      name: 'Madrid',
      active: true,
      holidays: [{ date: '2026-12-08', name: 'Inmaculada' }],
    },
  ],
  teams: [{ id: 't1', name: 'Pagos', description: '', active: true }],
  people: [
    {
      id: 'p1',
      teamId: 't1',
      name: 'Ana',
      roleId: null,
      technologyId: 'tec-app-qa',
      locationId: 'mad',
      hoursPerDay: 8,
      dedication: 50,
      active: true,
    },
  ],
  absences: [
    {
      id: 'a1',
      personId: 'p1',
      type: 'baja',
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      hoursPerDay: null,
      comment: 'gripe',
    },
  ],
  sprints: [
    {
      id: 's1',
      teamId: 't1',
      name: 'Sprint 1',
      startDate: '2026-11-30',
      endDate: '2026-12-11',
      status: 'planificacion',
      plan: null,
      real: null,
      adjustment: null,
      results: [],
      incidentPercentage: 15,
      members: [{ personId: 'p1', dedication: null }],
    },
  ],
});

const capacity = (d: PersonasData) =>
  computeCapacity({
    sprint: d.sprints[0],
    people: d.people,
    locations: d.locations,
    absences: d.absences,
  }).team;

describe('el documento de Personas Hub', () => {
  it('ida y vuelta: los mismos datos y la misma capacidad', () => {
    const back = parsePersonasImport(exportPersonas(data()));
    expect(back).toEqual(data());
    expect(capacity(back)).toEqual(capacity(data()));
  });

  it('un sprint cerrado viaja con su plan y su real', () => {
    const d = data();
    const s = d.sprints[0];
    const active = { ...s, status: 'activo' as const, plan: takeSnapshot(s, d, null) };
    d.sprints[0] = {
      ...active,
      status: 'cerrado',
      real: takeSnapshot(active, d, { hours: -4, reason: 'x' }),
      adjustment: null,
      results: [],
    };
    expect(parsePersonasImport(exportPersonas(d))).toEqual(d);
  });

  it('el aviso dice que lleva datos personales', () => {
    expect(exportNotice()).toBe('contiene datos personales y de ausencias · personas.json');
  });

  it('un documento a medias se rechaza entero', () => {
    const d = data();
    d.absences.push({ ...d.absences[0], id: 'a2', personId: 'nadie' });
    expect(() => parsePersonasImport(exportPersonas(d))).toThrow(ImportError);
  });

  it('un JSON roto o ajeno se rechaza diciendo qué es', () => {
    expect(() => parsePersonasImport('{')).toThrow('no es un JSON válido');
    expect(() =>
      parsePersonasImport(JSON.stringify({ kind: 'tech-lead-hub/links', links: [] })),
    ).toThrow('Links Hub');
    expect(() => parsePersonasImport(JSON.stringify({ hola: 1 }))).toThrow(
      'no es un documento de Personas Hub',
    );
  });
});
