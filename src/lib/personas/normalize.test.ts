import { describe, expect, it } from 'vitest';
import { emptyData, familyOf, isBlank, technologyLabel } from './model';
import { Inconsistent, normalize } from './normalize';

const base = () => ({
  roles: [{ id: 'r1', name: 'QA', active: true }],
  technologies: emptyData().technologies,
  locations: [
    {
      id: 'mad',
      name: 'Madrid',
      active: true,
      holidays: [
        { date: '2026-12-08', name: 'Inmaculada' },
        { date: '2026-12-08', name: 'repetido' },
        { date: '2026-01-01', name: 'Año Nuevo' },
      ],
    },
  ],
  teams: [{ id: 't1', name: 'Pagos', description: '', active: true }],
  people: [
    {
      id: 'p1',
      teamId: 't1',
      name: 'Ana',
      roleId: 'r1',
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
      comment: '',
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

describe('una aplicación nueva', () => {
  it('parte del árbol de tecnologías del PRD', () => {
    const techs = emptyData().technologies;
    const families = techs.filter((t) => t.parentId === null).map((t) => t.name);
    expect(families).toEqual(['APP', 'WEB', 'BACKEND']);
    const app = techs.filter((t) => t.parentId === 'tec-app').map((t) => t.name);
    expect(app).toEqual(['App Front', 'App Back / Gateway', 'QA']);
    expect(isBlank(emptyData())).toBe(true);
  });

  it('distingue el QA de APP del de WEB', () => {
    const techs = emptyData().technologies;
    expect(technologyLabel(techs, 'tec-app-qa')).toBe('QA · APP');
    expect(technologyLabel(techs, 'tec-web-qa')).toBe('QA · WEB');
    expect(familyOf(techs, 'tec-web-qa')?.name).toBe('WEB');
    expect(familyOf(techs, 'tec-web')?.name).toBe('WEB');
  });
});

describe('leer lo guardado', () => {
  it('lo que no es un documento da una aplicación nueva', () => {
    for (const junk of [null, undefined, 42, 'texto', []]) {
      expect(normalize(junk)).toEqual(emptyData());
    }
  });

  it('un documento válido se lee igual, con los festivos sin repetir y en orden', () => {
    const data = normalize(base());
    expect(data.people).toHaveLength(1);
    expect(data.locations[0].holidays.map((h) => h.date)).toEqual(['2026-01-01', '2026-12-08']);
    expect(data.absences[0].type).toBe('baja');
  });

  it('una lista de tecnologías vacía se respeta', () => {
    expect(normalize({ ...base(), technologies: [] }).technologies).toEqual([]);
  });

  it('descarta lo que apunta a algo que no existe', () => {
    const raw = base();
    raw.absences.push({ ...raw.absences[0], id: 'a2', personId: 'nadie' });
    raw.people.push({ ...raw.people[0], id: 'p2', teamId: 'nadie' });
    raw.sprints[0].members.push({ personId: 'nadie', dedication: null });
    const data = normalize(raw);
    expect(data.absences.map((a) => a.id)).toEqual(['a1']);
    expect(data.people.map((p) => p.id)).toEqual(['p1']);
    expect(data.sprints[0].members).toHaveLength(1);
  });

  it('una referencia rota a un catálogo se limpia sin perder a la persona', () => {
    const raw = base();
    raw.people[0].roleId = 'borrado';
    expect(normalize(raw).people[0].roleId).toBe(null);
  });

  it('descarta fechas inválidas o al revés', () => {
    const raw = base();
    raw.absences.push({
      ...raw.absences[0],
      id: 'a2',
      startDate: '2026-12-05',
      endDate: '2026-12-01',
    });
    raw.absences.push({ ...raw.absences[0], id: 'a3', startDate: 'mañana' });
    expect(normalize(raw).absences.map((a) => a.id)).toEqual(['a1']);
  });

  it('un valor fuera de rango vuelve al de por defecto', () => {
    const raw = base();
    raw.people[0].dedication = 120;
    raw.people[0].hoursPerDay = 0;
    const p = normalize(raw).people[0];
    expect(p.dedication).toBe(100);
    expect(p.hoursPerDay).toBe(8);
  });

  it('un id repetido se queda con el primero', () => {
    const raw = base();
    raw.teams.push({ id: 't1', name: 'Otro', description: '', active: true });
    expect(normalize(raw).teams.map((t) => t.name)).toEqual(['Pagos']);
  });

  it('un tipo de ausencia desconocido pasa a «otra»', () => {
    const raw = base();
    raw.absences[0].type = 'inventado';
    expect(normalize(raw).absences[0].type).toBe('otra');
  });
});

describe('leer en modo estricto (importar)', () => {
  it('un documento válido entra entero', () => {
    expect(normalize(base(), true).absences).toHaveLength(1);
  });

  it('una ausencia de una persona que no está rechaza el documento', () => {
    const raw = base();
    raw.absences.push({ ...raw.absences[0], id: 'a2', personId: 'nadie' });
    expect(() => normalize(raw, true)).toThrow(Inconsistent);
  });

  it('un rango imposible rechaza el documento', () => {
    const raw = base();
    raw.sprints[0].incidentPercentage = 150;
    expect(() => normalize(raw, true)).toThrow(Inconsistent);
  });

  it('lo que no es un documento se rechaza', () => {
    expect(() => normalize(null, true)).toThrow(Inconsistent);
  });
});
