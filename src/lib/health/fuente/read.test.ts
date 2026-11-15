import { describe, it, expect } from 'vitest';
import { ALCANCE, indiceReal, linea } from './fixtures';
import { leerIndice, leerSerie, rutaSerie, type Indice } from './read';

const ok = (i: Indice) => {
  if (i.kind !== 'ok') throw new Error(i.motivo);
  return i;
};

describe('index.json de la fuente', () => {
  it('lee las aplicaciones con su nombre y sus métricas activas, con la consulta efectiva', () => {
    const i = ok(leerIndice(JSON.stringify(indiceReal())));
    expect(i.apps.map((a) => [a.id, a.nombre])).toEqual([
      ['cex-es', 'CEX ES'],
      ['mya', 'MYA'],
    ]);
    const cex = i.apps[0];
    expect(cex.metricas.map((m) => m.id)).toEqual([
      'no-controlados',
      'errores-50x',
      'errores-404',
      'errores-40x',
      'peticiones',
    ]);
    expect(cex.metricas[2].consulta).toBe(`(${ALCANCE}) AND (response.status:404)`);
    expect(cex.metricas[2].hasta).toBe(Date.parse('2026-11-13T21:00:00Z'));
    expect(i.apps[1].metricas[0].consulta).toBe('message:"internal server error"');
    expect(i.avisos).toEqual([]);
  });

  it('no ofrece una métrica retirada, ni avisa de ella', () => {
    const i = ok(leerIndice(JSON.stringify(indiceReal())));
    expect(i.apps[0].metricas.some((m) => m.id === 'antigua')).toBe(false);
    expect(i.avisos).toEqual([]);
  });

  it('ignora la sección dashboards', () => {
    const i = ok(leerIndice(JSON.stringify(indiceReal())));
    expect(i.apps.some((a) => a.id === 'viejo')).toBe(false);
  });

  it('sin index.json pide la carpeta que lo contiene', () => {
    const i = leerIndice(null);
    expect(i.kind === 'error' && i.motivo).toMatch(/contiene index\.json/);
  });

  it('rechaza un formato que no conoce', () => {
    const i = leerIndice(JSON.stringify({ ...indiceReal(), formatVersion: 2 }));
    expect(i.kind === 'error' && i.motivo).toMatch(/formato 2/);
  });

  it('rechaza un JSON roto', () => {
    expect(leerIndice('{"formatVersion": 1,').kind).toBe('error');
  });

  it('avisa de una métrica ilegible o con otro step y lee las demás', () => {
    const raw = indiceReal();
    const cex = (raw.apps as Record<string, { metrics: Record<string, unknown> }>)['cex-es'];
    cex.metrics['errores-404'] = { ...(cex.metrics['errores-404'] as object), step: 1800 };
    cex.metrics['errores-40x'] = { name: 'sin consulta', step: 3600 };
    const i = ok(leerIndice(JSON.stringify(raw)));
    expect(i.apps[0].metricas.map((m) => m.id)).toEqual([
      'no-controlados',
      'errores-50x',
      'peticiones',
    ]);
    expect(i.avisos).toEqual([
      'cex-es/errores-404: usa buckets de 1800 s, y solo se leen los de 3600 s',
      'cex-es/errores-40x: la métrica no se puede leer',
    ]);
  });

  it('la ruta de un mes es relativa a la carpeta elegida', () => {
    expect(rutaSerie('cex-es', 'peticiones', '2026-11').join('/')).toBe(
      'series/cex-es/peticiones/2026-11.jsonl',
    );
  });
});

const H = 3_600_000;
const T0 = Date.parse('2026-11-06T20:00:00Z');
const serie = (texto: string | null, mes = '2026-11') =>
  leerSerie('cex-es/peticiones', new Map([[mes, texto]]));

