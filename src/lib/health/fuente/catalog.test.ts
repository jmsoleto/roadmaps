import { describe, it, expect } from 'vitest';
import { datosIniciales, type Catalogo } from '../model';
import { catalogoEfectivo } from './catalog';
import type { LecturaFuente } from './connection.svelte';
import { indiceColector } from './fixtures';
import { leerIndice } from './read';

/** A reading of the collector's real index, without series: the catalogue needs none. */
function lectura(raw = indiceColector()): LecturaFuente {
  const i = leerIndice(JSON.stringify(raw));
  if (i.kind !== 'ok') throw new Error(i.motivo);
  return {
    apps: i.apps.map((app) => ({ app, series: new Map(), despliegues: [], avisos: [] })),
    avisos: [],
  };
}

/** The catalogue a folder got before the collector existed. */
const antiguo: Catalogo = {
  zona: 'Europe/Madrid',
  metricas: [
    { id: 'no-controlados', nombre: 'No controlados', clase: 'propia' },
    { id: '500', nombre: '500', clase: 'propia' },
    { id: '400', nombre: '400', clase: 'cliente' },
    { id: '403', nombre: '403', clase: 'cliente' },
    { id: 'peticiones', nombre: 'Peticiones', clase: 'peticiones' },
  ],
};

describe('el catálogo con la fuente conectada', () => {
  it('sin fuente es el de la carpeta, tal cual', () => {
    expect(catalogoEfectivo(antiguo, null, new Set()).catalogo).toBe(antiguo);
  });

  it('lo manda el colector: sus ids y sus nombres, propias, cliente y peticiones', () => {
    const { catalogo, sinClase } = catalogoEfectivo(antiguo, lectura(), new Set());
    expect(catalogo.metricas).toEqual([
      { id: 'no-controlados', nombre: 'Errores no controlados', clase: 'propia' },
      { id: 'errores-50x', nombre: 'Errores 50X', clase: 'propia' },
      { id: 'errores-404', nombre: 'Errores 404', clase: 'cliente' },
      { id: 'errores-40x', nombre: 'Errores 40X (sin 404)', clase: 'cliente' },
      { id: 'peticiones', nombre: 'Peticiones', clase: 'peticiones' },
    ]);
    expect(catalogo.zona).toBe('Europe/Madrid');
    expect(sinClase).toEqual([]);
  });

  it('un catálogo antiguo no hay que editarlo: 500, 400 y 403 desaparecen sin datos', () => {
    const ids = catalogoEfectivo(antiguo, lectura(), new Set()).catalogo.metricas.map((m) => m.id);
    expect(ids).not.toContain('500');
  });

  it('una métrica propia de la carpeta sigue si la carpeta tiene datos de ella', () => {
    const ids = catalogoEfectivo(antiguo, lectura(), new Set(['500'])).catalogo.metricas.map(
      (m) => m.id,
    );
    expect(ids).toContain('500');
  });

  it('una métrica nueva del colector sin clase no se inventa: se avisa', () => {
    const raw = indiceColector();
    const cex = (raw.apps as Record<string, { metrics: Record<string, unknown> }>)['cex-es'];
    cex.metrics['errores-429'] = { ...(cex.metrics['errores-404'] as object), name: 'Errores 429' };
    const r = catalogoEfectivo(datosIniciales('Europe/Madrid').catalogo, lectura(raw), new Set());
    expect(r.sinClase).toEqual(['errores-429']);
    expect(r.catalogo.metricas.some((m) => m.id === 'errores-429')).toBe(false);
  });

  it('y toma su clase si catalogo.json la lista', () => {
    const raw = indiceColector();
    const cex = (raw.apps as Record<string, { metrics: Record<string, unknown> }>)['cex-es'];
    cex.metrics['errores-429'] = { ...(cex.metrics['errores-404'] as object), name: 'Errores 429' };
    const propio: Catalogo = {
      ...antiguo,
      metricas: [...antiguo.metricas, { id: 'errores-429', nombre: '429', clase: 'cliente' }],
    };
    const r = catalogoEfectivo(propio, lectura(raw), new Set());
    expect(r.catalogo.metricas.find((m) => m.id === 'errores-429')).toEqual({
      id: 'errores-429',
      nombre: 'Errores 429',
      clase: 'cliente',
    });
  });
});
