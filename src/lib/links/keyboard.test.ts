import { describe, it, expect } from 'vitest';
import { actionFor, NUMBERED } from './keyboard';

const press = (
  key: string,
  mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {},
) => actionFor({ key, ...mods }, false);

describe('el teclado de Links Hub', () => {
  it('pone los números en los enlaces, no en las áreas', () => {
    expect(press('1')).toEqual({ kind: 'open', index: 0 });
    expect(press('4')).toEqual({ kind: 'open', index: 3 });
    expect(press('9')).toEqual({ kind: 'open', index: NUMBERED - 1 });
  });

  it('no tiene tecla cero', () => {
    expect(press('0')).toBe(null);
  });

  it('pone las áreas en las flechas laterales', () => {
    expect(press('ArrowRight')).toEqual({ kind: 'area', step: 1 });
    expect(press('ArrowLeft')).toEqual({ kind: 'area', step: -1 });
  });

  it('mueve el foco con las flechas verticales y abre con Enter', () => {
    expect(press('ArrowDown')).toEqual({ kind: 'focus', step: 1 });
    expect(press('ArrowUp')).toEqual({ kind: 'focus', step: -1 });
    expect(press('Enter')).toEqual({ kind: 'openFocused' });
  });

  it('personaliza con E, en cualquier caja', () => {
    expect(press('e')).toEqual({ kind: 'customize' });
    expect(press('E')).toEqual({ kind: 'customize' });
  });

  it('no roba nada que lleve modificador', () => {
    // ⌘L, ctrl+1 y compañía son del navegador.
    expect(press('1', { metaKey: true })).toBe(null);
    expect(press('1', { ctrlKey: true })).toBe(null);
    expect(press('ArrowRight', { altKey: true })).toBe(null);
  });

  it('calla del todo mientras se escribe', () => {
    // Es lo que permite dejar los atajos siempre armados, y por tanto lo que
    // permite que la leyenda esté a la vista en lugar de tras una tecla.
    for (const key of ['1', '9', 'e', 'E', 'Enter', 'ArrowRight', 'ArrowDown']) {
      expect(actionFor({ key }, true)).toBe(null);
    }
  });
});
