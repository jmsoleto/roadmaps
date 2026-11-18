import { describe, expect, it } from 'vitest';
import { computeCapacity, sprintDays, type CapacityInput } from './capacity';
import type { Absence, Location, Person } from './model';

// 2026-11-30 is a Monday; 2026-12-11 the Friday of the following week.
const START = '2026-11-30';
const END = '2026-12-11';

const madrid: Location = {
  id: 'mad',
  name: 'Madrid',
  active: true,
  holidays: [{ date: '2026-12-08', name: 'Inmaculada' }],
};
const sevilla: Location = {
  id: 'sev',
  name: 'Sevilla',
  active: true,
  holidays: [{ date: '2026-12-02', name: 'Fiesta local' }],
};
const nowhere: Location = { id: 'x', name: 'Sin festivos', active: true, holidays: [] };

function person(id: string, over: Partial<Person> = {}): Person {
  return {
    id,
    teamId: 't',
    name: id,
    roleId: null,
    technologyId: null,
    locationId: 'x',
    hoursPerDay: 8,
    dedication: 100,
    active: true,
    ...over,
  };
}

let seq = 0;
function absence(
  personId: string,
  start: string,
  end: string,
  over: Partial<Absence> = {},
): Absence {
  return {
    id: `a${++seq}`,
    personId,
    type: 'vacaciones',
    startDate: start,
    endDate: end,
    hoursPerDay: null,
    comment: '',
    ...over,
  };
}

function input(
  people: Person[],
  absences: Absence[] = [],
  over: Partial<CapacityInput['sprint']> = {},
): CapacityInput {
  return {
    sprint: {
      startDate: START,
      endDate: END,
      incidentPercentage: 0,
      members: people.map((p) => ({ personId: p.id, dedication: null })),
      ...over,
    },
    people,
    locations: [madrid, sevilla, nowhere],
    absences,
  };
}

const only = (i: CapacityInput) => computeCapacity(i).people[0];

describe('los días de un sprint', () => {
  it('cuenta del inicio al fin, ambos incluidos', () => {
    expect(sprintDays(START, END)).toHaveLength(12);
  });

  it('dos semanas son diez días laborables y el fin de semana no tiene horas', () => {
    const p = only(input([person('ana')]));
    expect(p.days.filter((d) => d.state !== 'finde')).toHaveLength(10);
    const weekend = p.days.filter((d) => d.state === 'finde');
    expect(weekend.map((d) => d.date)).toEqual(['2026-12-05', '2026-12-06']);
    expect(weekend.every((d) => d.theoretical === 0 && d.net === 0)).toBe(true);
  });

  it('jornada completa: 10 días de 8 horas son 80 teóricas', () => {
    expect(only(input([person('ana')])).totals.theoretical).toBe(80);
  });
});

describe('festivos', () => {
  it('un festivo de su localidad deja el día en 0 y lo nombra', () => {
    const p = only(input([person('ana', { locationId: 'mad' })]));
    const day = p.days.find((d) => d.date === '2026-12-08')!;
    expect(day.state).toBe('festivo');
    expect(day.net).toBe(0);
    expect(day.cause).toEqual({ kind: 'festivo', name: 'Inmaculada' });
    expect(p.totals.holiday).toBe(8);
    expect(p.totals.available).toBe(72);
  });

  it('un festivo de otra localidad no le afecta', () => {
    const p = only(input([person('ana', { locationId: 'mad' })]));
    expect(p.days.find((d) => d.date === '2026-12-02')!.state).toBe('disponible');
  });

  it('sin localidad no hay festivos', () => {
    expect(only(input([person('ana', { locationId: null })])).totals.holiday).toBe(0);
  });
});

