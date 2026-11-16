import { describe, it, expect } from 'vitest';
import { lineaDespliegue } from './fuente/fixtures';
import { leerLineaDespliegue } from './fuente/despliegues';
import { abreComparacion, marcaDespliegue, nombreMarca, ultimaVersion } from './marcas';

const zona = 'Europe/Madrid';
const d = (campos: Record<string, unknown> = {}) => leerLineaDespliegue(lineaDespliegue(campos))!;

describe('la última versión de una aplicación', () => {
  it('un release posterior a la última manual gana, marcado como despliegue', () => {
    const v = [{ id: 'a', version: '0.0.500', dia: '2026-10-20' }];
    expect(ultimaVersion(v, d(), zona)).toEqual({
      version: '0.0.543',
      dia: '2026-11-03',
      origen: 'despliegue',
    });
  });

  it('una manual posterior gana', () => {
    const v = [{ id: 'a', version: '0.0.600', dia: '2026-11-10' }];
    expect(ultimaVersion(v, d(), zona)?.origen).toBe('manual');
  });

  it('el mismo día gana el despliegue, que tiene hora', () => {
    const v = [{ id: 'a', version: 'x', dia: '2026-11-03' }];
    expect(ultimaVersion(v, d(), zona)?.origen).toBe('despliegue');
  });

  it('sin ninguna de las dos no hay última versión', () => {
    expect(ultimaVersion([], null, zona)).toBeNull();
  });
});

describe('qué marca abre la comparación', () => {
  it('solo los despliegues con éxito, de cualquier tipo', () => {
    expect(abreComparacion(marcaDespliegue(d(), zona))).toBe(true);
    expect(abreComparacion(marcaDespliegue(d({ kind: 'rollback' }), zona))).toBe(true);
    expect(abreComparacion(marcaDespliegue(d({ result: 'failure' }), zona))).toBe(false);
    expect(abreComparacion(marcaDespliegue(d({ result: 'cancelled' }), zona))).toBe(false);
  });

  it('un despliegue sin versión se nombra por su run', () => {
    expect(nombreMarca(marcaDespliegue(d({ version: null, runId: 7 }), zona))).toBe('run 7');
  });
});
