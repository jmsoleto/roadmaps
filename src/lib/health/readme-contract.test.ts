/**
 * The example in the README is the contract agents will copy, so it is checked
 * against the code that reads it: if the format changes, this says the README lies.
 */

import { describe, it, expect } from 'vitest';
import readme from '../../../README.md?raw';
import { leerEntrada } from './inbox';
import { entraSola, fusionar } from './merge';
import { metricasIniciales } from './model';

const bloque = /```json\n(\{\n\s*"format"[\s\S]*?)```/.exec(readme);

describe('el ejemplo de entrada del README', () => {
  it('es una entrada válida, que entra sola y se consolida', () => {
    expect(bloque).not.toBeNull();
    const l = leerEntrada('entrada-ejemplo.json', bloque![1], 'Europe/Madrid');
    if (l.kind !== 'valida') throw new Error(l.motivo);

    const conocidas = {
      aplicaciones: new Set(['pedidos']),
      metricas: new Set(metricasIniciales().map((m) => m.id)),
    };
    expect(entraSola(l.entrada, conocidas)).toBe(true);
    const f = fusionar({}, l.entrada, conocidas);
    expect(f.aplicadas).toBe(l.entrada.filas.length);
    expect(f.ignoradas).toEqual([]);
  });
});

describe('el catálogo que el README manda poner a mano', () => {
  it('es el de una carpeta nueva', () => {
    const lista = /```json\n(\[\n\s*\{ "id": "no-controlados"[\s\S]*?)```/.exec(readme);
    expect(lista).not.toBeNull();
    expect(JSON.parse(lista![1])).toEqual(metricasIniciales());
  });
});
