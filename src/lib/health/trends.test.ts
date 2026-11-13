import { describe, it, expect } from 'vitest';
import { addDays } from '../time/timeline';
import { metricasIniciales, type Catalogo, type Observacion, type Vigilada } from './model';
import {
  captura,
  compararVersion,
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
    expect(tend(semanas('500', 100, 125), '500').estado).toBe('sube');
    expect(tend(semanas('500', 100, 75), '500').estado).toBe('baja');
    expect(tend(semanas('500', 100, 110), '500').estado).toBe('estable');
  });

  it('exige más a los errores de cliente', () => {
    expect(tend(semanas('403', 100, 140), '403').estado).toBe('estable');
    expect(tend(semanas('403', 100, 150), '403').estado).toBe('sube');
  });

  it('un cambio pequeño en cifras pequeñas está estable, aunque sea un 100 %', () => {
    const filas = semanas('500', 0, 0).map((o, i) => ({
      ...o,
      valor: i === 0 ? 8 : i === 7 ? 4 : 0,
    }));
    const t = tend(filas, '500');
    expect(t.variacion).toBe(1);
    expect(t.estado).toBe('estable');
  });

  it('más errores con más tráfico: la tasa no cambia y está estable', () => {
    const filas = [...semanas('500', 100, 200), ...semanas('peticiones', 1000, 2000)];
    const t = tend(filas, '500');
    expect(t.base).toBe('tasa');
    expect(t.estado).toBe('estable');
  });

  it('sin peticiones compara el recuento, y lo dice', () => {
    expect(tend(semanas('500', 100, 200), '500').base).toBe('recuento');
  });

  it('con peticiones incompletas también compara el recuento', () => {
    const peticiones = semanas('peticiones', 1000, 2000).slice(1);
    const t = tend([...semanas('500', 100, 200), ...peticiones], '500');
    expect(t.base).toBe('recuento');
    expect(t.estado).toBe('sube');
  });

  it('pasar de 0 a un valor que cumple el mínimo es una subida sin porcentaje', () => {
    const t = tend(semanas('500', 0, 10), '500');
    expect(t.estado).toBe('sube');
    expect(t.variacion).toBeNull();
  });

  it('si falta un día da «sin datos», no un porcentaje', () => {
    const t = tend(semanas('500', 100, 200).slice(1), '500');
    expect(t.estado).toBe('sin-datos');
    expect(t.variacion).toBeNull();
  });

  it('un cero medido no es un día que falta', () => {
    expect(tend(semanas('500', 0, 0), '500').estado).toBe('estable');
  });

  it('avisa si alguno de los valores es estimado', () => {
    const filas = semanas('500', 100, 100);
    filas[3] = { ...filas[3], estimado: true };
    expect(tend(filas, '500').estimado).toBe(true);
  });
});

describe('la salud de una aplicación vigilada', () => {
  const HOY = '2026-11-07';
  const estable = [...semanas('500', 100, 100), ...semanas('no-controlados', 100, 100)];
  const sal = (filas: Observacion[], hoy = HOY) => salud(filas, catalogo, hoy);

  it('sin datos si ninguna métrica propia tiene tendencia', () => {
    expect(sal([]).estado).toBe('sin-datos');
    expect(sal(semanas('403', 100, 900)).estado).toBe('sin-datos');
  });

  it('sin captura si ya se han perdido días', () => {
    expect(sal(estable, '2026-11-20').estado).toBe('sin-captura');
  });

  it('empeora si sube un error propio, y dice cuál', () => {
    const filas = [...semanas('500', 100, 140), ...semanas('no-controlados', 100, 100)];
    const s = sal(filas);
    expect(s.estado).toBe('empeora');
    expect(s.motivo).toEqual(['500']);
  });

  it('vigilar, y no empeora, si solo sube un error de cliente', () => {
    const s = sal([...estable, ...semanas('403', 100, 200)]);
    expect(s.estado).toBe('vigilar');
    expect(s.motivo).toEqual(['403']);
  });

  it('empeora gana a vigilar', () => {
    const filas = [...semanas('500', 100, 140), ...semanas('403', 100, 200)];
    expect(sal(filas).estado).toBe('empeora');
  });

  it('mejora si baja un error propio y no sube ninguno', () => {
    expect(sal(semanas('500', 100, 50)).estado).toBe('mejora');
  });

  it('estable en cualquier otro caso', () => {
    expect(sal(estable).estado).toBe('estable');
  });

  it('una captura de hace días no impide calcular la tendencia', () => {
    const fin = '2026-11-02';
    const s = sal(semanas('500', 100, 140, fin));
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
    const c = compararVersion(version, app(), alrededor('500', 100, 130), catalogo, HOY);
    expect(de(c, '500')).toMatchObject({
      kind: 'completa',
      mediaAntes: 100,
      mediaDespues: 130,
      base: 'recuento',
    });
    const r = de(c, '500');
    if (r.kind === 'completa') expect(r.variacion).toBeCloseTo(0.3);
  });

  it('usa la tasa si hay peticiones', () => {
    const filas = [...alrededor('500', 100, 200), ...alrededor('peticiones', 1000, 2000)];
    const r = de(compararVersion(version, app(), filas, catalogo, HOY), '500');
    expect(r).toMatchObject({ kind: 'completa', base: 'tasa', variacion: 0 });
  });

  it('con una subida reciente dice cuántos días quedan, sin porcentaje', () => {
    const c = compararVersion(
      version,
      app(),
      alrededor('500', 100, 130),
      catalogo,
      addDays(DIA, 3),
    );
    expect(de(c, '500')).toMatchObject({ kind: 'pendiente', quedan: 5 });
  });

  it('el día después de cerrar la ventana ya compara', () => {
    const c = compararVersion(
      version,
      app(),
      alrededor('500', 100, 130),
      catalogo,
      addDays(DIA, 8),
    );
    expect(de(c, '500').kind).toBe('completa');
  });

  it('si falta un día que ya no llegará, dice que no hay datos suficientes', () => {
    const filas = alrededor('500', 100, 130).filter((o) => o.dia !== addDays(DIA, -3));
    expect(de(compararVersion(version, app(), filas, catalogo, HOY), '500')).toMatchObject({
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

  it('indica si usa valores estimados', () => {
    const filas = alrededor('500', 100, 130);
    filas[1] = { ...filas[1], estimado: true };
    expect(de(compararVersion(version, app(), filas, catalogo, HOY), '500')).toMatchObject({
      estimado: true,
    });
  });
});
