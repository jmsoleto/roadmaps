import { describe, expect, it } from 'vitest';
import { longDay, sprintAlerts } from './alerts';
import { takeSnapshot } from './snapshot';
import { emptyData, type Absence, type PersonasData, type Person, type Sprint } from './model';

const person = (id: string, roleId: string | null, over: Partial<Person> = {}): Person => ({
  id,
  teamId: 't',
  name: id,
  roleId,
  technologyId: null,
  locationId: 'mad',
  hoursPerDay: 8,
  dedication: 100,
  active: true,
  ...over,
});

const off = (
  id: string,
  personId: string,
  start: string,
  end = start,
  hours: number | null = null,
): Absence => ({
  id,
  personId,
  type: 'vacaciones',
  startDate: start,
  endDate: end,
  hoursPerDay: hours,
  comment: '',
});

function sprint(id: string, start: string, end: string, members: string[]): Sprint {
  return {
    id,
    teamId: 't',
    name: id,
    startDate: start,
    endDate: end,
    status: 'planificacion',
    incidentPercentage: 0,
    members: members.map((personId) => ({ personId, dedication: null })),
    plan: null,
    real: null,
    adjustment: null,
    results: [],
  };
}

/** A January sprint: 2027-01-04 is a Monday, the 5th a Tuesday. */
function data(
  over: { critical?: string[]; absences?: Absence[]; people?: Person[] } = {},
): PersonasData {
  const people = over.people ?? [person('ana', 'qa'), person('eva', 'qa'), person('luis', 'dev')];
  return {
    ...emptyData(),
    roles: [
      { id: 'qa', name: 'QA', active: true },
      { id: 'dev', name: 'Desarrollo', active: true },
    ],
    locations: [
      {
        id: 'mad',
        name: 'Madrid',
        active: true,
        holidays: [{ date: '2027-01-06', name: 'Reyes' }],
      },
    ],
    teams: [
      {
        id: 't',
        name: 'Pagos',
        description: '',
        active: true,
        criticalRoleIds: over.critical ?? [],
        dropThreshold: 20,
      },
    ],
    people,
    absences: over.absences ?? [],
    sprints: [
      sprint(
        's',
        '2027-01-04',
        '2027-01-15',
        people.map((p) => p.id),
      ),
    ],
  };
}

const alerts = (d: PersonasData) => sprintAlerts(d.sprints[d.sprints.length - 1], d);

describe('ausencias simultáneas', () => {
  it('dos QA ausentes el 5 de enero', () => {
    const d = data({ absences: [off('a', 'ana', '2027-01-05'), off('b', 'eva', '2027-01-05')] });
    const a = alerts(d).filter((x) => x.kind === 'solapamiento');
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      severity: 'warn',
      message: 'El 5 de enero hay 2 QA ausentes.',
      detail: ['ana', 'eva'],
    });
  });

  it('una ausencia parcial no cuenta', () => {
    const d = data({
      absences: [off('a', 'ana', '2027-01-05'), off('b', 'eva', '2027-01-05', '2027-01-05', 4)],
    });
    expect(alerts(d).filter((x) => x.kind === 'solapamiento')).toEqual([]);
  });
});

