import { describe, it, expect } from 'vitest';
import { addDays } from '../time/timeline';
import { metricasIniciales, type Catalogo, type Observacion, type Vigilada } from './model';
import { lineaDespliegue } from './fuente/fixtures';
import { leerLineaDespliegue, type Despliegue } from './fuente/despliegues';
import { marcaDespliegue, marcaManual, marcasDe, type Marca } from './marcas';
import {
  captura,
  compararHoras,
  compararMarca,
  indexar,
  ordenarPorSalud,
  salud,
  tendencia,
  textoCaptura,
  type Salud,
} from './trends';

const catalogo: Catalogo = { zona: 'Europe/Madrid', metricas: metricasIniciales() };
const m = (id: string) => catalogo.metricas.find((x) => x.id === id)!;
const FIN = '2026-11-06';

const obs = (metrica: string, dia: string, valor: number, estimado = false): Observacion => ({
  dia,
  metrica,
  valor,
  fuente: 'kibana',
  capturado: '2026-11-07',
  ...(estimado ? { estimado: true as const } : {}),
});

/** Two weeks ending at `fin`: the earlier one per day at `antes`, the later at `despues`. */
function semanas(metrica: string, antes: number, despues: number, fin = FIN): Observacion[] {
  const out: Observacion[] = [];
  for (let i = 0; i < 14; i++) {
    out.push(obs(metrica, addDays(fin, -i), i < 7 ? despues : antes));
  }
  return out;
}

const tend = (filas: Observacion[], id: string, peticiones: string | null = 'peticiones') =>
  tendencia(indexar(filas), m(id), FIN, peticiones);

describe('la tendencia de una métrica', () => {
  it('sube o baja al superar el umbral de su clase', () => {
    expect(tend(semanas('errores-50x', 100, 125), 'errores-50x').estado).toBe('sube');
    expect(tend(semanas('errores-50x', 100, 75), 'errores-50x').estado).toBe('baja');
    expect(tend(semanas('errores-50x', 100, 110), 'errores-50x').estado).toBe('estable');
  });

  it('exige más a los errores de cliente', () => {
    expect(tend(semanas('errores-40x', 100, 140), 'errores-40x').estado).toBe('estable');
    expect(tend(semanas('errores-40x', 100, 150), 'errores-40x').estado).toBe('sube');
  });

  it('un cambio pequeño en cifras pequeñas está estable, aunque sea un 100 %', () => {
    const filas = semanas('errores-50x', 0, 0).map((o, i) => ({
      ...o,
      valor: i === 0 ? 8 : i === 7 ? 4 : 0,
    }));
    const t = tend(filas, 'errores-50x');
    expect(t.variacion).toBe(1);
    expect(t.estado).toBe('estable');
  });

  it('más errores con más tráfico: la tasa no cambia y está estable', () => {
    const filas = [...semanas('errores-50x', 100, 200), ...semanas('peticiones', 1000, 2000)];
    const t = tend(filas, 'errores-50x');
    expect(t.base).toBe('tasa');
    expect(t.estado).toBe('estable');
  });

  it('sin peticiones compara el recuento, y lo dice', () => {
    expect(tend(semanas('errores-50x', 100, 200), 'errores-50x').base).toBe('recuento');
  });

  it('con peticiones incompletas también compara el recuento', () => {
    const peticiones = semanas('peticiones', 1000, 2000).slice(1);
    const t = tend([...semanas('errores-50x', 100, 200), ...peticiones], 'errores-50x');
    expect(t.base).toBe('recuento');
    expect(t.estado).toBe('sube');
  });

  it('con peticiones a 0 no hay tasa: compara el recuento', () => {
    const t = tend(
      [...semanas('errores-50x', 100, 200), ...semanas('peticiones', 0, 1000)],
      'errores-50x',
    );
    expect(t.base).toBe('recuento');
  });

  it('pasar de 0 a un valor que cumple el mínimo es una subida sin porcentaje', () => {
    const t = tend(semanas('errores-50x', 0, 10), 'errores-50x');
    expect(t.estado).toBe('sube');
    expect(t.variacion).toBeNull();
  });

  it('si falta un día da «sin datos», no un porcentaje', () => {
    const t = tend(semanas('errores-50x', 100, 200).slice(1), 'errores-50x');
    expect(t.estado).toBe('sin-datos');
    expect(t.variacion).toBeNull();
  });

  it('un cero medido no es un día que falta', () => {
    expect(tend(semanas('errores-50x', 0, 0), 'errores-50x').estado).toBe('estable');
  });

  it('avisa si alguno de los valores es estimado', () => {
    const filas = semanas('errores-50x', 100, 100);
    filas[3] = { ...filas[3], estimado: true };
    expect(tend(filas, 'errores-50x').estimado).toBe(true);
  });
});

