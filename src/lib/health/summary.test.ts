import { describe, it, expect } from 'vitest';
import { healthSummary } from './summary';
import type { FilaPanel } from './store.svelte';
import type { EstadoSalud, Salud } from './trends';

function fila(
  nombre: string,
  estado: EstadoSalud,
  captura: Salud['captura'] = null,
  motivo: string[] = [],
): FilaPanel {
  return {
    id: nombre.toLowerCase(),
    nombre,
    app: { id: nombre.toLowerCase(), nombre, consultas: {}, versiones: [] },
    salud: { estado, motivo, captura, tendencias: {}, ultimoDia: null },
  };
}

const aviso = (restantes: number, tono: 'warn' | 'danger') => ({
  restantes,
  perdidos: restantes < 0 ? -restantes : 0,
  tono,
  aviso: true,
});

describe('la tarjeta de Health Hub', () => {
  it('cuenta las que empeoran, las que tienen captura pendiente y lo que hay por revisar', () => {
    const s = healthSummary(
      [
        fila('Pedidos', 'empeora', null, ['errores-50x']),
        fila('Pagos', 'estable', aviso(2, 'warn')),
      ],
      3,
    );
    expect(s.stats.map((x) => [x.label, x.value, x.tone])).toEqual([
      ['empeoran', 1, 'danger'],
      ['captura pendiente', 1, 'warn'],
      ['por revisar', 3, 'warn'],
    ]);
  });

  it('sin nada que destacar, las tres cifras son neutras', () => {
    const s = healthSummary([fila('Pedidos', 'estable')], 0);
    expect(s.stats.every((x) => x.tone === 'neutral')).toBe(true);
  });

  it('lista las tres primeras, que ya llegan de peor a mejor', () => {
    const s = healthSummary(
      ['A', 'B', 'C', 'D'].map((n) => fila(n, 'estable')),
      0,
    );
    expect(s.list.rows.map((r) => r.label)).toEqual(['A', 'B', 'C']);
    expect(s.list.label).toBe('PEOR SALUD');
  });

  it('avisa por cada aplicación que empeora, diciendo qué métrica', () => {
    const s = healthSummary([fila('Pedidos', 'empeora', null, ['50x', 'No controlados'])], 0);
    expect(s.alerts[0]).toMatchObject({
      tone: 'danger',
      text: 'Pedidos empeora: 50x, No controlados',
    });
  });

  it('avisa de la captura con su mismo tono, nombrando la aplicación y los días', () => {
    const s = healthSummary(
      [
        fila('Pagos', 'estable', aviso(2, 'warn')),
        fila('Pedidos', 'sin-captura', aviso(-3, 'danger')),
      ],
      0,
    );
    expect(s.alerts.map((a) => [a.text, a.tone])).toEqual([
      ['Captura de Pagos: quedan 2 días', 'warn'],
      ['Captura de Pedidos: se han perdido 3 días', 'danger'],
    ]);
  });

  it('sin aviso de captura no aporta avisos', () => {
    expect(healthSummary([fila('Pedidos', 'estable')], 0).alerts).toEqual([]);
  });
});
