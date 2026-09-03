import { describe, it, expect } from 'vitest';
import { clampSidebarDrag, fitSidebarToWindow, readSidebarPref } from './sidebar-width';

describe('clampSidebarDrag — la regla del gesto', () => {
  it('deja pasar un ancho intermedio', () => {
    expect(clampSidebarDrag(400, 1200)).toBe(400);
  });

  it('no baja del ancho de siempre', () => {
    expect(clampSidebarDrag(10, 1200)).toBe(250);
  });

  it('no pasa de la mitad de la pantalla', () => {
    expect(clampSidebarDrag(2000, 1200)).toBe(600);
  });

  it('la mitad exacta es alcanzable', () => {
    expect(clampSidebarDrag(600, 1200)).toBe(600);
  });

  it('en una ventana muy estrecha gana el mínimo sobre la mitad', () => {
    expect(clampSidebarDrag(300, 400)).toBe(250);
  });

  it('un número inservible cae al ancho de siempre', () => {
    expect(clampSidebarDrag(Number.NaN, 1200)).toBe(250);
  });
});

describe('fitSidebarToWindow — el límite físico', () => {
  it('no toca un ancho que cabe', () => {
    expect(fitSidebarToWindow(600, 1200)).toBe(600);
  });

  it('recorta al borde de la ventana, no a la mitad', () => {
    // 1280 en una ventana de 1200: se pinta a 1152, que es la ventana menos el
    // margen del tirador. Recortarlo a 600 sería aplicar la regla del gesto, que
    // aquí no toca.
    expect(fitSidebarToWindow(1280, 1200)).toBe(1152);
  });

  it('deja el tirador dentro de la ventana', () => {
    expect(fitSidebarToWindow(5000, 1200)).toBeLessThan(1200);
  });

  it('nunca baja del mínimo, aunque la ventana sea diminuta', () => {
    expect(fitSidebarToWindow(400, 200)).toBe(250);
  });

  it('antes de la primera medida pinta el valor tal cual', () => {
    expect(fitSidebarToWindow(420, 0)).toBe(420);
  });
});

describe('readSidebarPref — lo que llega del almacén', () => {
  it('lee un ancho guardado', () => {
    expect(readSidebarPref('420')).toBe(420);
  });

  it('acepta un ancho mayor que cualquier ventana: el recorte es de pintado', () => {
    expect(readSidebarPref('1280')).toBe(1280);
  });

  it('cae al ancho de siempre sin preferencia, con basura o por debajo del mínimo', () => {
    expect(readSidebarPref(null)).toBe(250);
    expect(readSidebarPref('ancho')).toBe(250);
    expect(readSidebarPref('-40')).toBe(250);
  });
});
