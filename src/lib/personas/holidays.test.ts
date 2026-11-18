import { describe, expect, it } from 'vitest';
import { mergeHolidays, parseHolidays, pasteNotice, readDate } from './holidays';
import { nextName, proposeSprint } from './sprint-defaults';
import { emptyData, type PersonasData } from './model';

describe('pegar festivos', () => {
  it('entiende los formatos habituales', () => {
    const { holidays, rejected } = parseHolidays(
      [
        '2026-01-01 Año Nuevo',
        '06/01/2026;Reyes',
        '19/3/2026\tSan José',
        '2026-05-01, Trabajo',
        '2026-08-15',
      ].join('\n'),
    );
    expect(rejected).toEqual([]);
    expect(holidays).toEqual([
      { date: '2026-01-01', name: 'Año Nuevo' },
      { date: '2026-01-06', name: 'Reyes' },
      { date: '2026-03-19', name: 'San José' },
      { date: '2026-05-01', name: 'Trabajo' },
      { date: '2026-08-15', name: 'Festivo' },
    ]);
  });

  it('doce líneas con una inválida: entran once y se dice cuál', () => {
    const lines = Array.from(
      { length: 11 },
      (_, i) => `2026-${String(i + 1).padStart(2, '0')}-10 F${i}`,
    );
    lines.splice(4, 0, '2026-02-30 No existe');
    const { holidays, rejected } = parseHolidays(lines.join('\n'));
    expect(holidays).toHaveLength(11);
    expect(rejected).toEqual(['2026-02-30 No existe']);
  });

  it('no inventa fechas', () => {
    expect(readDate('2026-02-30')).toBe(null);
    expect(readDate('31/04/2026')).toBe(null);
    expect(readDate('29/02/2028')).toBe('2028-02-29');
  });

  it('una fecha que ya está no se duplica', () => {
    const out = mergeHolidays(
      [{ date: '2026-12-08', name: 'Inmaculada' }],
      [
        { date: '2026-12-08', name: 'Otra vez' },
        { date: '2026-12-25', name: 'Navidad' },
      ],
    );
    expect(out.added).toBe(1);
    expect(out.repeated).toBe(1);
    expect(out.holidays.map((h) => h.name)).toEqual(['Inmaculada', 'Navidad']);
  });

  it('el aviso dice lo que ha pasado', () => {
    expect(pasteNotice(11, 0, ['x'])).toBe('11 festivos añadidos · no se entiende: «x»');
    expect(pasteNotice(1, 2, [])).toBe('1 festivo añadido · 2 ya estaban');
  });
});

describe('lo que propone un sprint nuevo', () => {
  const withLast = (): PersonasData => ({
    ...emptyData(),
    teams: [{ id: 't', name: 'Pagos', description: '', active: true }],
    sprints: [
      {
        id: 's17',
        teamId: 't',
        name: 'Sprint 17',
        startDate: '2026-11-02',
        endDate: '2026-11-13',
        status: 'planificacion',
        incidentPercentage: 10,
        members: [],
      },
      {
        id: 's18',
        teamId: 't',
        name: 'Sprint 18',
        startDate: '2026-11-16',
        endDate: '2026-11-27',
        status: 'planificacion',
        incidentPercentage: 20,
        members: [],
      },
    ],
  });

  it('el siguiente al Sprint 18 que terminaba un viernes con un 20 %', () => {
    expect(proposeSprint(withLast(), 't', '2026-11-18')).toEqual({
      teamId: 't',
      name: 'Sprint 19',
      startDate: '2026-11-30',
      endDate: '2026-12-11',
      incidentPercentage: 20,
    });
  });

  it('el primero de un equipo empieza el lunes siguiente, con un 15 %', () => {
    const d = proposeSprint(withLast(), 'otro', '2026-11-18');
    expect(d).toMatchObject({ name: 'Sprint 1', startDate: '2026-11-23', endDate: '2026-12-04' });
    expect(d.incidentPercentage).toBe(15);
  });

  it('un lunes es su propio lunes', () => {
    expect(proposeSprint(emptyData(), 't', '2026-11-23').startDate).toBe('2026-11-23');
  });

  it('el nombre sigue la numeración que haya', () => {
    expect(nextName('Pagos 41', 3)).toBe('Pagos 42');
    expect(nextName('Arranque', 3)).toBe('Sprint 4');
  });
});
