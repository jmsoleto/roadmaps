import { beforeEach, describe, expect, it } from 'vitest';
import { PersonasStore, type Outcome } from './store.svelte';
import type { PersonasBackend } from './storage';
import { emptyData, type Holiday, type Municipality, type PersonasData } from './model';
import type { Client, FestivosResult } from './festivos-api';

function backend(
  seed: PersonasData = emptyData(),
): PersonasBackend & { saved: PersonasData | null } {
  return {
    saved: null,
    load: () => structuredClone(seed),
    save(data) {
      this.saved = data;
    },
  };
}

const value = <T>(o: Outcome<T>): T => {
  if (!o.ok) throw new Error(o.error);
  return o.value;
};

let store: PersonasStore;
let teamId: string;
let madrid: string;

const draft = (name: string, over = {}) => ({
  teamId,
  name,
  roleId: null,
  technologyId: 'tec-app-qa',
  locationId: madrid,
  hoursPerDay: 8,
  dedication: 100,
  ...over,
});

beforeEach(() => {
  store = new PersonasStore(backend());
  store.init();
  teamId = value(store.addTeam('Pagos')).id;
  madrid = value(store.addLocation('Madrid')).id;
});

describe('catálogos', () => {
  it('un rol en uso no se borra, se inactiva y la persona lo conserva', () => {
    const qa = value(store.addRole('QA'));
    const ana = value(store.addPerson(draft('Ana', { roleId: qa.id })));
    expect(store.deleteRole(qa.id).ok).toBe(false);
    store.setRoleActive(qa.id, false);
    expect(store.person(ana.id)!.roleId).toBe(qa.id);
    const libre = value(store.addRole('Libre'));
    expect(store.deleteRole(libre.id).ok).toBe(true);
  });

  it('una tecnología va dentro de una familia, y no dentro de otra tecnología', () => {
    expect(store.addTechnology('Android', 'tec-app').ok).toBe(true);
    expect(store.addTechnology('Nieta', 'tec-app-qa').ok).toBe(false);
    expect(store.deleteTechnology('tec-app').ok).toBe(false);
  });

  it('un nombre vacío no se guarda', () => {
    expect(store.addRole('  ')).toEqual({ ok: false, error: 'El nombre no puede estar vacío.' });
  });

  it('pegar festivos dice lo que ha pasado y no duplica', () => {
    expect(store.addHoliday(madrid, '08/12/2026', 'Inmaculada').ok).toBe(true);
    const notice = store.pasteHolidays(madrid, '2026-12-08 Otra\n2026-12-25 Navidad\nbasura');
    expect(notice).toBe('1 festivo añadido · 1 ya estaba · no se entiende: «basura»');
    expect(store.location(madrid)!.holidays.map((h) => h.date)).toEqual([
      '2026-12-08',
      '2026-12-25',
    ]);
  });
});

describe('equipos y personas', () => {
  it('un equipo con personas no se borra; uno vacío sí', () => {
    value(store.addPerson(draft('Ana')));
    expect(store.deleteTeam(teamId).ok).toBe(false);
    const vacio = value(store.addTeam('Vacío'));
    expect(store.deleteTeam(vacio.id).ok).toBe(true);
  });

  it('rechaza los valores fuera de rango diciendo por qué', () => {
    expect(store.addPerson(draft('Ana', { dedication: 120 }))).toEqual({
      ok: false,
      error: 'La dedicación debe estar entre 0 y 100 %.',
    });
    expect(store.addPerson(draft('Ana', { hoursPerDay: 0 })).ok).toBe(false);
    expect(store.addPerson(draft('Ana', { hoursPerDay: 25 })).ok).toBe(false);
    expect(store.addPerson(draft('Ana', { dedication: 33.3 })).ok).toBe(true);
  });

  it('quien está en un sprint se inactiva, no se borra, y no entra en el siguiente', () => {
    const ana = value(store.addPerson(draft('Ana')));
    const luis = value(store.addPerson(draft('Luis')));
    const s1 = value(store.addSprint(store.propose(teamId, '2026-11-18')));
    expect(store.deletePerson(ana.id).ok).toBe(false);
    store.setPersonActive(ana.id, false);
    expect(store.sprint(s1.id)!.members.map((m) => m.personId)).toEqual([ana.id, luis.id]);
    const s2 = value(store.addSprint(store.propose(teamId, '2026-11-18')));
    expect(s2.members.map((m) => m.personId)).toEqual([luis.id]);
  });

  it('borrar a alguien que no está en ningún sprint se lleva sus ausencias', () => {
    const ana = value(store.addPerson(draft('Ana')));
    value(
      store.addAbsence({
        personId: ana.id,
        type: 'vacaciones',
        startDate: '2026-12-01',
        endDate: '2026-12-02',
        hoursPerDay: null,
        comment: '',
      }),
    );
    expect(store.deletePerson(ana.id).ok).toBe(true);
    expect(store.data.absences).toEqual([]);
  });
});

