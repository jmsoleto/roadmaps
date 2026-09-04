import { describe, it, expect } from 'vitest';
import { clientToDayOffset } from './drag';

/*
 * Los bordes son todo lo que hay que probar aquí: el interior de una columna no
 * tiene sorpresas, y la diferencia entre los dos modos solo se ve pegada a una
 * frontera. Se comprueban los dos extremos del zoom porque una tolerancia de
 * medio píxel es media jornada a 4 px/día y nada a 26 (D2).
 */

const ZOOM_MIN = 4;
const ZOOM_MAX = 26;

describe('clientToDayOffset — modo round (mover, crear, extremo izquierdo)', () => {
  it('engancha a la frontera más cercana en el zoom más pequeño', () => {
    expect(clientToDayOffset(3 * ZOOM_MIN, 0, ZOOM_MIN)).toBe(3);
    expect(clientToDayOffset(3 * ZOOM_MIN - 1, 0, ZOOM_MIN)).toBe(3);
    expect(clientToDayOffset(3 * ZOOM_MIN + 1, 0, ZOOM_MIN)).toBe(3);
  });

  it('engancha a la frontera más cercana en el zoom más grande', () => {
    expect(clientToDayOffset(3 * ZOOM_MAX, 0, ZOOM_MAX)).toBe(3);
    expect(clientToDayOffset(3 * ZOOM_MAX - 12, 0, ZOOM_MAX)).toBe(3);
    expect(clientToDayOffset(3 * ZOOM_MAX + 12, 0, ZOOM_MAX)).toBe(3);
  });

  it('salta a la siguiente frontera pasada la mitad de la columna', () => {
    expect(clientToDayOffset(3 * ZOOM_MAX + 14, 0, ZOOM_MAX)).toBe(4);
  });

  it('mide desde el borde de la pista, no desde el de la ventana', () => {
    expect(clientToDayOffset(200 + 3 * ZOOM_MAX, 200, ZOOM_MAX)).toBe(3);
  });
});

describe('clientToDayOffset — modo floor (extremo derecho, fin inclusivo)', () => {
  it('devuelve la columna señalada y no la frontera más cercana', () => {
    // Con el dedo en el último tercio del día 3, `round` daría 4 —un día de más,
    // que con fin inclusivo es un día de trabajo inventado— y `floor` da 3.
    expect(clientToDayOffset(3 * ZOOM_MAX + 20, 0, ZOOM_MAX, 'floor')).toBe(3);
    expect(clientToDayOffset(3 * ZOOM_MAX + 20, 0, ZOOM_MAX)).toBe(4);
  });

  it('justo sobre la frontera entra en la columna que empieza', () => {
    expect(clientToDayOffset(3 * ZOOM_MAX, 0, ZOOM_MAX, 'floor')).toBe(3);
    expect(clientToDayOffset(3 * ZOOM_MAX - 1, 0, ZOOM_MAX, 'floor')).toBe(2);
  });

  it('se comporta igual en el zoom más pequeño', () => {
    expect(clientToDayOffset(3 * ZOOM_MIN, 0, ZOOM_MIN, 'floor')).toBe(3);
    expect(clientToDayOffset(3 * ZOOM_MIN + 3, 0, ZOOM_MIN, 'floor')).toBe(3);
    expect(clientToDayOffset(4 * ZOOM_MIN, 0, ZOOM_MIN, 'floor')).toBe(4);
  });

  it('a la izquierda del origen sigue bajando, sin cruzar el cero por redondeo', () => {
    expect(clientToDayOffset(-1, 0, ZOOM_MAX, 'floor')).toBe(-1);
    expect(clientToDayOffset(-1, 0, ZOOM_MAX)).toBe(-0);
  });
});