describe('la salud de una aplicación vigilada', () => {
  const HOY = '2026-11-07';
  const estable = [...semanas('errores-50x', 100, 100), ...semanas('no-controlados', 100, 100)];
  const sal = (filas: Observacion[], hoy = HOY) => salud(filas, catalogo, hoy);

  it('sin datos si ninguna métrica propia tiene tendencia', () => {
    expect(sal([]).estado).toBe('sin-datos');
    expect(sal(semanas('errores-40x', 100, 900)).estado).toBe('sin-datos');
  });

  it('sin captura si ya se han perdido días', () => {
    expect(sal(estable, '2026-11-20').estado).toBe('sin-captura');
  });

  it('empeora si sube un error propio, y dice cuál', () => {
    const filas = [...semanas('errores-50x', 100, 140), ...semanas('no-controlados', 100, 100)];
    const s = sal(filas);
    expect(s.estado).toBe('empeora');
    expect(s.motivo).toEqual(['50x']);
  });

  it('vigilar, y no empeora, si solo sube un error de cliente', () => {
    const s = sal([...estable, ...semanas('errores-40x', 100, 200)]);
    expect(s.estado).toBe('vigilar');
    expect(s.motivo).toEqual(['40x (sin 404)']);
  });

  it('empeora gana a vigilar', () => {
    const filas = [...semanas('errores-50x', 100, 140), ...semanas('errores-40x', 100, 200)];
    expect(sal(filas).estado).toBe('empeora');
  });

  it('mejora si baja un error propio y no sube ninguno', () => {
    expect(sal(semanas('errores-50x', 100, 50)).estado).toBe('mejora');
  });

  it('estable en cualquier otro caso', () => {
    expect(sal(estable).estado).toBe('estable');
  });

  it('una captura de hace días no impide calcular la tendencia', () => {
    const fin = '2026-11-02';
    const s = sal(semanas('errores-50x', 100, 140, fin));
    expect(s.estado).toBe('empeora');
    expect(s.captura?.restantes).toBe(2);
  });

  it('lo que espera en la bandeja cuenta para la captura', () => {
    const s = salud(estable, catalogo, '2026-11-20', '2026-11-19');
    expect(s.estado).toBe('estable');
    expect(s.captura?.restantes).toBe(6);
  });

  it('ordena de peor a mejor y, dentro de cada estado, por nombre', () => {
    const fila = (nombre: string, estado: Salud['estado']) => ({
      nombre,
      salud: { estado } as Salud,
    });
    const orden = ordenarPorSalud([
      fila('Zeta', 'mejora'),
      fila('Beta', 'estable'),
      fila('Álamo', 'estable'),
      fila('Gamma', 'sin-datos'),
      fila('Delta', 'vigilar'),
      fila('Omega', 'sin-captura'),
      fila('Rho', 'empeora'),
    ]);
    expect(orden.map((f) => f.nombre)).toEqual([
      'Rho',
      'Omega',
      'Delta',
      'Gamma',
      'Álamo',
      'Beta',
      'Zeta',
    ]);
  });
});