describe('ausencias', () => {
  it('fechas al revés no se guardan', () => {
    const ana = value(store.addPerson(draft('Ana')));
    const out = store.addAbsence({
      personId: ana.id,
      type: 'vacaciones',
      startDate: '2026-12-05',
      endDate: '2026-12-01',
      hoursPerDay: null,
      comment: '',
    });
    expect(out).toEqual({
      ok: false,
      error: 'La fecha de fin no puede ser anterior a la de inicio.',
    });
  });

  it('una parcial necesita horas', () => {
    const ana = value(store.addPerson(draft('Ana')));
    expect(
      store.addAbsence({
        personId: ana.id,
        type: 'permiso',
        startDate: '2026-12-01',
        endDate: '2026-12-01',
        hoursPerDay: 0,
        comment: '',
      }).ok,
    ).toBe(false);
  });
});

describe('sprints', () => {
  it('crear un sprint incorpora a las personas activas, con su dedicación por defecto', () => {
    const people = Array.from({ length: 10 }, (_, i) => value(store.addPerson(draft(`P${i}`))));
    store.setPersonActive(value(store.addPerson(draft('Baja'))).id, false);
    const s = value(store.addSprint(store.propose(teamId, '2026-11-18')));
    expect(s.members).toHaveLength(10);
    expect(s.members.map((m) => m.personId)).toEqual(people.map((p) => p.id));
    expect(s.members.every((m) => m.dedication === null)).toBe(true);
  });

  it('un equipo inactivo no admite sprints nuevos', () => {
    store.setTeamActive(teamId, false);
    expect(store.addSprint(store.propose(teamId, '2026-11-18')).ok).toBe(false);
  });

  it('la reserva y las fechas se validan', () => {
    const s = value(store.addSprint(store.propose(teamId, '2026-11-18')));
    expect(store.updateSprint(s.id, { incidentPercentage: 101 }).ok).toBe(false);
    expect(store.updateSprint(s.id, { endDate: '2026-01-01' }).ok).toBe(false);
    expect(store.updateSprint(s.id, { incidentPercentage: 20 }).ok).toBe(true);
  });

  it('quitar a alguien deja de contarlo; la dedicación del sprint no toca la de por defecto', () => {
    const ana = value(store.addPerson(draft('Ana')));
    const luis = value(store.addPerson(draft('Luis')));
    const s = value(
      store.addSprint({ ...store.propose(teamId, '2026-11-18'), incidentPercentage: 0 }),
    );
    expect(store.capacityOf(store.sprint(s.id)!).team.available).toBe(160);
    store.removeMember(s.id, luis.id);
    expect(store.capacityOf(store.sprint(s.id)!).team.available).toBe(80);
    expect(store.person(luis.id)).not.toBe(null);
    expect(store.setMemberDedication(s.id, ana.id, 50).ok).toBe(true);
    expect(store.capacityOf(store.sprint(s.id)!).team.available).toBe(40);
    expect(store.person(ana.id)!.dedication).toBe(100);
  });

  it('una ausencia nueva cambia la capacidad al momento', () => {
    const ana = value(store.addPerson(draft('Ana')));
    const s = value(
      store.addSprint({ ...store.propose(teamId, '2026-11-18'), incidentPercentage: 0 }),
    );
    const before = store.capacityOf(store.sprint(s.id)!).team.available;
    value(
      store.addAbsence({
        personId: ana.id,
        type: 'vacaciones',
        startDate: s.startDate,
        endDate: s.startDate,
        hoursPerDay: null,
        comment: '',
      }),
    );
    expect(store.capacityOf(store.sprint(s.id)!).team.available).toBe(before - 8);
  });
});

describe('restaurar', () => {
  it('solo sobre un Personas Hub vacío', () => {
    const blank = new PersonasStore(backend());
    blank.init();
    expect(blank.restore(store.data).ok).toBe(true);
    expect(store.restore(emptyData()).ok).toBe(false);
  });
});

describe('guardar', () => {
  it('lo que se escribe es la instantánea, no el proxy', () => {
    const b = backend();
    const s = new PersonasStore(b);
    s.init();
    s.addTeam('Pagos');
    s.flush();
    expect(b.saved?.teams.map((t) => t.name)).toEqual(['Pagos']);
  });
});

