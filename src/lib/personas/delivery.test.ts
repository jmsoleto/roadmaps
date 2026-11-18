import { describe, expect, it } from 'vitest';
import {
  average,
  delivery,
  familyPlanning,
  fmtPoints,
  forecast,
  history,
  sprintDelivery,
} from './delivery';
import { computeCapacity } from './capacity';
import { takeSnapshot, realCapacity } from './snapshot';
import { emptyData, type FamilyResult, type PersonasData, type Person, type Sprint } from './model';
import { normalize } from './normalize';

const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  teamId: 't',
  name: id,
  roleId: null,
  technologyId: 'tec-app-front',
  locationId: 'x',
  hoursPerDay: 8,
  dedication: 100,
  active: true,
  ...over,
});

const people = [
  person('m1', { locationId: 'mad' }),
  person('m2', { locationId: 'mad' }),
  person('m3', { locationId: 'mad', technologyId: 'tec-backend-backend' }),
  person('p4'),
  person('p5'),
  person('p6', { technologyId: 'tec-backend-backend' }),
  person('p7'),
  person('p8'),
  person('ext', { dedication: 0 }),
];

const result = (familyId: string, planned: number, completed: number): FamilyResult => ({
  familyId,
  plannedStories: Math.round(planned / 3),
  plannedPoints: planned,
  completedStories: Math.round(completed / 3),
  completedPoints: completed,
});

function sprint(id: string, start: string, end: string, results: FamilyResult[] = []): Sprint {
  return {
    id,
    teamId: 't',
    name: id,
    startDate: start,
    endDate: end,
    status: 'planificacion',
    incidentPercentage: 15,
    members: people.map((p) => ({ personId: p.id, dedication: null })),
    plan: null,
    real: null,
    adjustment: null,
    results,
  };
}

function base(): PersonasData {
  return {
    ...emptyData(),
    locations: [
      {
        id: 'mad',
        name: 'Madrid',
        active: true,
        holidays: [{ date: '2026-12-08', name: 'Inmaculada' }],
      },
      { id: 'x', name: 'Otra', active: true, holidays: [] },
    ],
    teams: [{ id: 't', name: 'Pagos', description: '', active: true }],
    people,
    absences: [
      {
        id: 'a1',
        personId: 'p4',
        type: 'vacaciones',
        startDate: '2026-11-30',
        endDate: '2026-12-04',
        hoursPerDay: null,
        comment: '',
      },
      {
        id: 'a2',
        personId: 'p5',
        type: 'vacaciones',
        startDate: '2026-12-09',
        endDate: '2026-12-11',
        hoursPerDay: null,
        comment: '',
      },
    ],
    sprints: [],
  };
}

/** Plan and close a sprint the way the store does, with what happened in between. */
function close(data: PersonasData, s: Sprint, during: () => void): Sprint {
  const active: Sprint = { ...s, status: 'activo', plan: takeSnapshot(s, data, null) };
  during();
  const closed: Sprint = { ...active, status: 'cerrado', real: takeSnapshot(active, data, null) };
  data.sprints.push(closed);
  return closed;
}

describe('cifras de entrega', () => {
  it('26 comprometidos, 22 terminados con 408 h reales: 84,6 %, 22 SP y 5,4 SP/100 h', () => {
    const d = delivery(
      { plannedStories: 9, plannedPoints: 26, completedStories: 8, completedPoints: 22 },
      408,
    );
    expect(d.completion).toBeCloseTo(0.846, 3);
    expect(d.completedPoints).toBe(22);
    expect(d.productivity).toBeCloseTo(5.39, 2);
  });

  it('sin nada comprometido o sin horas, la cifra no está disponible', () => {
    expect(
      delivery(
        { plannedStories: 0, plannedPoints: 0, completedStories: 2, completedPoints: 5 },
        100,
      ).completion,
    ).toBe(null);
    expect(
      delivery({ plannedStories: 1, plannedPoints: 3, completedStories: 1, completedPoints: 3 }, 0)
        .productivity,
    ).toBe(null);
  });

  it('las horas de una familia son las de sus personas, menos su parte de la reserva', () => {
    const data = base();
    const c = computeCapacity({
      sprint: sprint('s', '2026-11-30', '2026-12-11'),
      people,
      locations: data.locations,
      absences: data.absences,
    });
    // BACKEND: m3 (72 h, Madrid) and p6 (80 h), at 85 %.
    expect(familyPlanning(c, data.technologies, 'tec-backend')).toBeCloseTo((72 + 80) * 0.85, 9);
    const app = familyPlanning(c, data.technologies, 'tec-app');
    expect(app + familyPlanning(c, data.technologies, 'tec-backend')).toBeCloseTo(
      c.team.planning,
      9,
    );
  });

  it('el total es la suma de las familias', () => {
    const data = base();
    const c = computeCapacity({
      sprint: sprint('s', '2026-11-30', '2026-12-11'),
      people,
      locations: data.locations,
      absences: data.absences,
    });
    const out = sprintDelivery(
      [result('tec-app', 18, 15), result('tec-backend', 8, 7)],
      c,
      data.technologies,
    );
    expect(out.total.plannedPoints).toBe(26);
    expect(out.total.completedPoints).toBe(22);
    expect(out.families.map((f) => f.familyId)).toEqual(['tec-app', 'tec-backend']);
  });
});

