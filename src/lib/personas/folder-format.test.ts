import { describe, expect, it } from 'vitest';
import { CATALOG_FILE, ORDER_FILE, PERSONAS_FORMAT, fileFor } from './folder-format';
import { MARKER_FILE } from '../folder/marker';
import { emptyData, type PersonasData } from './model';
import { takeSnapshot } from './snapshot';

const data = (): PersonasData => ({
  ...emptyData(),
  roles: [{ id: 'rol-1', name: 'QA', active: true }],
  locations: [
    {
      id: 'loc-1',
      name: 'Madrid',
      active: true,
      holidays: [{ date: '2026-12-08', name: 'Inmaculada' }],
    },
  ],
  teams: [
    {
      id: 'team-1-aaaaa',
      name: 'Pagos',
      description: '',
      active: true,
      criticalRoleIds: [],
      dropThreshold: 20,
    },
    {
      id: 'team-2-bbbbb',
      name: 'Plataforma',
      description: 'infra',
      active: true,
      criticalRoleIds: [],
      dropThreshold: 20,
    },
  ],
  people: [
    {
      id: 'per-1',
      teamId: 'team-1-aaaaa',
      name: 'Ana',
      roleId: 'rol-1',
      technologyId: 'tec-app-qa',
      locationId: 'loc-1',
      hoursPerDay: 8,
      dedication: 50,
      active: true,
    },
    {
      id: 'per-2',
      teamId: 'team-2-bbbbb',
      name: 'Luis',
      roleId: null,
      technologyId: null,
      locationId: null,
      hoursPerDay: 7.5,
      dedication: 100,
      active: true,
    },
  ],
  absences: [
    {
      id: 'aus-1',
      personId: 'per-1',
      type: 'baja',
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      hoursPerDay: null,
      comment: '',
    },
  ],
  sprints: [
    {
      id: 'sprint-2-x',
      teamId: 'team-1-aaaaa',
      name: 'Sprint 2',
      startDate: '2026-12-14',
      endDate: '2026-12-25',
      status: 'planificacion',
      plan: null,
      real: null,
      adjustment: null,
      results: [
        {
          familyId: 'tec-app',
          plannedStories: 6,
          plannedPoints: 18,
          completedStories: 0,
          completedPoints: 0,
        },
      ],
      incidentPercentage: 15,
      members: [{ personId: 'per-1', dedication: null }],
    },
    {
      id: 'sprint-1-y',
      teamId: 'team-1-aaaaa',
      name: 'Sprint 1',
      startDate: '2026-11-30',
      endDate: '2026-12-11',
      status: 'planificacion',
      plan: null,
      real: null,
      adjustment: null,
      results: [],
      incidentPercentage: 20,
      members: [{ personId: 'per-1', dedication: 40 }],
    },
  ],
});

const changed = (a: Map<string, string>, b: Map<string, string>) =>
  [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k)).sort();

describe('Personas Hub en la carpeta', () => {
  it('el marcador, el catálogo, el orden, un fichero por equipo y uno por sprint', () => {
    expect([...PERSONAS_FORMAT.serialize(data()).keys()].sort()).toEqual(
      [
        MARKER_FILE,
        CATALOG_FILE,
        ORDER_FILE,
        'team-1-aaaaa.json',
        'team-2-bbbbb.json',
        'sprint-2-x.json',
        'sprint-1-y.json',
      ].sort(),
    );
  });

  it('ida y vuelta: lo que se lee es lo que se escribió, con los sprints por fecha', () => {
    const files = PERSONAS_FORMAT.serialize(data());
    const back = PERSONAS_FORMAT.parse(files);
    expect(back.kind).toBe('ok');
    if (back.kind !== 'ok') return;
    const want = data();
    want.sprints.reverse();
    expect(back.data).toEqual(want);
  });

  it('las personas van en su equipo sin teamId; el sprint conserva el suyo', () => {
    const files = PERSONAS_FORMAT.serialize(data());
    const team = JSON.parse(files.get('team-1-aaaaa.json')!);
    expect(team.people[0].teamId).toBeUndefined();
    expect(team.absences.map((a: { id: string }) => a.id)).toEqual(['aus-1']);
    expect(JSON.parse(files.get('sprint-1-y.json')!).teamId).toBe('team-1-aaaaa');
  });

  it('registrar una ausencia toca solo el fichero del equipo', () => {
    const before = data();
    const after = data();
    after.absences.push({ ...after.absences[0], id: 'aus-2', type: 'vacaciones' });
    expect(changed(PERSONAS_FORMAT.serialize(before), PERSONAS_FORMAT.serialize(after))).toEqual([
      'team-1-aaaaa.json',
    ]);
  });

  it('cambiar la reserva de un sprint toca solo ese sprint', () => {
    const after = data();
    after.sprints[0].incidentPercentage = 10;
    expect(changed(PERSONAS_FORMAT.serialize(data()), PERSONAS_FORMAT.serialize(after))).toEqual([
      'sprint-2-x.json',
    ]);
  });

  it('un sprint con un conflicto de git deja la carpeta ilegible, nombrándolo', () => {
    const files = PERSONAS_FORMAT.serialize(data());
    files.set('sprint-1-y.json', '<<<<<<< HEAD\n{}\n=======\n{}\n>>>>>>> otra\n');
    expect(PERSONAS_FORMAT.parse(files)).toEqual({ kind: 'unreadable', file: 'sprint-1-y.json' });
  });

  it('la misma persona en dos equipos es ilegible', () => {
    const files = PERSONAS_FORMAT.serialize(data());
    const t2 = JSON.parse(files.get('team-2-bbbbb.json')!);
    t2.people[0].id = 'per-1';
    files.set('team-2-bbbbb.json', JSON.stringify(t2));
    expect(PERSONAS_FORMAT.parse(files).kind).toBe('unreadable');
  });

  it('un sprint activo o cerrado lleva sus snapshots, y cerrar toca solo su fichero', () => {
    const before = data();
    const active = {
      ...before.sprints[1],
      status: 'activo' as const,
      plan: takeSnapshot(before.sprints[1], before, null),
    };
    before.sprints[1] = active;
    const after = structuredClone(before);
    after.sprints[1] = {
      ...active,
      status: 'cerrado',
      real: takeSnapshot(active, before, null),
      adjustment: null,
      results: [],
    };
    const files = PERSONAS_FORMAT.serialize(after);
    expect(changed(PERSONAS_FORMAT.serialize(before), files)).toEqual(['sprint-1-y.json']);
    const back = PERSONAS_FORMAT.parse(files);
    expect(back.kind === 'ok' && back.data.sprints.find((x) => x.id === 'sprint-1-y')).toEqual(
      after.sprints[1],
    );
  });

  it('una aplicación nueva cuenta como vacía', () => {
    expect(PERSONAS_FORMAT.isEmpty(emptyData())).toBe(true);
    expect(PERSONAS_FORMAT.isEmpty(data())).toBe(false);
  });

  it('un id raro se escribe en hexadecimal', () => {
    expect(fileFor('team-', 'equipo con espacios')).toMatch(/^team-x[0-9a-f]+\.json$/);
    expect(fileFor('team-', 'team-1-aaaaa')).toBe('team-1-aaaaa.json');
  });
});
