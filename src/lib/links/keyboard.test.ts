import { describe, it, expect } from 'vitest';
import { actionFor, ownsKey, NUMBERED } from './keyboard';

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

describe('quién es el dueño de la tecla', () => {
  const input = { tagName: 'INPUT' };
  const button = { tagName: 'BUTTON' };
  const anchor = { tagName: 'A' };
  const box = { tagName: 'DIV' };

  it('un campo se queda con todas', () => {
    for (const key of ['1', 'e', 'Enter', 'ArrowDown']) {
      expect(ownsKey(input, key)).toBe(true);
    }
    expect(ownsKey({ tagName: 'DIV', isContentEditable: true }, '4')).toBe(true);
  });

  it('un botón y un enlace se quedan solo con las que los activan', () => {
    expect(ownsKey(button, 'Enter')).toBe(true);
    expect(ownsKey(button, ' ')).toBe(true);
    expect(ownsKey(anchor, 'Enter')).toBe(true);
  });

  it('y no con los números ni con la E, que son de la rejilla', () => {
    // Abrir un enlace deja el foco en él, así que si un ancla reclamase los
    // números la aplicación se quedaría sin su atajo principal en cuanto se
    // usara una vez.
    for (const key of ['1', '9', 'e', 'E', 'ArrowRight']) {
      expect(ownsKey(anchor, key)).toBe(false);
      expect(ownsKey(button, key)).toBe(false);
    }
  });

  it('lo que no es un control no reclama nada', () => {
    expect(ownsKey(box, 'Enter')).toBe(false);
    expect(ownsKey(null, 'Enter')).toBe(false);
    expect(ownsKey(undefined, 'Enter')).toBe(false);
  });
});