describe('ausencias', () => {
  it('una parcial de 4 horas sobre 8 deja 4 antes de la dedicación', () => {
    const p = only(
      input(
        [person('ana', { dedication: 50 })],
        [absence('ana', '2026-12-01', '2026-12-01', { hoursPerDay: 4 })],
      ),
    );
    const day = p.days.find((d) => d.date === '2026-12-01')!;
    expect(day.state).toBe('parcial');
    expect(day.net).toBe(4);
  });

  it('dos días de vacaciones dejan 64 de 80, y al 50 % son 32', () => {
    const p = only(
      input([person('ana', { dedication: 50 })], [absence('ana', '2026-12-01', '2026-12-02')]),
    );
    expect(p.totals.absence).toBe(16);
    expect(p.totals.theoretical - p.totals.absence).toBe(64);
    expect(p.totals.available).toBe(32);
    expect(p.totals.dedication).toBe(32);
  });

  it('una parcial mayor que la jornada deja el día en 0, no en negativo', () => {
    const p = only(
      input([person('ana')], [absence('ana', '2026-12-01', '2026-12-01', { hoursPerDay: 10 })]),
    );
    const day = p.days.find((d) => d.date === '2026-12-01')!;
    expect(day.net).toBe(0);
    expect(day.absence).toBe(8);
    expect(day.state).toBe('ausencia');
  });

  it('una ausencia que cruza el fin de semana solo descuenta los laborables', () => {
    const p = only(input([person('ana')], [absence('ana', '2026-12-04', '2026-12-07')]));
    expect(p.totals.absence).toBe(16);
  });

  it('una ausencia fuera del sprint no cuenta', () => {
    expect(
      only(input([person('ana')], [absence('ana', '2026-12-14', '2026-12-18')])).totals.absence,
    ).toBe(0);
  });

  it('la causa del día es el tipo de la ausencia', () => {
    const p = only(
      input([person('ana')], [absence('ana', '2026-12-03', '2026-12-03', { type: 'baja' })]),
    );
    expect(p.days.find((d) => d.date === '2026-12-03')!.cause).toMatchObject({
      kind: 'ausencia',
      type: 'baja',
    });
  });
});

describe('un día no se descuenta dos veces', () => {
  it('vacaciones de lunes a viernes y una formación de 3 horas el miércoles: una jornada', () => {
    const p = only(
      input(
        [person('ana')],
        [
          absence('ana', '2026-11-30', '2026-12-04'),
          absence('ana', '2026-12-02', '2026-12-02', { type: 'formacion', hoursPerDay: 3 }),
        ],
      ),
    );
    expect(p.days.find((d) => d.date === '2026-12-02')!.absence).toBe(8);
    expect(p.totals.absence).toBe(40);
  });

  it('dos parciales el mismo día cuentan la mayor', () => {
    const p = only(
      input(
        [person('ana')],
        [
          absence('ana', '2026-12-01', '2026-12-01', { hoursPerDay: 2 }),
          absence('ana', '2026-12-01', '2026-12-01', { hoursPerDay: 5, type: 'permiso' }),
        ],
      ),
    );
    const day = p.days.find((d) => d.date === '2026-12-01')!;
    expect(day.absence).toBe(5);
    expect(day.cause).toMatchObject({ type: 'permiso' });
  });

  it('vacaciones que incluyen un festivo: ese día cuenta como festivo', () => {
    const p = only(
      input([person('ana', { locationId: 'mad' })], [absence('ana', '2026-12-07', '2026-12-09')]),
    );
    expect(p.days.find((d) => d.date === '2026-12-08')!.state).toBe('festivo');
    expect(p.totals.holiday).toBe(8);
    expect(p.totals.absence).toBe(16);
  });
});

describe('dedicación', () => {
  it('se aplica después de festivos y ausencias', () => {
    const p = only(input([person('ana', { locationId: 'mad', dedication: 50 })]));
    expect(p.totals.available).toBe(36);
    expect(p.totals.dedication).toBe(36);
  });

  it('la del sprint sustituye a la de por defecto, solo en ese sprint', () => {
    const ana = person('ana');
    const own = computeCapacity(
      input([ana], [], { members: [{ personId: 'ana', dedication: 50 }] }),
    ).people[0];
    expect(own.overridden).toBe(true);
    expect(own.totals.available).toBe(40);
    expect(only(input([ana])).totals.available).toBe(80);
  });

  it('con decimales no redondea: 33,3 % de 80 son 26,64', () => {
    expect(only(input([person('ana', { dedication: 33.3 })])).totals.available).toBeCloseTo(
      26.64,
      10,
    );
  });
});

describe('el equipo y la reserva de incidencias', () => {
  it('400 horas con un 15 % de reserva dejan 340 planificables', () => {
    // Five people at 8 hours over 10 days: 400 h.
    const people = ['a', 'b', 'c', 'd', 'e'].map((id) => person(id));
    const { team } = computeCapacity(input(people, [], { incidentPercentage: 15 }));
    expect(team.available).toBe(400);
    expect(team.reserve).toBeCloseTo(60, 10);
    expect(team.planning).toBeCloseTo(340, 10);
  });

  it('el resumen del PRD: 720 − 24 − 64 − 80 = 552, y con un 15 % 469,2', () => {
    // Nine people at 8 h over 10 days = 720 h. Three in Madrid lose the 8th
    // (24 h). Eight days of absences (64 h). One person at 0 % with no
    // absences or holidays loses her whole 80 h to the dedication.
    const people = [
      person('m1', { locationId: 'mad' }),
      person('m2', { locationId: 'mad' }),
      person('m3', { locationId: 'mad' }),
      person('p4'),
      person('p5'),
      person('p6'),
      person('p7'),
      person('p8'),
      person('ext', { dedication: 0 }),
    ];
    const absences = [
      absence('p4', '2026-11-30', '2026-12-04'), // 40 h
      absence('p5', '2026-12-09', '2026-12-11'), // 24 h
    ];
    const { team } = computeCapacity(input(people, absences, { incidentPercentage: 15 }));
    expect(team.theoretical).toBe(720);
    expect(team.holiday).toBe(24);
    expect(team.absence).toBe(64);
    expect(team.dedication).toBe(80);
    expect(team.available).toBe(552);
    expect(team.planning).toBeCloseTo(469.2, 10);
  });

  it('un participante que ya no existe no cuenta', () => {
    const i = input([person('ana')]);
    i.sprint.members.push({ personId: 'fantasma', dedication: null });
    expect(computeCapacity(i).people).toHaveLength(1);
  });
});

