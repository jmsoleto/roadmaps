import { describe, expect, it } from 'vitest';
import {
  capacityFromSnapshot,
  compare,
  planCapacity,
  realAbsences,
  realCapacity,
  takeSnapshot,
} from './snapshot';
import { computeCapacity } from './capacity';
import { emptyData, type PersonasData, type Person, type Sprint } from './model';
import { normalize } from './normalize';

const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  teamId: 't',
  name: id,
  roleId: null,
  technologyId: null,
  locationId: 'mad',
  hoursPerDay: 8,
  dedication: 100,
  active: true,
  ...over,
});

/** The PRD's sprint: 720 − 24 − 64 − 80 = 552, and 469,2 with a 15 % reserve. */
function prd(): { data: PersonasData; sprint: Sprint } {
  const people = [
    person('m1'),
    person('m2'),
    person('m3'),
    person('p4', { locationId: 'x' }),
    person('p5', { locationId: 'x' }),
    person('p6', { locationId: 'x' }),
    person('p7', { locationId: 'x' }),
    person('p8', { locationId: 'x' }),
    person('ext', { locationId: 'x', dedication: 0 }),
  ];
  const sprint: Sprint = {
    id: 's',
    teamId: 't',
    name: 'Sprint 19',
    startDate: '2026-11-30',
    endDate: '2026-12-11',
    status: 'planificacion',
    incidentPercentage: 15,
    members: people.map((p) => ({ personId: p.id, dedication: null })),
    plan: null,
    real: null,
    adjustment: null,
    results: [],
  };
  const data: PersonasData = {
    ...emptyData(),
    locations: [
      {
        id: 'mad',
        name: 'Madrid',
        active: true,
        holidays: [
          { date: '2026-12-08', name: 'Inmaculada' },
          { date: '2027-01-06', name: 'Reyes' },
        ],
      },
      { id: 'x', name: 'Otra', active: true, holidays: [] },
    ],
    teams: [
      {
        id: 't',
        name: 'Pagos',
        description: '',
        active: true,
        criticalRoleIds: [],
        dropThreshold: 20,
      },
    ],
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
      {
        id: 'lejos',
        personId: 'p6',
        type: 'vacaciones',
        startDate: '2027-02-01',
        endDate: '2027-02-05',
        hoursPerDay: null,
        comment: '',
      },
    ],
    sprints: [sprint],
  };
  return { data, sprint };
}

function activate() {
  const { data, sprint } = prd();
  const active: Sprint = { ...sprint, status: 'activo', plan: takeSnapshot(sprint, data, null) };
  data.sprints = [active];
  return { data, sprint: active };
}

