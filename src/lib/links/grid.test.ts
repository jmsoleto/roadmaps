import { describe, it, expect } from 'vitest';
import { placeCells, cellRect, dropIndexInGrid, type GridMetrics } from './grid';

/** A grid of 240px tracks, 104px tiles and a 14px gutter, as the screen has it. */
const M: GridMetrics = { cellW: 240, cellH: 104, gap: 14 };

const singles = (n: number) => Array<number>(n).fill(1);

describe('colocar las baldosas', () => {
  it('sin dobles, la celda es el índice', () => {
    expect(placeCells(singles(6), 4)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('un doble ocupa dos celdas y empuja al siguiente', () => {
    expect(placeCells([1, 2, 1], 4)).toEqual([0, 1, 3]);
  });

  it('un doble que no cabe al final de la línea salta y deja el hueco', () => {
    // Cuatro columnas: el tercero llena la línea hasta la última columna, así
    // que el doble no puede empezar ahí y arranca la siguiente.
    expect(placeCells([1, 1, 1, 2, 1], 4)).toEqual([0, 1, 2, 4, 6]);
  });

  it('nadie rellena el hueco que quedó detrás', () => {
    // El flujo es sparse: el cursor no retrocede, así que la celda 3 se queda
    // vacía para siempre y el sencillo que viene después del doble va detrás.
    const cells = placeCells([1, 1, 1, 2, 1], 4);
    expect(cells).not.toContain(3);
    expect(cells[4]).toBeGreaterThan(cells[3]);
  });

  it('en una sola columna un doble ocupa una celda', () => {
    expect(placeCells([1, 2, 1], 1)).toEqual([0, 1, 2]);
  });
});

describe('de celda a píxeles', () => {
  it('avanza por columnas y salta de línea', () => {
    expect(cellRect(0, 4, M)).toEqual({ x: 0, y: 0 });
    expect(cellRect(2, 4, M)).toEqual({ x: 2 * 254, y: 0 });
    expect(cellRect(4, 4, M)).toEqual({ x: 0, y: 118 });
  });
});

describe('dónde cae la baldosa en mano', () => {
  const widths = singles(6);

  it('sin moverse, se queda donde estaba', () => {
    expect(dropIndexInGrid(0, 0, 0, widths, 4, M)).toBe(0);
    expect(dropIndexInGrid(3, 0, 0, widths, 4, M)).toBe(3);
  });

  it('llevar el primero sobre el tercero devuelve la tercera posición', () => {
    expect(dropIndexInGrid(0, 2 * 254, 0, widths, 4, M)).toBe(2);
  });

  it('bajar una línea cruza a la fila siguiente', () => {
    expect(dropIndexInGrid(0, 0, 118, widths, 4, M)).toBe(4);
  });

  it('un puntero que se va lejos se recorta a los extremos', () => {
    expect(dropIndexInGrid(2, -9000, -9000, widths, 4, M)).toBe(0);
    expect(dropIndexInGrid(2, 9000, 9000, widths, 4, M)).toBe(widths.length - 1);
  });

  it('con dobles de por medio sigue contestando una posición del array', () => {
    const mixed = [2, 1, 1, 2, 1];
    for (let from = 0; from < mixed.length; from++) {
      const to = dropIndexInGrid(from, 300, 120, mixed, 4, M);
      expect(to).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThan(mixed.length);
    }
  });

  it('un área vacía o un índice imposible no inventan destino', () => {
    expect(dropIndexInGrid(0, 100, 100, [], 4, M)).toBe(0);
    expect(dropIndexInGrid(9, 100, 100, widths, 4, M)).toBe(9);
  });
});