describe('el aviso de captura', () => {
  const HOY = '2026-11-07';
  const hace = (n: number) => captura(addDays(HOY, -n), HOY)!;

  it('con la captura al día quedan 6 días y no hay aviso', () => {
    expect(hace(1)).toMatchObject({ restantes: 6, aviso: false, tono: 'neutral' });
  });

  it('con 2 días avisa con tono de advertencia', () => {
    expect(hace(5)).toMatchObject({ restantes: 2, aviso: true, tono: 'warn' });
    expect(textoCaptura(hace(5))).toBe('quedan 2 días');
  });

  it('con 0 avisa con tono de peligro', () => {
    expect(hace(7)).toMatchObject({ restantes: 0, tono: 'danger', perdidos: 0 });
  });

  it('con menos de 0 dice cuántos se han perdido', () => {
    expect(hace(9)).toMatchObject({ restantes: -2, perdidos: 2, tono: 'danger' });
    expect(textoCaptura(hace(9))).toBe('se han perdido 2 días');
  });

  it('sin observaciones no hay nada que avisar', () => {
    expect(captura(null, HOY)).toBeNull();
  });
});

describe('la comparación antes y después de una subida', () => {
  const DIA = '2026-10-20';
  const HOY = '2026-11-07';
  const version = { id: 'v', version: '4.2.0', dia: DIA };
  const app = (otras: { id: string; version: string; dia: string }[] = []): Vigilada => ({
    id: 'pedidos',
    nombre: 'Pedidos',
    consultas: {},
    versiones: [version, ...otras],
  });
  /** A manual release compared among the marks of `a`, with no deployments. */
  const compararVersion = (
    v: typeof version,
    a: Vigilada,
    filas: Observacion[],
    cat: Catalogo,
    hoy: string,
  ) => compararMarca(marcaManual(v), marcasDe(a, [], cat.zona), filas, cat, hoy);

  /** A week before at `antes`, the day itself at `dia`, a week after at `despues`. */
  function alrededor(metrica: string, antes: number, despues: number, dia = 9999): Observacion[] {
    const out: Observacion[] = [obs(metrica, DIA, dia)];
    for (let i = 1; i <= 7; i++) {
      out.push(obs(metrica, addDays(DIA, -i), antes), obs(metrica, addDays(DIA, i), despues));
    }
    return out;
  }

  const de = (c: ReturnType<typeof compararVersion>, id: string) =>
    c.metricas.find((x) => x.metrica.id === id)!;

  it('con 7 días a cada lado da las medias y la variación, sin contar el día de la subida', () => {
    const c = compararVersion(version, app(), alrededor('errores-50x', 100, 130), catalogo, HOY);
    expect(de(c, 'errores-50x')).toMatchObject({
      kind: 'completa',
      mediaAntes: 100,
      mediaDespues: 130,
      base: 'recuento',
    });
    const r = de(c, 'errores-50x');
    if (r.kind === 'completa') expect(r.variacion).toBeCloseTo(0.3);
  });

  it('usa la tasa si hay peticiones', () => {
    const filas = [...alrededor('errores-50x', 100, 200), ...alrededor('peticiones', 1000, 2000)];
    const r = de(compararVersion(version, app(), filas, catalogo, HOY), 'errores-50x');
    expect(r).toMatchObject({ kind: 'completa', base: 'tasa', variacion: 0 });
  });

  it('con una subida reciente dice cuántos días quedan, sin porcentaje', () => {
    const c = compararVersion(
      version,
      app(),
      alrededor('errores-50x', 100, 130),
      catalogo,
      addDays(DIA, 3),
    );
    expect(de(c, 'errores-50x')).toMatchObject({ kind: 'pendiente', quedan: 5 });
  });

  it('el día después de cerrar la ventana ya compara', () => {
    const c = compararVersion(
      version,
      app(),
      alrededor('errores-50x', 100, 130),
      catalogo,
      addDays(DIA, 8),
    );
    expect(de(c, 'errores-50x').kind).toBe('completa');
  });

  it('si falta un día que ya no llegará, dice que no hay datos suficientes', () => {
    const filas = alrededor('errores-50x', 100, 130).filter((o) => o.dia !== addDays(DIA, -3));
    expect(de(compararVersion(version, app(), filas, catalogo, HOY), 'errores-50x')).toMatchObject({
      kind: 'insuficiente',
      faltan: 1,
    });
  });

  it('avisa de otra subida en cualquiera de las ventanas', () => {
    const cerca = { id: 'w', version: '4.2.1', dia: addDays(DIA, 4) };
    const lejos = { id: 'x', version: '4.1.0', dia: addDays(DIA, -8) };
    const c = compararVersion(version, app([cerca, lejos]), [], catalogo, HOY);
    expect(c.otras.map((v) => v.id)).toEqual(['w']);
  });

  /** A deployment finished at noon UTC of `dia`. */
  const desp = (runId: number, dia: string, campos: Record<string, unknown> = {}): Despliegue =>
    leerLineaDespliegue(
      lineaDespliegue({
        runId,
        finishedAt: `${dia}T12:00:00Z`,
        version: `0.0.${runId}`,
        ...campos,
      }),
    )!;
  const marcas = (...d: Despliegue[]): Marca[] => marcasDe(app(), d, catalogo.zona);

  it('un despliegue con éxito abre la comparación en el día de su finishedAt', () => {
    const d = desp(1, DIA);
    const c = compararMarca(
      marcaDespliegue(d, catalogo.zona),
      marcas(d),
      alrededor('errores-50x', 100, 130),
      catalogo,
      HOY,
    );
    expect(c.metricas.find((x) => x.metrica.id === 'errores-50x')).toMatchObject({
      kind: 'completa',
      mediaAntes: 100,
    });
  });

  it('un despliegue fallido no abre la comparación', () => {
    const d = desp(1, DIA, { result: 'failure' });
    const c = compararMarca(marcaDespliegue(d, catalogo.zona), marcas(d), [], catalogo, HOY);
    expect(c).toEqual({ metricas: [], otras: [] });
  });

  it('un fallo o un cancelado dentro de la ventana no cuenta como otra subida', () => {
    const fallo = desp(2, addDays(DIA, 2), { result: 'failure' });
    const cancelado = desp(3, addDays(DIA, -2), { result: 'cancelled' });
    const c = compararMarca(marcaManual(version), marcas(fallo, cancelado), [], catalogo, HOY);
    expect(c.otras).toEqual([]);
  });

  it('un despliegue con éxito dentro de la ventana sí cuenta, y un rollback también', () => {
    const otro = desp(2, addDays(DIA, 2));
    const rollback = desp(3, addDays(DIA, 3), { kind: 'rollback' });
    const c = compararMarca(marcaManual(version), marcas(otro, rollback), [], catalogo, HOY);
    expect(c.otras.map((m) => m.id)).toEqual(['run-2', 'run-3']);
  });

  it('una manual y un despliegue de la misma versión y día son una sola subida', () => {
    const mismo = desp(9, DIA, { version: '4.2.0' });
    const desdeManual = compararMarca(marcaManual(version), marcas(mismo), [], catalogo, HOY);
    expect(desdeManual.otras).toEqual([]);
    const desdeDespliegue = compararMarca(
      marcaDespliegue(mismo, catalogo.zona),
      marcas(mismo),
      [],
      catalogo,
      HOY,
    );
    expect(desdeDespliegue.otras).toEqual([]);
  });

  it('dos despliegues sin versión nunca se toman por la misma subida', () => {
    const a = desp(5, addDays(DIA, 1), { version: null });
    const b = desp(6, addDays(DIA, 1), { version: null });
    const c = compararMarca(marcaManual(version), marcas(a, b), [], catalogo, HOY);
    expect(c.otras.map((m) => m.id)).toEqual(['run-5', 'run-6']);
  });

  it('indica si usa valores estimados', () => {
    const filas = alrededor('errores-50x', 100, 130);
    filas[1] = { ...filas[1], estimado: true };
    expect(de(compararVersion(version, app(), filas, catalogo, HOY), 'errores-50x')).toMatchObject({
      estimado: true,
    });
  });
});

