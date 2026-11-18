import { describe, expect, it } from 'vitest';
import { personasSummary } from './summary';
import { emptyData, type PersonasData, type Sprint } from './model';

const sprint = (id: string, start: string, end: string): Sprint => ({
  id,
  teamId: 't1',
  name: id,
  startDate: start,
  endDate: end,
  status: 'planificacion',
  incidentPercentage: 15,
  members: [{ personId: 'p1', dedication: null }],
});

const data = (): PersonasData => ({
  ...emptyData(),
  teams: [
    { id: 't1', name: 'Pagos', description: '', active: true },
    { id: 't2', name: 'Viejo', description: '', active: false },
  ],
  people: [
    {
      id: 'p1',
      teamId: 't1',
      name: 'Ana',
      roleId: null,
      technologyId: null,
      locationId: null,
      hoursPerDay: 8,
      dedication: 100,
      active: true,
    },
    {
      id: 'p2',
      teamId: 't1',
      name: 'Luis',
      roleId: null,
      technologyId: null,
      locationId: null,
      hoursPerDay: 8,
      dedication: 100,
      active: false,
    },
  ],
  sprints: [
    sprint('Sprint 20', '2026-12-14', '2026-12-25'),
    sprint('Sprint 18', '2026-11-02', '2026-11-13'),
    sprint('Sprint 19', '2026-11-30', '2026-12-11'),
  ],
});

const color = (n: number) => `slot-${n}`;

describe('la tarjeta de Personas Hub', () => {
  it('cuenta personas y equipos activos, y sprints en planificación', () => {
    const s = personasSummary(data(), '2026-11-18', color);
    expect(s.stats.map((x) => x.value)).toEqual([1, 1, 3]);
    expect(s.alerts).toEqual([]);
  });

  it('lista los sprints que no han terminado, del más próximo, con su capacidad', () => {
    const s = personasSummary(data(), '2026-11-18', color);
    expect(s.list.label).toBe('PRÓXIMOS SPRINTS');
    expect(s.list.rows.map((r) => r.label)).toEqual(['Pagos · Sprint 19', 'Pagos · Sprint 20']);
    // 10 days × 8 h, 15 % kept for incidents.
    expect(s.list.rows[0].meta).toBe('68 h');
  });

  it('sin sprints por delante, la lista lo dice', () => {
    const s = personasSummary(data(), '2027-01-01', color);
    expect(s.list.rows).toEqual([]);
    expect(s.list.emptyLabel).toBe('ningún sprint por delante');
  });
});