describe('el ciclo del sprint (personas-plan-real)', () => {
  function activeSprint() {
    const ana = value(store.addPerson(draft('Ana')));
    const s = value(
      store.addSprint({ ...store.propose(teamId, '2026-11-18'), incidentPercentage: 0 }),
    );
    expect(store.activateSprint(s.id).ok).toBe(true);
    return { ana, s: store.sprint(s.id)! };
  }

  it('activar congela el plan; después no se cambian fechas, reserva ni personas', () => {
    const { ana, s } = activeSprint();
    expect(s.status).toBe('activo');
    expect(store.planOf(s)!.team.available).toBe(80);
    expect(store.updateSprint(s.id, { incidentPercentage: 20 }).ok).toBe(false);
    expect(store.updateSprint(s.id, { name: 'Otro nombre' }).ok).toBe(true);
    store.removeMember(s.id, ana.id);
    expect(store.sprint(s.id)!.members).toHaveLength(1);
    expect(store.deleteSprint(s.id).ok).toBe(false);
    expect(store.activateSprint(s.id).ok).toBe(false);
  });

  it('una baja después de activar baja lo real y no el plan', () => {
    const { ana, s } = activeSprint();
    value(
      store.addAbsence({
        personId: ana.id,
        type: 'baja',
        startDate: s.startDate,
        endDate: s.startDate,
        hoursPerDay: null,
        comment: '',
      }),
    );
    expect(store.capacityOf(s).team.available).toBe(72);
    expect(store.planOf(s)!.team.available).toBe(80);
  });

  it('el ajuste necesita motivo y solo vale en activo', () => {
    const { s } = activeSprint();
    expect(store.setAdjustment(s.id, { hours: -8, reason: ' ' })).toEqual({
      ok: false,
      error: 'El ajuste necesita un motivo.',
    });
    expect(store.setAdjustment(s.id, { hours: -8, reason: 'incidencia' }).ok).toBe(true);
    expect(store.capacityOf(s).team.available).toBe(72);
  });

  it('cerrar congela lo real con su ajuste, y ya nada lo cambia', () => {
    const { ana, s } = activeSprint();
    store.setAdjustment(s.id, { hours: -8, reason: 'incidencia' });
    expect(store.closeSprint(s.id).ok).toBe(true);
    const closed = store.sprint(s.id)!;
    expect(closed.status).toBe('cerrado');
    expect(closed.adjustment).toBe(null);
    value(
      store.addAbsence({
        personId: ana.id,
        type: 'baja',
        startDate: s.startDate,
        endDate: s.endDate,
        hoursPerDay: null,
        comment: '',
      }),
    );
    store.updatePerson(ana.id, { hoursPerDay: 4 });
    expect(store.capacityOf(closed).team.available).toBe(72);
    expect(store.planOf(closed)!.team.available).toBe(80);
    expect(store.setMemberDedication(s.id, ana.id, 50).ok).toBe(false);
    expect(store.setAdjustment(s.id, null).ok).toBe(false);
  });

  it('en planificación no hay plan ni se puede cerrar', () => {
    const s = value(store.addSprint(store.propose(teamId, '2026-11-18')));
    expect(store.planOf(s)).toBe(null);
    expect(store.closeSprint(s.id).ok).toBe(false);
  });
});

describe('resultados por familia (personas-historico)', () => {
  it('lo comprometido se escribe en planificación y se congela al activar', () => {
    value(store.addPerson(draft('Ana')));
    const s = value(store.addSprint(store.propose(teamId, '2026-11-18')));
    expect(store.addResultFamily(s.id, 'tec-app').ok).toBe(true);
    expect(store.setResult(s.id, 'tec-app', { plannedPoints: 18, plannedStories: 6 }).ok).toBe(
      true,
    );
    expect(store.setResult(s.id, 'tec-app', { completedPoints: 3 }).ok).toBe(false);
    expect(store.setResult(s.id, 'tec-app', { plannedPoints: -1 }).ok).toBe(false);
    store.activateSprint(s.id);
    expect(store.setResult(s.id, 'tec-app', { plannedPoints: 20 })).toEqual({
      ok: false,
      error: 'Lo comprometido quedó congelado al activar el sprint.',
    });
    expect(store.setResult(s.id, 'tec-app', { completedPoints: 15.5 }).ok).toBe(true);
    expect(store.removeResultFamily(s.id, 'tec-app').ok).toBe(false);
    store.closeSprint(s.id);
    expect(store.setResult(s.id, 'tec-app', { completedPoints: 16 }).ok).toBe(false);
    expect(store.sprint(s.id)!.results[0]).toMatchObject({
      plannedPoints: 18,
      completedPoints: 15.5,
    });
  });

  it('una tecnología que no es familia no tiene fila', () => {
    const s = value(store.addSprint(store.propose(teamId, '2026-11-18')));
    expect(store.addResultFamily(s.id, 'tec-app-qa').ok).toBe(false);
  });
});

