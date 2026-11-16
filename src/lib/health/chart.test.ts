import { describe, it, expect } from 'vitest';
import * as chart from './chart';
import { addDays } from '../time/timeline';
import {
  aislados,
  escalaY,
  formatoEje,
  formatoVariacion,
  pathDe,
  puntos,
  rango,
  ticksMes,
  tramos,
  tramosMedia,
} from './chart';
import type { Observacion } from './model';

const obs = (dia: string, valor: number, estimado = false): Observacion => ({
  dia,
  metrica: 'errores-50x',
  valor,
  fuente: 'kibana',
  capturado: '2026-11-07',
  ...(estimado ? { estimado: true as const } : {}),
});

const serie = (desde: string, n: number, valor = 10) =>
  Array.from({ length: n }, (_, i) => obs(addDays(desde, i), valor));

describe('los puntos de una serie', () => {
  it('un día sin medir es un hueco, y un cero es un valor', () => {
    const pts = puntos(
      [obs('2026-10-01', 5), obs('2026-10-03', 0)],
      'errores-50x',
      '2026-10-01',
      '2026-10-03',
    );
    expect(pts.map((p) => p.valor)).toEqual([5, null, 0]);
  });

  it('solo mira su métrica', () => {
    const otra = { ...obs('2026-10-01', 5), metrica: 'errores-40x' };
    expect(puntos([otra], 'errores-50x', '2026-10-01', '2026-10-01')[0].valor).toBeNull();
  });

  it('la media móvil exige los 7 días, también los anteriores al periodo', () => {
    const filas = serie('2026-10-01', 10);
    expect(puntos(filas, 'errores-50x', '2026-10-06', '2026-10-07').map((p) => p.media)).toEqual([
      null,
      10,
    ]);
  });

  it('un hueco deja sin media los 7 días siguientes', () => {
    const filas = serie('2026-10-01', 20).filter((o) => o.dia !== '2026-10-10');
    const pts = puntos(filas, 'errores-50x', '2026-10-09', '2026-10-17');
    expect(pts.map((p) => p.media !== null)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });
});

describe('los tramos de la línea', () => {
  const pts = (valores: (number | null)[], estimados: number[] = []) =>
    valores.map((valor, i) => ({
      dia: addDays('2026-10-01', i),
      valor,
      estimado: estimados.includes(i),
      media: null,
    }));

  it('un hueco corta la línea', () => {
    expect(tramos(pts([1, 2, null, 3, 4]))).toEqual([
      { desde: 0, hasta: 1, estimado: false },
      { desde: 3, hasta: 4, estimado: false },
    ]);
  });

  it('separa lo estimado de lo exacto', () => {
    expect(tramos(pts([1, 2, 3, 4], [2]))).toEqual([
      { desde: 0, hasta: 1, estimado: false },
      { desde: 1, hasta: 3, estimado: true },
    ]);
  });

  it('un día medido entre dos huecos es un punto aislado', () => {
    expect(aislados(pts([null, 1, null, 2, 3]))).toEqual([1]);
  });

  it('la media también se corta donde no existe', () => {
    const conMedia = [null, 1, 2, null, 3, 4].map((media, i) => ({
      dia: addDays('2026-10-01', i),
      valor: 1,
      estimado: false,
      media,
    }));
    expect(tramosMedia(conMedia)).toEqual([
      { desde: 1, hasta: 2 },
      { desde: 4, hasta: 5 },
    ]);
  });

  it('dibuja su trazado', () => {
    expect(
      pathDe(
        0,
        1,
        (i) => i * 10,
        () => 5,
      ),
    ).toBe('M0.0 5.0 L10.0 5.0');
  });
});

describe('el periodo', () => {
  it('cuenta hacia atrás desde el último día', () => {
    expect(rango('30', '2020-01-01', '2026-11-06')).toEqual({
      desde: '2026-10-08',
      hasta: '2026-11-06',
    });
  });

  it('«todo» empieza en el primer dato', () => {
    expect(rango('todo', '2026-01-01', '2026-11-06')?.desde).toBe('2026-01-01');
  });

  it('sin datos no hay rango', () => {
    expect(rango('30', null, null)).toBeNull();
  });
});

describe('los ejes', () => {
  it('el tope cubre el máximo con pocas divisiones', () => {
    for (const max of [1, 3, 7, 87, 340, 1204, 9412, 1_204_000]) {
      const { tope, ticks } = escalaY(max);
      expect(tope).toBeGreaterThanOrEqual(max);
      expect(ticks.length).toBeLessThanOrEqual(5);
      expect(ticks[0]).toBe(0);
    }
  });

  it('solo marca enteros', () => {
    expect(escalaY(2).ticks.every(Number.isInteger)).toBe(true);
  });

  it('sin errores sigue teniendo un eje', () => {
    expect(escalaY(0).tope).toBe(1);
  });

  it('marca los meses y los aclara si son muchos', () => {
    const pts = puntos([], 'errores-50x', '2025-01-15', '2026-11-06');
    const ticks = ticksMes(pts);
    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks[0].etiqueta).toBe('feb');
  });

  it('abrevia las cifras grandes', () => {
    expect(formatoEje(1_200_000)).toBe('1,2 M');
    expect(formatoEje(45_000)).toBe('45 k');
    expect(formatoEje(340)).toBe('340');
  });
});