describe('las series de la fuente', () => {
  it('expande cada línea a horas consecutivas, en orden', () => {
    const s = serie([linea(T0 + 3 * H, [7, 8]), linea(T0, [1, 2, 3])].join('\n'));
    expect([...s.horas]).toEqual([0, 1, 2, 3, 4].map((i) => [T0 + i * H, [1, 2, 3, 7, 8][i]]));
    expect(s.avisos).toEqual([]);
    expect(s.huecos).toEqual([]);
  });

  it('un cero es un dato', () => {
    const s = serie(linea(T0, [0, 0]));
    expect(s.horas.get(T0)).toBe(0);
  });

  it('ignora las líneas vacías', () => {
    const s = serie(`\n${linea(T0, [1])}\n\n`);
    expect(s.horas.size).toBe(1);
    expect(s.avisos).toEqual([]);
  });

  it('salta una línea cortada al final y lee las demás', () => {
    const s = serie(`${linea(T0, [1, 2])}\n{"run":"2026-11-07T`);
    expect(s.horas.size).toBe(2);
    expect(s.avisos).toEqual(['cex-es/peticiones: se saltó 1 línea ilegible en 2026-11.jsonl']);
  });

  it('salta líneas con forma inválida: null, negativos, otro step o sin alinear', () => {
    const malas = [
      JSON.stringify({
        run: '2026-11-07T00:00:00Z',
        from: '2026-11-06T20:00:00Z',
        step: 3600,
        v: [1, null],
      }),
      JSON.stringify({
        run: '2026-11-07T00:00:00Z',
        from: '2026-11-06T20:00:00Z',
        step: 3600,
        v: [-1],
      }),
      JSON.stringify({
        run: '2026-11-07T00:00:00Z',
        from: '2026-11-06T20:00:00Z',
        step: 1800,
        v: [1],
      }),
      JSON.stringify({
        run: '2026-11-07T00:00:00Z',
        from: '2026-11-06T20:30:00Z',
        step: 3600,
        v: [1],
      }),
      JSON.stringify({
        run: '2026-11-07T00:00:00Z',
        from: '2026-11-06T20:00:00+01:00',
        step: 3600,
        v: [1],
      }),
    ];
    const s = serie(malas.join('\n'));
    expect(s.horas.size).toBe(0);
    expect(s.avisos).toEqual([
      'cex-es/peticiones: se saltaron 5 líneas ilegibles en 2026-11.jsonl',
    ]);
  });

  it('deja sin dato las horas entre dos líneas que no se tocan, y lo avisa', () => {
    const s = serie([linea(T0, [1, 1]), linea(T0 + 5 * H, [2])].join('\n'));
    expect(s.horas.has(T0 + 2 * H)).toBe(false);
    expect(s.huecos).toEqual([{ desde: T0 + 2 * H, hasta: T0 + 5 * H }]);
    expect(s.avisos).toEqual(['cex-es/peticiones: un hueco sin datos (3 horas)']);
  });

  it('una hora repetida no se suma: gana la ejecución más reciente, con aviso', () => {
    const s = serie([linea(T0, [1, 5], T0 + 2 * H), linea(T0 + H, [9, 3], T0 + 10 * H)].join('\n'));
    expect(s.horas.get(T0 + H)).toBe(9);
    expect(s.avisos).toEqual([
      'cex-es/peticiones: una hora aparece en más de una ejecución; se usa la más reciente',
    ]);
  });

  it('lee varios meses y avisa del que falta', () => {
    const dic = Date.parse('2026-12-01T00:00:00Z');
    const s = leerSerie(
      'cex-es/peticiones',
      new Map<string, string | null>([
        ['2026-12', linea(dic, [4])],
        ['2026-11', linea(dic - H, [3])],
        ['2027-01', null],
      ]),
    );
    expect([...s.horas.values()]).toEqual([3, 4]);
    expect(s.avisos).toEqual(['cex-es/peticiones: falta el fichero 2027-01.jsonl']);
  });
});