describe('congelar el plan', () => {
  it('guarda solo lo que toca el sprint, y la cifra que se vio', () => {
    const { sprint } = activate();
    const plan = sprint.plan!;
    expect(plan.totals.planning).toBeCloseTo(469.2, 10);
    expect(plan.absences.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(plan.locations.find((l) => l.id === 'mad')!.holidays).toEqual([
      { date: '2026-12-08', name: 'Inmaculada' },
    ]);
    expect(plan.members.every((m) => typeof m.dedication === 'number')).toBe(true);
  });

  it('recalcular desde el snapshot da lo mismo que se vio', () => {
    const { sprint } = activate();
    const c = capacityFromSnapshot(sprint.plan!);
    for (const [k, v] of Object.entries(sprint.plan!.totals)) {
      expect(c.team[k as keyof typeof c.team]).toBeCloseTo(v, 10);
    }
  });

  it('editar personas, ausencias y festivos después no cambia el plan', () => {
    const { data, sprint } = activate();
    const before = planCapacity(sprint)!;
    data.people[0].hoursPerDay = 4;
    data.absences.push({
      id: 'nueva',
      personId: 'm1',
      type: 'baja',
      startDate: '2026-12-01',
      endDate: '2026-12-03',
      hoursPerDay: null,
      comment: '',
    });
    data.locations[0].holidays = [];
    const after = planCapacity(sprint)!;
    expect(after.team).toEqual(before.team);
    expect(after.people[0].days).toEqual(before.people[0].days);
  });
});

describe('lo real de un sprint activo', () => {
  it('una baja imprevista de tres días baja lo real 24 horas y no toca el plan', () => {
    const { data, sprint } = activate();
    data.absences.push({
      id: 'baja',
      personId: 'p6',
      type: 'baja',
      startDate: '2026-12-01',
      endDate: '2026-12-03',
      hoursPerDay: null,
      comment: '',
    });
    expect(realCapacity(sprint, data).team.available).toBe(552 - 24);
    expect(planCapacity(sprint)!.team.available).toBe(552);
  });

  it('cambiar la dedicación en el sprint solo cambia lo real', () => {
    const { data, sprint } = activate();
    sprint.members.find((m) => m.personId === 'p6')!.dedication = 50;
    expect(realCapacity(sprint, data).team.available).toBe(552 - 40);
    expect(planCapacity(sprint)!.team.available).toBe(552);
  });

  it('el ajuste se suma a lo disponible y no lo deja bajo cero', () => {
    const { data, sprint } = activate();
    sprint.adjustment = { hours: -16, reason: 'incidencia de pagos' };
    const r = realCapacity(sprint, data).team;
    expect(r.available).toBe(536);
    expect(r.adjustment).toBe(-16);
    expect(r.adjustmentReason).toBe('incidencia de pagos');
    sprint.adjustment = { hours: -10_000, reason: 'todo' };
    const z = realCapacity(sprint, data).team;
    expect(z.available).toBe(0);
    expect(z.theoretical - z.holiday - z.absence - z.dedication + z.adjustment).toBeCloseTo(0, 9);
  });

  it('en planificación, lo real es el cálculo de siempre', () => {
    const { data, sprint } = prd();
    expect(realCapacity(sprint, data).team).toEqual(
      computeCapacity({
        sprint,
        people: data.people,
        locations: data.locations,
        absences: data.absences,
      }).team,
    );
  });
});

describe('cerrar', () => {
  it('lo real queda congelado con su ajuste', () => {
    const { data, sprint } = activate();
    sprint.adjustment = { hours: -16, reason: 'incidencia' };
    const closed: Sprint = {
      ...sprint,
      status: 'cerrado',
      real: takeSnapshot(
        sprint,
        data,
        sprint.adjustment,
        sprint.plan!.members.map((m) => m.personId),
      ),
      adjustment: null,
      results: [],
    };
    const before = realCapacity(closed, data).team;
    data.absences.push({
      id: 'tarde',
      personId: 'p7',
      type: 'baja',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      hoursPerDay: null,
      comment: '',
    });
    expect(realCapacity(closed, data).team).toEqual(before);
    expect(before.available).toBe(536);
  });
});

describe('planificado frente a real', () => {
  it('469,2 planificadas, una baja de dos días: 455,6 reales y −13,6', () => {
    const { data, sprint } = activate();
    data.absences.push({
      id: 'baja',
      personId: 'p6',
      type: 'baja',
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      hoursPerDay: null,
      comment: '',
    });
    const cmp = compare(
      planCapacity(sprint)!,
      realCapacity(sprint, data),
      sprint.plan!.absences,
      realAbsences(sprint, data),
    );
    const planning = cmp.lines.find((l) => l.line === 'planning')!;
    expect(planning.plan).toBeCloseTo(469.2, 9);
    expect(planning.real).toBeCloseTo(455.6, 9);
    expect(planning.delta).toBeCloseTo(-13.6, 9);
    expect(cmp.appeared.map((a) => a.id)).toEqual(['baja']);
    expect(cmp.withdrawn).toEqual([]);
    expect(cmp.people.find((p) => p.personId === 'p6')!.delta).toBe(-16);
  });

  it('una ausencia que se alarga aparece retirada y sobrevenida', () => {
    const { data, sprint } = activate();
    data.absences.find((a) => a.id === 'a2')!.startDate = '2026-12-07';
    const cmp = compare(
      planCapacity(sprint)!,
      realCapacity(sprint, data),
      sprint.plan!.absences,
      realAbsences(sprint, data),
    );
    expect(cmp.withdrawn.map((a) => a.startDate)).toEqual(['2026-12-09']);
    expect(cmp.appeared.map((a) => a.startDate)).toEqual(['2026-12-07']);
  });
});

describe('leer snapshots', () => {
  it('ida y vuelta por normalize', () => {
    const { data } = activate();
    const back = normalize(JSON.parse(JSON.stringify(data)), true);
    expect(back.sprints[0]).toEqual(data.sprints[0]);
  });

  it('un activo sin plan legible vuelve a planificación; en estricto se rechaza', () => {
    const { data } = activate();
    const raw = JSON.parse(JSON.stringify(data));
    raw.sprints[0].plan.members[0].dedication = 'mucha';
    expect(normalize(raw).sprints[0].status).toBe('planificacion');
    expect(normalize(raw).sprints[0].plan).toBe(null);
    expect(() => normalize(raw, true)).toThrow();
  });

  it('un cerrado sin real se queda activo', () => {
    const { data } = activate();
    const raw = JSON.parse(JSON.stringify(data));
    raw.sprints[0].status = 'cerrado';
    expect(normalize(raw).sprints[0].status).toBe('activo');
  });
});
