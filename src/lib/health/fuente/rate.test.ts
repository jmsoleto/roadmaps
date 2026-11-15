import { describe, it, expect } from 'vitest';
import { indiceReal } from './fixtures';
import { datosHasta, tasa, tasaPorHora } from './rate';
import { leerIndice, type AppFuente } from './read';

describe('la tasa de error', () => {
  it('divide los errores entre las peticiones del mismo rango', () => {
    expect(tasa(13, 1000)).toBeCloseTo(0.013);
  });

  it('con peticiones a 0 no hay tasa, ni siquiera 0 %', () => {
    expect(tasa(0, 0)).toBeNull();
    expect(tasa(5, 0)).toBeNull();
  });

  it('hora a hora, una hora sin peticiones o sin dato no tiene tasa', () => {
    const h = 3_600_000;
    const r = tasaPorHora(
      new Map([
        [0, 2],
        [h, 1],
        [2 * h, 4],
      ]),
      new Map([
        [0, 100],
        [h, 0],
      ]),
    );
    expect([...r.values()]).toEqual([0.02, null, null]);
  });
});

describe('datos hasta', () => {
  const apps = () => {
    const i = leerIndice(JSON.stringify(indiceReal()));
    if (i.kind !== 'ok') throw new Error(i.motivo);
    return i.apps;
  };

  it('es el to más antiguo de las métricas activas', () => {
    const cex = apps()[0];
    cex.metricas[1] = { ...cex.metricas[1], hasta: Date.parse('2026-11-12T09:00:00Z') };
    expect(datosHasta(cex)).toBe(Date.parse('2026-11-12T09:00:00Z'));
  });

  it('una métrica retirada con un to antiguo no cuenta', () => {
    // `antigua` is removed in the fixture, with `to` on 2026-11-07.
    expect(datosHasta(apps()[0])).toBe(Date.parse('2026-11-13T21:00:00Z'));
  });

  it('sin métricas no hay fecha', () => {
    const vacia: AppFuente = { id: 'x', nombre: 'X', metricas: [] };
    expect(datosHasta(vacia)).toBeNull();
  });
});