describe('las marcas de una aplicación', () => {
  const zona = 'Europe/Madrid';
  const d = (campos: Record<string, unknown>) => leerLineaDespliegue(lineaDespliegue(campos))!;

  it('el día de un despliegue es el de su finishedAt en la zona del catálogo', () => {
    const tarde = d({ finishedAt: '2026-11-16T23:30:00Z' });
    expect(marcaDespliegue(tarde, zona).dia).toBe('2026-11-17');
  });

  it('pedido en octubre y terminado en noviembre: su día es de noviembre', () => {
    const m = marcaDespliegue(d({}), zona);
    expect(m).toMatchObject({ id: 'run-41036559302', dia: '2026-11-03', version: '0.0.543' });
  });

  it('junta las manuales y los despliegues', () => {
    const app = { versiones: [{ id: 'v', version: '1.0', dia: '2026-11-01' }] };
    expect(marcasDe(app, [d({})], zona).map((m) => [m.origen, m.id])).toEqual([
      ['manual', 'v'],
      ['despliegue', 'run-41036559302'],
    ]);
  });
});

describe('alrededor de un despliegue, por horas', () => {
  const H = 3_600_000;
  const T = Date.parse('2026-11-10T10:24:00Z');
  const H0 = Date.parse('2026-11-10T10:00:00Z');
  const HASTA = H0 + 48 * H;

  /** 24 hours before the deployment's hour at `antes`, the hour itself at 999, 24 after at `despues`. */
  function horas(antes: number, despues: number): Map<number, number> {
    const out = new Map<number, number>([[H0, 999]]);
    for (let i = 1; i <= 24; i++) {
      out.set(H0 - i * H, antes / 24);
      out.set(H0 + i * H, despues / 24);
    }
    return out;
  }

  it('sube cuando las 24 horas siguientes pasan el umbral de la tendencia', () => {
    expect(compararHoras(T, horas(48, 144), null, 'propia', HASTA)).toMatchObject({
      kind: 'completa',
      antes: 48,
      despues: 144,
      variacion: 2,
      base: 'recuento',
      sube: true,
    });
  });

  it('un cambio pequeño en números absolutos no sube', () => {
    expect(compararHoras(T, horas(24, 40.8), null, 'propia', HASTA)).toMatchObject({
      kind: 'completa',
      sube: false,
    });
  });

  it('en la clase cliente hace falta más para subir', () => {
    expect(compararHoras(T, horas(240, 312), null, 'cliente', HASTA).kind).toBe('completa');
    expect(compararHoras(T, horas(240, 312), null, 'cliente', HASTA)).toMatchObject({
      sube: false,
    });
    expect(compararHoras(T, horas(240, 312), null, 'propia', HASTA)).toMatchObject({ sube: true });
  });

  it('una hora sin dato deja la comparación sin porcentaje', () => {
    const h = horas(48, 144);
    h.delete(H0 - 3 * H);
    expect(compararHoras(T, h, null, 'propia', HASTA)).toEqual({ kind: 'insuficiente', faltan: 1 });
  });

  it('un despliegue de hace 5 horas dice cuántas faltan', () => {
    expect(compararHoras(T, horas(48, 144), null, 'propia', H0 + 6 * H)).toEqual({
      kind: 'pendiente',
      quedan: 19,
    });
  });

  it('usa la tasa si hay peticiones', () => {
    const r = compararHoras(T, horas(48, 144), horas(4800, 14400), 'propia', HASTA);
    expect(r).toMatchObject({ kind: 'completa', base: 'tasa', sube: false });
    if (r.kind === 'completa') expect(r.variacion).toBeCloseTo(0);
  });
});
