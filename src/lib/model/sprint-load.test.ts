import { describe, it, expect } from 'vitest';
import { sprintLoad, UNASSIGNED_NAME } from './sprint-load';
import { sprintRange } from '../time/segments';
import type { Assignee, Item, Phase, Roadmap } from './types';

/*
 * S10 va del lunes 2026-07-13 al domingo 2026-07-26, con diez días laborables:
 * 13-17 de julio y 20-24 de julio. Todas las fechas de aquí abajo se leen contra
 * ese sprint.
 */
const S10 = 10;
const RANGE = sprintRange(S10);

const ANA: Assignee = { id: 'ana', name: 'Ana', colorSlot: 3 };
const BETO: Assignee = { id: 'beto', name: 'Beto', colorSlot: 1 };
const PEOPLE = [ANA, BETO];

function item(o: Partial<Item> & { id: string; startDate: string }): Item {
  return {
    id: o.id,
    label: o.label ?? o.id,
    colorSlot: 0,
    startDate: o.startDate,
    endDate: o.endDate ?? o.startDate,
    assigneeId: o.assigneeId ?? null,
    notes: '',
    dependsOn: [],
    blockers: [],
    isMilestone: o.isMilestone ?? false,
    completedDate: o.completedDate ?? null,
    endAtCompletion: null,
    baselineEnd: null,
  };
}

function phase(o: { id: string; assigneeId?: string | null; children?: Item[] }): Phase {
  return {
    id: o.id,
    name: o.id,
    colorSlot: 0,
    expanded: true,
    assigneeId: o.assigneeId ?? null,
    notes: '',
    startDate: null,
    endDate: null,
    children: o.children ?? [],
  };
}

function roadmap(rows: Phase[], windowDays = 365): Roadmap {
  return {
    id: 'rm',
    name: 'rm',
    colorSlot: 0,
    startDate: '2026-06-29',
    windowDays,
    rows,
    baselineDate: null,
  };
}

const load = (rows: Phase[], people = PEOPLE, windowDays?: number) =>
  sprintLoad(roadmap(rows, windowDays), people, S10);

const daysOf = (l: ReturnType<typeof load>, id: string) =>
  l.phases.flatMap((p) => p.items).find((i) => i.itemId === id)?.days;

describe('el sprint que se mide', () => {
  it('es el del calendario, con sus diez días laborables', () => {
    const l = load([]);
    expect([l.start, l.end]).toEqual([RANGE.start, RANGE.end]);
    expect(l.capacity).toBe(10);
  });
});