describe('histórico y forecast', () => {
  /** One closed sprint with 408 real plannable hours (480 available): p6 off nine days. */
  function withOneClosed() {
    const data = base();
    const s1 = sprint('Sprint 18', '2026-11-30', '2026-12-11', [
      result('tec-app', 18, 15),
      result('tec-backend', 8, 7),
    ]);
    close(data, s1, () =>
      data.absences.push({
        id: 'b',
        personId: 'p6',
        type: 'baja',
        startDate: '2026-11-30',
        endDate: '2026-12-10',
        hoursPerDay: null,
        comment: '',
      }),
    );
    return data;
  }

  it('el sprint cerrado tiene 408 h planificables reales', () => {
    const data = withOneClosed();
    expect(realCapacity(data.sprints[0], data).team.planning).toBeCloseTo(408, 9);
  });

  it('la regla de tres del PRD: 22 SP con 408 h, el nuevo con 469,2 h → 25,3', () => {
    const data = withOneClosed();
    const next = sprint('Sprint 19', '2026-12-14', '2026-12-25');
    const cap = computeCapacity({
      sprint: sprint('x', '2026-11-30', '2026-12-11'),
      people,
      locations: data.locations,
      absences: base().absences,
    });
    expect(cap.team.planning).toBeCloseTo(469.2, 9);
    const f = forecast(data, next, cap)!;
    expect(f.last.value).toBeCloseTo((22 * 469.2) / 408, 9);
    expect(fmtPoints(f.last.value)).toBe('~25 SP (25,3)');
    expect(f.last.bases).toEqual([
      { sprintId: 'Sprint 18', name: 'Sprint 18', points: 22, hours: expect.closeTo(408, 9) },
    ]);
    // With a single sprint the means are the rule of three.
    expect(f.avg3.value).toBeCloseTo(f.last.value, 9);
    expect(f.families.map((x) => x.familyId)).toEqual(['tec-app', 'tec-backend']);
  });

  it('la media es el cociente de las sumas, no la media de los cocientes', () => {
    const data = withOneClosed();
    const s2 = sprint('Sprint 19', '2026-12-14', '2026-12-25', [result('tec-app', 30, 30)]);
    close(data, s2, () => {});
    const rows = history(data, 't');
    expect(rows.map((r) => r.sprint.name)).toEqual(['Sprint 19', 'Sprint 18']);
    const next = sprint('Sprint 20', '2027-01-04', '2027-01-15');
    const cap = computeCapacity({ sprint: next, people, locations: data.locations, absences: [] });
    const f = forecast(data, next, cap)!;
    const hours = rows.reduce((n, r) => n + r.delivery.total.realPlanning, 0);
    expect(f.avg3.value).toBeCloseTo(((30 + 22) * cap.team.planning) / hours, 9);
    expect(f.avg3.bases).toHaveLength(2);
    expect(average(rows, 5)!.count).toBe(2);
  });

  it('sin sprints cerrados con SP no se propone nada', () => {
    const data = base();
    const next = sprint('Sprint 1', '2026-11-30', '2026-12-11');
    const cap = computeCapacity({ sprint: next, people, locations: data.locations, absences: [] });
    expect(forecast(data, next, cap)).toBe(null);
  });

  it('un sprint cerrado que termina después de que empiece el nuevo no cuenta', () => {
    const data = withOneClosed();
    const early = sprint('Antes', '2026-12-07', '2026-12-18');
    const cap = computeCapacity({ sprint: early, people, locations: data.locations, absences: [] });
    expect(forecast(data, early, cap)).toBe(null);
  });
});

describe('leer resultados', () => {
  it('descarta familias que no existen y números negativos; en estricto, rechaza', () => {
    const data = base();
    const s = sprint('s', '2026-11-30', '2026-12-11', [result('tec-app', 10, 8)]);
    data.sprints.push(s);
    const raw = JSON.parse(JSON.stringify(data));
    expect(normalize(raw, true).sprints[0].results).toEqual(s.results);
    raw.sprints[0].results.push(
      { familyId: 'nada', plannedPoints: 1 },
      { familyId: 'tec-web', plannedPoints: -1 },
    );
    expect(normalize(raw).sprints[0].results).toEqual(s.results);
    expect(() => normalize(raw, true)).toThrow();
  });
});