describe('la variación como texto', () => {
  it('lleva flecha y signo, para no depender del color', () => {
    expect(formatoVariacion(0.384)).toBe('▲ +38 %');
    expect(formatoVariacion(-0.12)).toBe('▼ −12 %');
    expect(formatoVariacion(0)).toBe('= 0 %');
  });

  it('sin base con la que comparar dice que es nuevo', () => {
    expect(formatoVariacion(null)).toBe('nuevo');
  });
});

describe('la vista por horas', () => {
  const H = 3_600_000;
  const Z = 'Europe/Madrid';
  const HASTA = Date.parse('2026-11-13T21:00:00Z');

  it('da las 168 horas que terminan en «datos hasta», y una hora sin dato es un hueco', () => {
    const horas = new Map<number, number | null>([
      [HASTA - H, 5],
      [HASTA - 2 * H, null],
    ]);
    const pts = chart.puntosHora(horas, HASTA);
    expect(pts).toHaveLength(168);
    expect(pts[0].t).toBe(HASTA - 168 * H);
    expect(pts[167]).toEqual({ t: HASTA - H, valor: 5, estimado: false });
    expect(pts[166].valor).toBeNull();
    expect(pts[0].valor).toBeNull();
  });

  it('un hueco corta la línea por horas igual que la diaria', () => {
    const horas = new Map([HASTA - 4 * H, HASTA - 3 * H, HASTA - H].map((t) => [t, 1]));
    const pts = chart.puntosHora(horas, HASTA, 4);
    expect(chart.tramos(pts)).toEqual([{ desde: 0, hasta: 1, estimado: false }]);
    expect(chart.aislados(pts)).toEqual([3]);
  });

  it('marca cada medianoche de Madrid con el día de la semana', () => {
    const pts = chart.puntosHora(new Map(), HASTA, 48);
    const ticks = chart.ticksDia(pts, Z);
    expect(ticks).toHaveLength(2);
    // 23:00Z is midnight in Madrid in November.
    expect(new Date(pts[ticks[0].indice].t).toISOString()).toBe('2026-11-11T23:00:00.000Z');
    expect(ticks[0].etiqueta).toMatch(/^jue\.? 12$/);
  });

  it('una subida se marca al inicio de su día, y fuera de la ventana no', () => {
    const pts = chart.puntosHora(new Map(), HASTA, 48);
    const i = chart.indiceDeDia(pts, '2026-11-12', Z)!;
    expect(new Date(pts[i].t).toISOString()).toBe('2026-11-11T23:00:00.000Z');
    expect(chart.indiceDeDia(pts, '2026-11-01', Z)).toBeNull();
  });

  it('la tasa se lee en porcentaje, y sin tasa no es 0 %', () => {
    expect(chart.formatoTasa(0.0132)).toBe('1,32 %');
    expect(chart.formatoTasa(null)).toBe('sin tasa');
  });
});

describe('una variación sin base', () => {
  it('es «nuevo» solo si cuenta como subida; de 0 a 0 no da porcentaje', () => {
    expect(chart.formatoVariacion(null)).toBe('nuevo');
    expect(chart.formatoVariacion(null, false)).toBe('—');
  });
});

describe('el punto bajo el puntero', () => {
  it('lee el punto que hay debajo, sin desfase, de punta a punta', () => {
    expect(chart.indiceBajoPuntero(0, 600, 7)).toBe(0);
    expect(chart.indiceBajoPuntero(300, 600, 7)).toBe(3);
    expect(chart.indiceBajoPuntero(600, 600, 7)).toBe(6);
  });

  it('fuera de la zona de datos no hay punto', () => {
    expect(chart.indiceBajoPuntero(-60, 600, 7)).toBeNull();
    expect(chart.indiceBajoPuntero(660, 600, 7)).toBeNull();
    expect(chart.indiceBajoPuntero(10, 600, 0)).toBeNull();
  });
});