describe('cobertura de roles críticos', () => {
  it('todos los QA ausentes con QA crítico: alerta crítica ese día', () => {
    const d = data({
      critical: ['qa'],
      absences: [off('a', 'ana', '2027-01-05'), off('b', 'eva', '2027-01-05')],
    });
    const a = alerts(d).filter((x) => x.kind === 'cobertura');
    // The 6th is a holiday in Madrid, so nobody covers QA that day either.
    expect(a.map((x) => x.message)).toEqual([
      'No hay disponibilidad QA el 5 de enero.',
      'No hay disponibilidad QA el 6 de enero.',
    ]);
    expect(a[0].severity).toBe('critical');
    // Critical first.
    expect(alerts(d)[0].kind).toBe('cobertura');
  });

  it('un festivo y una dedicación del 0 % también dejan sin cobertura', () => {
    const people = [person('ana', 'qa'), person('eva', 'qa', { dedication: 0 })];
    const d = data({ critical: ['qa'], people });
    // The 6th is a holiday in Madrid; Eva is at 0 % every day.
    const a = alerts(d).filter((x) => x.kind === 'cobertura');
    expect(a.map((x) => x.date)).toEqual(['2027-01-06']);
  });

  it('un rol crítico que nadie tiene es una sola alerta', () => {
    const d = data({ critical: ['qa'], people: [person('luis', 'dev')] });
    const a = alerts(d).filter((x) => x.kind === 'cobertura');
    expect(a.map((x) => x.message)).toEqual(['No hay nadie con rol QA en el sprint.']);
  });

  it('un rol no crítico no da alerta de cobertura', () => {
    const d = data({ absences: [off('a', 'ana', '2027-01-05'), off('b', 'eva', '2027-01-05')] });
    expect(alerts(d).filter((x) => x.kind === 'cobertura')).toEqual([]);
  });
});

describe('capacidad reducida', () => {
  /** A previous sprint of three people × 10 days = 240 h, and this one with fewer hours. */
  function withPrevious(absences: Absence[]) {
    const d = data({ absences });
    d.sprints.unshift(sprint('anterior', '2026-12-14', '2026-12-25', ['ana', 'eva', 'luis']));
    return d;
  }

  it('una caída por encima del umbral avisa con su porcentaje', () => {
    // 240 h before; this one: the 6th off for all (−24) and ana off four more days (−32) → 184 h, −23 %.
    const d = withPrevious([off('x', 'ana', '2027-01-11', '2027-01-14')]);
    const a = alerts(d).filter((x) => x.kind === 'capacidad');
    expect(a.map((x) => x.message)).toEqual([
      'La capacidad baja un 23 % respecto al sprint anterior.',
    ]);
  });

  it('una caída dentro del umbral no avisa', () => {
    // Only the holiday: 216 h, −10 %.
    const d = withPrevious([]);
    expect(alerts(d).filter((x) => x.kind === 'capacidad')).toEqual([]);
  });

  it('del anterior cuenta su plan, si lo tiene', () => {
    const d = withPrevious([off('x', 'ana', '2027-01-11', '2027-01-14')]);
    const prev = d.sprints[0];
    prev.status = 'activo';
    prev.plan = takeSnapshot(prev, d, null);
    // Shrinking the previous sprint now does not move what it committed to.
    d.absences.push(off('late', 'luis', '2026-12-14', '2026-12-25'));
    expect(alerts(d).filter((x) => x.kind === 'capacidad')).toHaveLength(1);
  });
});

describe('calendario incompleto', () => {
  it('faltan los festivos de 2027 en un sprint que cruza el año', () => {
    const d = data();
    d.locations[0].holidays = [{ date: '2026-12-25', name: 'Navidad' }];
    d.sprints[0] = { ...d.sprints[0], startDate: '2026-12-28', endDate: '2027-01-08' };
    const a = alerts(d).filter((x) => x.kind === 'calendario');
    expect(a.map((x) => x.message)).toEqual(['Faltan festivos de Madrid para 2027.']);
  });

  it('una persona sin localidad es informativa', () => {
    const d = data({ people: [person('ana', 'qa', { locationId: null })] });
    const a = alerts(d).filter((x) => x.kind === 'localidad');
    expect(a).toMatchObject([
      { severity: 'info', message: 'ana no tiene localidad: no se le descuenta ningún festivo.' },
    ]);
  });
});

describe('un sprint cerrado', () => {
  it('no tiene alertas', () => {
    const d = data({
      critical: ['qa'],
      absences: [off('a', 'ana', '2027-01-05'), off('b', 'eva', '2027-01-05')],
    });
    const s = d.sprints[0];
    s.status = 'activo';
    s.plan = takeSnapshot(s, d, null);
    s.status = 'cerrado';
    s.real = takeSnapshot(s, d, null);
    expect(sprintAlerts(s, d)).toEqual([]);
  });
});

it('escribe las fechas como el PRD', () => {
  expect(longDay('2027-01-05')).toBe('5 de enero');
});
