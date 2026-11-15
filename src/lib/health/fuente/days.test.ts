import { describe, it, expect } from 'vitest';
import { diaEn, diasCompletos, horasDelDia } from './days';

const H = 3_600_000;
const Z = 'Europe/Madrid';

/** Every hour from `desde` (inclusive) to `hasta` (exclusive), each worth `valor`. */
function horas(desde: string, hasta: string, valor = 1): Map<number, number> {
  const m = new Map<number, number>();
  for (let t = Date.parse(desde); t < Date.parse(hasta); t += H) m.set(t, valor);
  return m;
}

describe('de horas a días', () => {
  it('un día de Madrid en invierno va de las 23:00Z a las 23:00Z', () => {
    expect(diaEn(Date.parse('2026-11-09T22:59:00Z'), Z)).toBe('2026-11-09');
    expect(diaEn(Date.parse('2026-11-09T23:00:00Z'), Z)).toBe('2026-11-10');
    expect(horasDelDia('2026-11-10', Z)).toHaveLength(24);
  });

  it('los días del cambio de hora tienen 23 y 25 horas', () => {
    expect(horasDelDia('2026-03-29', Z)).toHaveLength(23);
    expect(horasDelDia('2026-10-25', Z)).toHaveLength(25);
  });

  it('un día completo suma sus 24 horas y sale exacto, de la fuente', () => {
    const obs = diasCompletos(
      horas('2026-11-09T23:00:00Z', '2026-11-10T23:00:00Z', 2),
      'peticiones',
      Z,
      '2026-11-13',
    );
    expect(obs).toEqual([
      {
        dia: '2026-11-10',
        metrica: 'peticiones',
        valor: 48,
        fuente: 'kibana',
        capturado: '2026-11-13',
      },
    ]);
    expect('estimado' in obs[0]).toBe(false);
  });

  it('el primer día de la serie, que empieza a las 20:00Z, no cuenta', () => {
    const obs = diasCompletos(
      horas('2026-11-06T20:00:00Z', '2026-11-08T23:00:00Z'),
      'peticiones',
      Z,
      '2026-11-13',
    );
    expect(obs.map((o) => o.dia)).toEqual(['2026-11-07', '2026-11-08']);
  });

  it('un día con una hora sin dato no cuenta', () => {
    const h = horas('2026-11-09T23:00:00Z', '2026-11-11T23:00:00Z');
    h.delete(Date.parse('2026-11-11T10:00:00Z'));
    expect(diasCompletos(h, 'peticiones', Z, '2026-11-13').map((o) => o.dia)).toEqual([
      '2026-11-10',
    ]);
  });

  it('el día de 25 horas cuenta completo y suma las 25', () => {
    const obs = diasCompletos(
      horas('2026-10-24T22:00:00Z', '2026-10-25T23:00:00Z'),
      'peticiones',
      Z,
      '2026-10-26',
    );
    expect(obs).toEqual([expect.objectContaining({ dia: '2026-10-25', valor: 25 })]);
  });

  it('el día de 23 horas cuenta completo y suma las 23', () => {
    const obs = diasCompletos(
      horas('2026-03-28T23:00:00Z', '2026-03-29T22:00:00Z'),
      'peticiones',
      Z,
      '2026-03-30',
    );
    expect(obs).toEqual([expect.objectContaining({ dia: '2026-03-29', valor: 23 })]);
  });

  it('ceros medidos dan un día con valor 0', () => {
    const obs = diasCompletos(
      horas('2026-11-09T23:00:00Z', '2026-11-10T23:00:00Z', 0),
      'no-controlados',
      Z,
      '2026-11-13',
    );
    expect(obs[0].valor).toBe(0);
  });
});
