import { describe, it, expect } from 'vitest';
import {
  datosIniciales,
  ID_VIGILADA,
  idParaNombre,
  metricasIniciales,
  nuevaVersion,
} from './model';

describe('el identificador de una aplicación vigilada', () => {
  it('sale legible del nombre, sin acentos', () => {
    expect(idParaNombre('Facturación Web', [])).toBe('facturacion-web');
  });

  it('no choca con los que ya existen', () => {
    expect(idParaNombre('Pedidos', ['pedidos'])).toBe('pedidos-2');
    expect(idParaNombre('Pedidos', ['pedidos', 'pedidos-2'])).toBe('pedidos-3');
  });

  it('tiene un valor aunque el nombre no aporte ninguna letra', () => {
    expect(idParaNombre('¿¿??', [])).toBe('aplicacion');
  });

  it('siempre sirve para un nombre de fichero', () => {
    for (const nombre of ['  Ñu / Back-end  ', 'A_B', '---x---']) {
      expect(idParaNombre(nombre, [])).toMatch(ID_VIGILADA);
    }
  });
});

describe('el catálogo inicial', () => {
  it('trae las cinco métricas, cada una con su clase', () => {
    expect(metricasIniciales().map((m) => [m.id, m.clase])).toEqual([
      ['no-controlados', 'propia'],
      ['500', 'propia'],
      ['400', 'cliente'],
      ['403', 'cliente'],
      ['peticiones', 'peticiones'],
    ]);
  });

  it('nace sin aplicaciones y con una zona horaria', () => {
    const datos = datosIniciales('Europe/Madrid');
    expect(datos.catalogo.zona).toBe('Europe/Madrid');
    expect(datos.aplicaciones).toEqual([]);
    expect(datos.observaciones).toEqual({});
  });
});

describe('una subida de versión', () => {
  it('no guarda una nota vacía', () => {
    expect('nota' in nuevaVersion('4.2.0', '2026-11-03', '  ')).toBe(false);
  });
});
