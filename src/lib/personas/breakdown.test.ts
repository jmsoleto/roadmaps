import { describe, expect, it } from 'vitest';
import { computeCapacity } from './capacity';
import { breakdown, LINES, lineValue } from './breakdown';
import { fmtDiscount, fmtHours, fmtNumber, fmtPercent, parseNumber } from './format';
import type { Absence, Location, Person } from './model';

const mad: Location = {
  id: 'mad',
  name: 'Madrid',
  active: true,
  holidays: [{ date: '2026-12-08', name: 'Inmaculada' }],
};
const p = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  teamId: 't',
  name: id.toUpperCase(),
  roleId: null,
  technologyId: null,
  locationId: 'mad',
  hoursPerDay: 8,
  dedication: 100,
  active: true,
  ...over,
});
const a = (
  id: string,
  personId: string,
  s: string,
  e: string,
  h: number | null = null,
): Absence => ({
  id,
  personId,
  type: 'vacaciones',
  startDate: s,
  endDate: e,
  hoursPerDay: h,
  comment: '',
});

const people = [
  p('ana', { dedication: 50 }),
  p('luis', { dedication: 33.3 }),
  p('eva', { hoursPerDay: 7.5 }),
];
const c = computeCapacity({
  sprint: {
    startDate: '2026-11-30',
    endDate: '2026-12-11',
    incidentPercentage: 15,
    members: [
      { personId: 'ana', dedication: null },
      { personId: 'luis', dedication: null },
      { personId: 'eva', dedication: 80 },
    ],
  },
  people,
  locations: [mad],
  absences: [
    a('a1', 'ana', '2026-12-01', '2026-12-02'),
    a('a2', 'eva', '2026-12-03', '2026-12-03', 3),
  ],
});

describe('cada cifra se explica', () => {
  it('lo que se abre suma la cifra abierta, en todas las líneas', () => {
    for (const line of LINES) {
      const sum = breakdown(c, line).reduce((n, e) => n + e.hours, 0);
      expect(sum).toBeCloseTo(lineValue(c, line), 9);
    }
  });

  it('los festivos se abren por persona, fecha y nombre', () => {
    const rows = breakdown(c, 'holiday');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      name: 'ANA',
      date: '2026-12-08',
      cause: 'Inmaculada',
      hours: 8,
    });
  });

  it('las ausencias dicen su tipo', () => {
    expect(breakdown(c, 'absence').map((e) => e.cause)).toEqual([
      'vacaciones',
      'vacaciones',
      'vacaciones',
    ]);
  });

  it('la dedicación dice si es la del sprint', () => {
    const eva = breakdown(c, 'dedication').find((e) => e.personId === 'eva')!;
    expect(eva.detail).toContain('80 %');
    expect(eva.detail).toContain('en este sprint');
    const luis = breakdown(c, 'dedication').find((e) => e.personId === 'luis')!;
    expect(luis.detail).toContain('33,3 %');
  });

  it('lo disponible se abre con sus teóricas y descuentos', () => {
    const ana = breakdown(c, 'available').find((e) => e.personId === 'ana')!;
    expect(ana.detail).toBe('80 − 8 − 16 − 28');
    expect(ana.hours).toBe(28);
  });
});

describe('con un ajuste de lo real', () => {
  const adjusted = computeCapacity({
    sprint: {
      startDate: '2026-11-30',
      endDate: '2026-12-11',
      incidentPercentage: 15,
      members: [{ personId: 'ana', dedication: null }],
    },
    people,
    locations: [mad],
    absences: [],
    adjustment: { hours: -10, reason: 'incidencia' },
  });

  it('sigue sumando en todas las líneas, con el ajuste como fila propia', () => {
    for (const line of LINES) {
      const sum = breakdown(adjusted, line).reduce((n, e) => n + e.hours, 0);
      expect(sum).toBeCloseTo(lineValue(adjusted, line), 9);
    }
    expect(breakdown(adjusted, 'adjustment')).toEqual([
      { personId: '', name: 'Ajuste · incidencia', hours: -10 },
    ]);
  });
});

describe('cómo se escriben los números', () => {
  it('un decimal como mucho, con coma', () => {
    expect(fmtNumber(469.2)).toBe('469,2');
    expect(fmtNumber(80)).toBe('80');
    expect(fmtNumber(26.64)).toBe('26,6');
    expect(fmtNumber(-0.01)).toBe('0');
    expect(fmtHours(469.2)).toBe('469,2 h');
  });

  it('los descuentos llevan signo menos, salvo el cero', () => {
    expect(fmtDiscount(24)).toBe('−24 h');
    expect(fmtDiscount(0)).toBe('0 h');
  });

  it('los porcentajes con los decimales que se escribieron', () => {
    expect(fmtPercent(33.3)).toBe('33,3 %');
    expect(fmtPercent(15)).toBe('15 %');
  });

  it('lee números con coma o con punto', () => {
    expect(parseNumber('33,3')).toBe(33.3);
    expect(parseNumber(' 8 ')).toBe(8);
    expect(parseNumber('−16')).toBe(-16);
    expect(parseNumber('-4,5')).toBe(-4.5);
    expect(fmtNumber(-16)).toBe('−16');
    expect(parseNumber('ocho')).toBe(null);
    expect(parseNumber('')).toBe(null);
  });
});