describe('el solape en días laborables', () => {
  it('un item que cruza el sprint entero aporta los diez días del sprint', () => {
    const l = load([
      phase({
        id: 'p',
        children: [item({ id: 'a', startDate: '2026-06-01', endDate: '2026-08-31' })],
      }),
    ]);
    expect(daysOf(l, 'a')).toBe(10);
  });

  it('un item que entra a medias aporta solo su parte', () => {
    // Del 20 al 24 de julio: la segunda semana del sprint, cinco laborables.
    const l = load([
      phase({
        id: 'p',
        children: [item({ id: 'a', startDate: '2026-07-20', endDate: '2026-08-10' })],
      }),
    ]);
    expect(daysOf(l, 'a')).toBe(5);
  });

  it('dos semanas naturales dentro del sprint son diez días, no catorce', () => {
    const l = load([
      phase({
        id: 'p',
        children: [item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-26' })],
      }),
    ]);
    expect(daysOf(l, 'a')).toBe(10);
  });

  it('el último día del item cuenta: terminar el viernes de la segunda semana', () => {
    // 13 a 24 de julio son diez laborables; sin el último viernes serían nueve.
    const l = load([
      phase({
        id: 'p',
        children: [item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-24' })],
      }),
    ]);
    expect(daysOf(l, 'a')).toBe(10);
  });

  it('un item que no toca el sprint no aparece', () => {
    const l = load([
      phase({
        id: 'p',
        children: [item({ id: 'a', startDate: '2026-09-01', endDate: '2026-09-30' })],
      }),
    ]);
    expect(l.itemCount).toBe(0);
    expect(l.phases).toEqual([]);
    expect(l.memberItemIds.has('a')).toBe(false);
  });

  it('un item cuyo solape cae entero en fin de semana aparece con cero días', () => {
    // Sáb 18 y dom 19 de julio, dentro del sprint y sin un solo laborable.
    const l = load([
      phase({
        id: 'p',
        children: [item({ id: 'a', startDate: '2026-07-18', endDate: '2026-07-19' })],
      }),
    ]);
    expect(l.memberItemIds.has('a')).toBe(true);
    expect(daysOf(l, 'a')).toBe(0);
  });

  it('un item de un día laborable dentro del sprint aporta uno', () => {
    const l = load([phase({ id: 'p', children: [item({ id: 'a', startDate: '2026-07-14' })] })]);
    expect(daysOf(l, 'a')).toBe(1);
  });
});

describe('la herencia de responsable', () => {
  it('un item sin responsable dentro de una fase que sí tiene uno va a la fase', () => {
    const l = load([
      phase({
        id: 'p',
        assigneeId: ANA.id,
        children: [item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-17' })],
      }),
    ]);
    expect(l.byAssignee).toHaveLength(1);
    expect(l.byAssignee[0]).toMatchObject({ assigneeId: ANA.id, days: 5, anyInherited: true });
  });

  it('el responsable propio manda sobre el de la fase', () => {
    const l = load([
      phase({
        id: 'p',
        assigneeId: ANA.id,
        children: [
          item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-17', assigneeId: BETO.id }),
        ],
      }),
    ]);
    expect(l.byAssignee).toHaveLength(1);
    expect(l.byAssignee[0]).toMatchObject({ assigneeId: BETO.id, days: 5, anyInherited: false });
  });

  it('sin responsable propio ni de fase, el trabajo va a la entrada sin responsable', () => {
    const l = load([
      phase({
        id: 'p',
        children: [item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-17' })],
      }),
    ]);
    expect(l.byAssignee[0]).toMatchObject({ assigneeId: null, name: UNASSIGNED_NAME, days: 5 });
  });

  it('la entrada sin responsable queda siempre al final, lleve los días que lleve', () => {
    const l = load([
      phase({
        id: 'p',
        children: [
          // Sin responsable: dos semanas enteras, el que más días lleva.
          item({ id: 'huerfano', startDate: '2026-07-13', endDate: '2026-07-24' }),
          item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-14', assigneeId: ANA.id }),
        ],
      }),
    ]);
    expect(l.byAssignee.map((r) => r.assigneeId)).toEqual([ANA.id, null]);
    expect(l.byAssignee[1].days).toBe(10);
  });

  it('un id de responsable que no existe cuenta como trabajo sin responsable', () => {
    const l = load([
      phase({
        id: 'p',
        children: [
          item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-17', assigneeId: 'fantasma' }),
        ],
      }),
    ]);
    expect(l.byAssignee[0].assigneeId).toBeNull();
  });
});

describe('el reparto', () => {
  it('tres items simultáneos de la misma persona suman treinta contra diez', () => {
    const three = ['a', 'b', 'c'].map((id) =>
      item({ id, startDate: '2026-07-13', endDate: '2026-07-24', assigneeId: ANA.id }),
    );
    const l = load([phase({ id: 'p', children: three })]);
    expect(l.byAssignee[0]).toMatchObject({ assigneeId: ANA.id, days: 30, over: true });
    expect(l.capacity).toBe(10);
  });

  it('un único item que ocupa el sprint entero suma diez y no avisa de nada', () => {
    const l = load([
      phase({
        id: 'p',
        children: [
          item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-24', assigneeId: ANA.id }),
        ],
      }),
    ]);
    expect(l.byAssignee[0]).toMatchObject({ days: 10, over: false });
  });

  it('ordena de más días a menos', () => {
    const l = load([
      phase({
        id: 'p',
        children: [
          item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-14', assigneeId: ANA.id }),
          item({ id: 'b', startDate: '2026-07-13', endDate: '2026-07-24', assigneeId: BETO.id }),
        ],
      }),
    ]);
    expect(l.byAssignee.map((r) => [r.assigneeId, r.days])).toEqual([
      [BETO.id, 10],
      [ANA.id, 2],
    ]);
  });
});

describe('lo que no suma pero sí aparece', () => {
  it('un hito dentro del sprint se lista con cero días', () => {
    const l = load([
      phase({
        id: 'p',
        children: [
          item({ id: 'h', startDate: '2026-07-16', isMilestone: true, assigneeId: ANA.id }),
        ],
      }),
    ]);
    expect(l.itemCount).toBe(1);
    expect(daysOf(l, 'h')).toBe(0);
    expect(l.byAssignee[0]).toMatchObject({ assigneeId: ANA.id, days: 0, over: false });
  });

  it('una fase sin items no aporta carga aunque tenga fechas y responsable propios', () => {
    const empty = phase({ id: 'vacia', assigneeId: ANA.id });
    empty.startDate = '2026-07-13';
    empty.endDate = '2026-07-24';
    const l = load([empty]);
    expect(l.byAssignee).toEqual([]);
    expect(l.phases).toEqual([]);
    expect(l.memberPhaseIds.has('vacia')).toBe(false);
  });
});

describe('los completados', () => {
  const rows = (done: boolean) => [
    phase({
      id: 'p',
      children: [
        item({
          id: 'a',
          startDate: '2026-07-13',
          endDate: '2026-07-17',
          assigneeId: ANA.id,
          completedDate: done ? '2026-07-17' : null,
        }),
        item({
          id: 'b',
          startDate: '2026-07-20',
          endDate: '2026-07-24',
          assigneeId: ANA.id,
          completedDate: done ? '2026-07-24' : null,
        }),
      ],
    }),
  ];

  it('cuentan igual que si estuvieran abiertos', () => {
    expect(load(rows(true)).byAssignee).toEqual(load(rows(false)).byAssignee);
  });

  it('y además se dice cuántos están cerrados', () => {
    expect(load(rows(true)).completedCount).toBe(2);
    expect(load(rows(false)).completedCount).toBe(0);
    expect(load(rows(true)).itemCount).toBe(2);
  });

  it('cada item dice si está cerrado, para poder atenuarlo', () => {
    expect(load(rows(true)).phases[0].items.every((i) => i.completed)).toBe(true);
  });
});

describe('la ventana del roadmap no cambia lo que vale un sprint', () => {
  it('dos ventanas que recortan el sprint de forma distinta dan la misma carga', () => {
    const rows = () => [
      phase({
        id: 'p',
        children: [
          item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-24', assigneeId: ANA.id }),
        ],
      }),
    ];
    // 20 días de ventana cortan S10 por la mitad; 365 lo contienen entero.
    const corto = load(rows(), PEOPLE, 20);
    const largo = load(rows(), PEOPLE, 365);
    expect(corto.capacity).toBe(largo.capacity);
    expect(corto.byAssignee).toEqual(largo.byAssignee);
  });

  it('un item dentro del sprint pero fuera de la ventana visible aparece, señalado', () => {
    // Ventana de 5 días desde 2026-06-29: acaba el 3 de julio, antes de S10.
    const l = load(
      [
        phase({
          id: 'p',
          children: [
            item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-17', assigneeId: ANA.id }),
          ],
        }),
      ],
      PEOPLE,
      5,
    );
    expect(l.itemCount).toBe(1);
    expect(daysOf(l, 'a')).toBe(5);
    expect(l.phases[0].items[0].offWindow).toBe(true);
  });

  it('un item que la ventana sí enseña no va señalado', () => {
    const l = load([
      phase({
        id: 'p',
        children: [
          item({ id: 'a', startDate: '2026-07-13', endDate: '2026-07-17', assigneeId: ANA.id }),
        ],
      }),
    ]);
    expect(l.phases[0].items[0].offWindow).toBe(false);
  });
});

describe('la pertenencia, que es la misma para el panel y para las filas', () => {
  it('una fila está apagada exactamente cuando no tiene items en el panel', () => {
    const l = load([
      phase({ id: 'dentro', children: [item({ id: 'a', startDate: '2026-07-14' })] }),
      phase({ id: 'fuera', children: [item({ id: 'b', startDate: '2026-09-14' })] }),
    ]);
    const listados = new Set(l.phases.flatMap((p) => p.items.map((i) => i.itemId)));
    expect([...l.memberItemIds].sort()).toEqual([...listados].sort());
    expect([...l.memberPhaseIds]).toEqual(['dentro']);
    expect(l.phases.map((p) => p.phaseId)).toEqual(['dentro']);
  });

  it('las fases se listan en el orden del roadmap', () => {
    const l = load([
      phase({ id: 'primera', children: [item({ id: 'a', startDate: '2026-07-14' })] }),
      phase({ id: 'segunda', children: [item({ id: 'b', startDate: '2026-07-15' })] }),
    ]);
    expect(l.phases.map((p) => p.phaseId)).toEqual(['primera', 'segunda']);
  });
});
