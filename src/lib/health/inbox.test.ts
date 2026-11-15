import { describe, it, expect } from 'vitest';
import { borrarEntrada, leerBandeja, leerEntrada, type LecturaEntrada } from './inbox';
import { MemoryDir } from '../folder/memory-fs';
import { writeText, readAll } from '../folder/fs';

const ZONA = 'Europe/Madrid';

const base = {
  format: 1,
  fuente: 'kibana',
  capturado: '2026-11-07',
  zona: ZONA,
  filas: [{ app: 'pedidos', metrica: 'errores-50x', dia: '2026-11-05', valor: 340 }],
};

const leer = (v: unknown, texto = JSON.stringify(v)): LecturaEntrada =>
  leerEntrada('entrada-1.json', texto, ZONA);

const motivo = (l: LecturaEntrada) => (l.kind === 'rechazada' ? l.motivo : null);

describe('una entrada de la bandeja', () => {
  it('se acepta si cumple el formato', () => {
    const l = leer(base);
    expect(l.kind).toBe('valida');
    if (l.kind === 'valida') expect(l.entrada.filas[0].estimado).toBe(false);
  });

  it('de pantallazo es estimada aunque no lo declare', () => {
    const l = leer({ ...base, fuente: 'pantallazo' });
    if (l.kind !== 'valida') throw new Error('debía ser válida');
    expect(l.entrada.filas[0].estimado).toBe(true);
  });

  it.each([
    ['no es JSON', undefined, '{ esto no', /JSON/],
    ['otra versión del formato', { ...base, format: 2 }, undefined, /format/],
    ['una fuente desconocida', { ...base, fuente: 'grafana' }, undefined, /fuente/],
    ['una fecha de captura mala', { ...base, capturado: 'ayer' }, undefined, /capturado/],
    ['otra zona horaria', { ...base, zona: 'UTC' }, undefined, /comparables/],
    ['sin filas', { ...base, filas: [] }, undefined, /filas/],
    [
      'un valor negativo',
      { ...base, filas: [{ ...base.filas[0], valor: -1 }] },
      undefined,
      /fila 1 .*entero/,
    ],
    [
      'un valor con decimales',
      { ...base, filas: [{ ...base.filas[0], valor: 1.5 }] },
      undefined,
      /fila 1 .*entero/,
    ],
    [
      'un día que no es una fecha',
      { ...base, filas: [{ ...base.filas[0], dia: '5 nov' }] },
      undefined,
      /fila 1 .*fecha/,
    ],
    [
      'una fila que se contradice con otra',
      { ...base, filas: [base.filas[0], { ...base.filas[0], valor: 1 }] },
      undefined,
      /contradice/,
    ],
  ])('se rechaza con %s', (_, v, texto, esperado) => {
    expect(motivo(leer(v, texto))).toMatch(esperado);
  });
});

describe('la bandeja de una carpeta', () => {
  it('lee cada fichero por separado y no se cae por uno roto', async () => {
    const dir = new MemoryDir('health');
    await writeText(dir, 'entrada-b.json', JSON.stringify(base));
    await writeText(dir, 'entrada-a.json', 'roto');
    await writeText(dir, 'obs-pedidos-2026-11.json', '{}');
    const bandeja = await leerBandeja(dir, ZONA);
    expect(bandeja.map((e) => e.kind)).toEqual(['rechazada', 'valida']);
  });

  it('solo sabe borrar sus propios ficheros', async () => {
    const dir = new MemoryDir('health');
    await writeText(dir, 'catalogo.json', '{}');
    await expect(borrarEntrada(dir, 'catalogo.json')).rejects.toThrow();
    expect((await readAll(dir)).has('catalogo.json')).toBe(true);
  });
});
