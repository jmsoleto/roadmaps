import { describe, it, expect } from 'vitest';
import { entraSola, fusionar, ultimoDiaEntrada, type Conocidas } from './merge';
import type { Entrada, FilaEntrada } from './inbox';
import type { Observacion } from './model';

const conocidas: Conocidas = {
  aplicaciones: new Set(['pedidos']),
  metricas: new Set(['errores-50x']),
};

const fila = (dia: string, valor: number, extra: Partial<FilaEntrada> = {}): FilaEntrada => ({
  app: 'pedidos',
  metrica: 'errores-50x',
  dia,
  valor,
  estimado: false,
  ...extra,
});

const entrada = (
  capturado: string,
  filas: FilaEntrada[],
  extra: Partial<Entrada> = {},
): Entrada => ({
  fichero: 'entrada-1.json',
  fuente: 'kibana',
  capturado,
  zona: 'Europe/Madrid',
  filas,
  ...extra,
});

const obs = (dia: string, valor: number, extra: Partial<Observacion> = {}): Observacion => ({
  dia,
  metrica: 'errores-50x',
  valor,
  fuente: 'kibana',
  capturado: '2026-11-07',
  ...extra,
});

describe('qué días de una captura son válidos', () => {
  it('el día de la captura no entra, porque no ha terminado', () => {
    const r = fusionar(
      {},
      entrada('2026-11-07', [fila('2026-11-07', 5), fila('2026-11-08', 5)]),
      conocidas,
    );
    expect(r.aplicadas).toBe(0);
    expect(r.ignoradas.map((i) => i.motivo)).toEqual(['dia-no-cerrado', 'dia-no-cerrado']);
  });

  it('el día del borde no machaca un dato bueno', () => {
    const antes = { pedidos: [obs('2026-11-01', 900)] };
    const r = fusionar(antes, entrada('2026-11-08', [fila('2026-11-01', 100)]), conocidas);
    expect(r.ignoradas[0].motivo).toBe('fuera-de-ventana');
    expect(r.observaciones.pedidos[0].valor).toBe(900);
  });

  it('la ventana se cuenta desde la captura, no desde que se consolida', () => {
    const r = fusionar({}, entrada('2026-11-01', [fila('2026-10-26', 5)]), conocidas);
    expect(r.aplicadas).toBe(1);
  });

  it('un pantallazo puede traer cualquier fecha anterior', () => {
    const e = entrada('2026-11-07', [fila('2026-08-01', 5, { estimado: true })], {
      fuente: 'pantallazo',
    });
    const r = fusionar({}, e, conocidas);
    expect(r.aplicadas).toBe(1);
    expect(r.observaciones.pedidos[0].estimado).toBe(true);
  });
});

describe('cuando dos valores compiten por el mismo día', () => {
  it('uno exacto reemplaza a uno estimado, aunque valgan lo mismo', () => {
    const antes = { pedidos: [obs('2026-11-05', 5, { estimado: true, fuente: 'pantallazo' })] };
    const r = fusionar(antes, entrada('2026-11-06', [fila('2026-11-05', 5)]), conocidas);
    expect(r.aplicadas).toBe(1);
    expect(r.observaciones.pedidos[0].estimado).toBeUndefined();
  });

  it('uno estimado no reemplaza a uno exacto', () => {
    const antes = { pedidos: [obs('2026-11-05', 5)] };
    const e = entrada('2026-11-08', [fila('2026-11-05', 99, { estimado: true })], {
      fuente: 'pantallazo',
    });
    const r = fusionar(antes, e, conocidas);
    expect(r.ignoradas[0].motivo).toBe('exacto-existente');
    expect(r.observaciones.pedidos[0].valor).toBe(5);
  });

  it('entre dos del mismo tipo gana la captura más reciente', () => {
    const antes = { pedidos: [obs('2026-11-05', 5, { capturado: '2026-11-06' })] };
    const nueva = fusionar(antes, entrada('2026-11-08', [fila('2026-11-05', 7)]), conocidas);
    expect(nueva.observaciones.pedidos[0].valor).toBe(7);

    const vieja = fusionar(
      nueva.observaciones,
      entrada('2026-11-06', [fila('2026-11-05', 1)]),
      conocidas,
    );
    expect(vieja.ignoradas[0].motivo).toBe('captura-anterior');
    expect(vieja.observaciones.pedidos[0].valor).toBe(7);
  });

  it('un valor igual deja la observación intacta, sin tocar su fecha de captura', () => {
    const antes = { pedidos: [obs('2026-11-05', 5, { capturado: '2026-11-06' })] };
    const r = fusionar(antes, entrada('2026-11-08', [fila('2026-11-05', 5)]), conocidas);
    expect(r.sinCambios).toBe(1);
    expect(r.aplicadas).toBe(0);
    expect(r.observaciones.pedidos[0].capturado).toBe('2026-11-06');
  });

  it('repetir la misma entrada no cambia nada', () => {
    const e = entrada('2026-11-07', [fila('2026-11-05', 5), fila('2026-11-06', 6)]);
    const una = fusionar({}, e, conocidas);
    const dos = fusionar(una.observaciones, e, conocidas);
    expect(dos.aplicadas).toBe(0);
    expect(dos.observaciones).toEqual(una.observaciones);
  });

  it('no modifica lo que recibe', () => {
    const antes = { pedidos: [obs('2026-11-05', 5)] };
    fusionar(antes, entrada('2026-11-08', [fila('2026-11-05', 7)]), conocidas);
    expect(antes.pedidos[0].valor).toBe(5);
    expect(antes.pedidos).toHaveLength(1);
  });
});

describe('qué entra solo', () => {
  it('una captura exacta de cosas conocidas', () => {
    expect(entraSola(entrada('2026-11-07', [fila('2026-11-05', 5)]), conocidas)).toBe(true);
  });

  it('no un pantallazo', () => {
    const e = entrada('2026-11-07', [fila('2026-11-05', 5, { estimado: true })], {
      fuente: 'pantallazo',
    });
    expect(entraSola(e, conocidas)).toBe(false);
  });

  it('no una aplicación o una métrica desconocida, y al fusionar no se crean', () => {
    const app = entrada('2026-11-07', [fila('2026-11-05', 5, { app: 'otra' })]);
    const metrica = entrada('2026-11-07', [fila('2026-11-05', 5, { metrica: '418' })]);
    expect(entraSola(app, conocidas)).toBe(false);
    expect(entraSola(metrica, conocidas)).toBe(false);

    const r = fusionar({}, app, conocidas);
    expect(r.ignoradas[0].motivo).toBe('aplicacion-desconocida');
    expect(r.observaciones).toEqual({});
  });
});

describe('el último día que aporta una entrada', () => {
  it('no cuenta días que su captura no puede avalar', () => {
    const e = entrada('2026-11-07', [
      fila('2026-11-07', 5),
      fila('2026-11-05', 5),
      fila('2026-11-06', 5),
    ]);
    expect(ultimoDiaEntrada(e, 'pedidos')).toBe('2026-11-06');
    expect(ultimoDiaEntrada(e, 'otra')).toBeNull();
  });
});