describe('configuración de alertas del equipo (personas-alertas)', () => {
  it('marca roles críticos y valida el umbral', () => {
    const qa = value(store.addRole('QA'));
    store.setCriticalRole(teamId, qa.id, true);
    store.setCriticalRole(teamId, qa.id, true);
    expect(store.team(teamId)!.criticalRoleIds).toEqual([qa.id]);
    store.setCriticalRole(teamId, qa.id, false);
    expect(store.team(teamId)!.criticalRoleIds).toEqual([]);
    expect(store.team(teamId)!.dropThreshold).toBe(20);
    expect(store.setDropThreshold(teamId, 120).ok).toBe(false);
    expect(store.setDropThreshold(teamId, 12.5).ok).toBe(true);
  });
});

describe('importar festivos del calendario público', () => {
  const MUNI: Municipality = {
    ccaa: 'mad',
    province: 'madrid',
    slug: 'madrid',
    ine: '28079',
    name: 'Madrid',
    provinceName: 'Madrid',
    ccaaName: 'Comunidad de Madrid',
  };
  const DAYS: Holiday[] = Array.from({ length: 14 }, (_, i) => ({
    date: `2026-${String(i < 12 ? i + 1 : 12).padStart(2, '0')}-${i < 12 ? '10' : i === 12 ? '08' : '25'}`,
    name: `Festivo ${i + 1}`,
  }));
  const client = (r: FestivosResult<Holiday[]>, before?: () => void): Client => ({
    communities: () => Promise.reject(new Error('no')),
    provinces: () => Promise.reject(new Error('no')),
    municipalities: () => Promise.reject(new Error('no')),
    holidays: async () => {
      before?.();
      return r;
    },
  });
  const dates = () => store.location(madrid)!.holidays.map((h) => h.date);

  it('vincular y desvincular; desvincular no borra festivos', () => {
    store.setLocationMunicipality(madrid, MUNI);
    expect(store.location(madrid)!.municipality).toEqual(MUNI);
    value(store.addHoliday(madrid, '2026-12-08', 'Inmaculada'));
    store.setLocationMunicipality(madrid, null);
    expect(store.location(madrid)).not.toHaveProperty('municipality');
    expect(dates()).toEqual(['2026-12-08']);
  });

  it('sin vínculo no hace nada', async () => {
    expect(await store.importHolidays(madrid, 2026, client({ ok: true, value: DAYS }))).toBe('');
    expect(dates()).toEqual([]);
  });

  it('en una localidad vacía añade los catorce', async () => {
    store.setLocationMunicipality(madrid, MUNI);
    const notice = await store.importHolidays(madrid, 2026, client({ ok: true, value: DAYS }));
    expect(notice).toBe('14 festivos añadidos');
    expect(dates()).toHaveLength(14);
  });

  it('respeta un festivo ya puesto, con su nombre, y una segunda vez no añade nada', async () => {
    store.setLocationMunicipality(madrid, MUNI);
    value(store.addHoliday(madrid, '2026-12-08', 'Mi Inmaculada'));
    const c = client({ ok: true, value: DAYS });
    expect(await store.importHolidays(madrid, 2026, c)).toBe('13 festivos añadidos · 1 ya estaba');
    expect(store.location(madrid)!.holidays.find((h) => h.date === '2026-12-08')!.name).toBe(
      'Mi Inmaculada',
    );
    expect(await store.importHolidays(madrid, 2026, c)).toBe('0 festivos añadidos · 14 ya estaban');
  });

  it('un año no publicado o un fallo lo dicen y no cambian nada', async () => {
    store.setLocationMunicipality(madrid, MUNI);
    expect(
      await store.importHolidays(madrid, 2028, client({ ok: false, error: 'no-publicado' })),
    ).toBe('Los festivos de 2028 todavía no están publicados.');
    expect(await store.importHolidays(madrid, 2026, client({ ok: false, error: 'fallo' }))).toBe(
      'No se pudieron importar los festivos. Inténtalo más tarde.',
    );
    expect(dates()).toEqual([]);
  });

  it('si la localidad se desvincula o cambia de municipio mientras llega la respuesta, no se toca', async () => {
    store.setLocationMunicipality(madrid, MUNI);
    const unlink = client({ ok: true, value: DAYS }, () =>
      store.setLocationMunicipality(madrid, null),
    );
    expect(await store.importHolidays(madrid, 2026, unlink)).toBe('');
    store.setLocationMunicipality(madrid, MUNI);
    const other = client({ ok: true, value: DAYS }, () =>
      store.setLocationMunicipality(madrid, {
        ...MUNI,
        slug: 'getafe',
        ine: '28065',
        name: 'Getafe',
      }),
    );
    expect(await store.importHolidays(madrid, 2026, other)).toBe('');
    expect(dates()).toEqual([]);
  });
});