// ---- properties ----

/** A small deterministic generator, so a failing case can be replayed. */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function randomCase(seed: number): CapacityInput {
  const r = prng(seed);
  const days = sprintDays(START, END);
  const locs = ['mad', 'sev', 'x', null];
  const people = Array.from({ length: 1 + Math.floor(r() * 6) }, (_, i) =>
    person(`p${i}`, {
      hoursPerDay: [4, 6, 7.5, 8][Math.floor(r() * 4)],
      dedication: Math.round(r() * 1000) / 10,
      locationId: locs[Math.floor(r() * locs.length)],
    }),
  );
  const absences: Absence[] = [];
  for (let i = 0; i < Math.floor(r() * 8); i++) {
    const a = Math.floor(r() * days.length);
    const b = Math.min(days.length - 1, a + Math.floor(r() * 4));
    absences.push(
      absence(people[Math.floor(r() * people.length)].id, days[a], days[b], {
        hoursPerDay: r() < 0.5 ? null : 1 + Math.floor(r() * 10),
      }),
    );
  }
  const members = people.map((p) => ({
    personId: p.id,
    dedication: r() < 0.3 ? Math.round(r() * 100) : null,
  }));
  return input(people, absences, { incidentPercentage: Math.round(r() * 40), members });
}

describe('propiedades del cálculo', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => i + 1);

  it('nunca da una cifra negativa', () => {
    for (const seed of seeds) {
      const c = computeCapacity(randomCase(seed));
      for (const p of c.people) {
        for (const d of p.days) expect(d.net).toBeGreaterThanOrEqual(0);
        for (const v of Object.values(p.totals)) expect(v).toBeGreaterThanOrEqual(-1e-9);
      }
      expect(c.team.planning).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('las cifras cuadran: teóricas − descuentos = disponible', () => {
    for (const seed of seeds) {
      const c = computeCapacity(randomCase(seed));
      for (const t of [...c.people.map((p) => p.totals), c.team]) {
        expect(t.theoretical - t.holiday - t.absence - t.dedication).toBeCloseTo(t.available, 9);
      }
      expect(c.team.available - c.team.reserve).toBeCloseTo(c.team.planning, 9);
    }
  });

  it('añadir una ausencia nunca aumenta la capacidad', () => {
    for (const seed of seeds) {
      const base = randomCase(seed);
      const before = computeCapacity(base).team.available;
      const extra = {
        ...base,
        absences: [...base.absences, absence(base.people[0].id, '2026-12-03', '2026-12-04')],
      };
      expect(computeCapacity(extra).team.available).toBeLessThanOrEqual(before + 1e-9);
    }
  });

  it('subir la reserva nunca aumenta lo planificable', () => {
    for (const seed of seeds) {
      const base = randomCase(seed);
      const before = computeCapacity(base).team.planning;
      const more = {
        ...base,
        sprint: { ...base.sprint, incidentPercentage: base.sprint.incidentPercentage + 10 },
      };
      expect(computeCapacity(more).team.planning).toBeLessThanOrEqual(before + 1e-9);
    }
  });
});

describe('rendimiento', () => {
  it('100 personas y 31 días en menos de 500 ms', () => {
    const people = Array.from({ length: 100 }, (_, i) =>
      person(`p${i}`, { locationId: i % 2 ? 'mad' : 'sev' }),
    );
    const absences = people.flatMap((p, i) => [
      absence(p.id, '2026-12-01', '2026-12-03'),
      absence(p.id, '2026-12-10', '2026-12-10', { hoursPerDay: (i % 7) + 1 }),
    ]);
    const t0 = performance.now();
    const c = computeCapacity(
      input(people, absences, { startDate: '2026-12-01', endDate: '2026-12-31' }),
    );
    expect(performance.now() - t0).toBeLessThan(500);
    expect(c.days).toHaveLength(31);
  });
});
