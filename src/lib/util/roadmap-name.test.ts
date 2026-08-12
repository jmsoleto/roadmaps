import { describe, it, expect } from 'vitest';
import { nameKey } from './roadmap-name';

describe('nameKey', () => {
  it('ignora mayúsculas y minúsculas', () => {
    expect(nameKey('Plataforma')).toBe(nameKey('plataforma'));
    expect(nameKey('PLATAFORMA')).toBe('plataforma');
  });

  it('ignora los acentos y la eñe', () => {
    expect(nameKey('Diseño')).toBe('diseno');
    expect(nameKey('Diseño')).toBe(nameKey('Diseno'));
    expect(nameKey('Año 1')).toBe(nameKey('Ano 1'));
  });

  it('ignora todos los espacios, también los interiores', () => {
    expect(nameKey('Plan Q1')).toBe('planq1');
    expect(nameKey('PlanQ1')).toBe('planq1');
    expect(nameKey('  Plan  Q1  ')).toBe('planq1');
  });

  it('trata tabuladores y saltos de línea como espacios', () => {
    expect(nameKey('Plan\tQ1\n')).toBe('planq1');
  });

  it('devuelve la cadena vacía para un nombre vacío o de solo espacios', () => {
    expect(nameKey('')).toBe('');
    expect(nameKey('   ')).toBe('');
    expect(nameKey('\t\n ')).toBe('');
  });

  it('no altera el nombre original: solo produce la clave', () => {
    const original = 'Diseño de Producto';
    expect(nameKey(original)).toBe('disenodeproducto');
    expect(original).toBe('Diseño de Producto');
  });

  it('distingue nombres que de verdad son distintos', () => {
    expect(nameKey('Plataforma')).not.toBe(nameKey('Plataforma 2'));
  });
});
