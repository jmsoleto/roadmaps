import { describe, it, expect } from 'vitest';
import { linksSummary, openedToday, recentRows } from './summary';
import { normalize, type LinksData } from './model';

const slotColor = (slot: number) => `slot-${slot}`;

function data(): LinksData {
  return normalize({
    areas: [
      { id: 'a1', name: 'Favoritos' },
      { id: 'a2', name: 'Pagos' },
    ],
    links: [
      { id: 'l1', areaId: 'a1', name: 'Grafana', url: 'https://grafana.interno', from: 0, to: 3 },
      { id: 'l2', areaId: 'a1', name: 'Kibana', url: 'https://kibana.interno', from: 1, to: 4 },
      { id: 'l3', areaId: 'a2', name: 'PSP', url: 'https://psp.interno', from: 2, to: 5 },
    ],
  });
}

const NOW = new Date('2026-09-06T14:00:00').getTime();
const hoursAgo = (h: number) => NOW - h * 60 * 60 * 1000;

describe('lo que Links Hub le cuenta a la landing', () => {
  it('da tres cifras reales', () => {
    const s = linksSummary(data(), [], NOW, slotColor);
    expect(s.stats.map((x) => [x.label, x.value])).toEqual([
      ['enlaces', 3],
      ['áreas', 2],
      ['abiertos hoy', 0],
    ]);
  });

  it('no aporta ningún aviso', () => {
    // Un panel de enlaces no tiene nada urgente que decir, y decirlo con una
    // alerta inventada gasta el sitio de una que sí lo es.
    expect(linksSummary(data(), [{ id: 'l1', at: NOW }], NOW, slotColor).alerts).toEqual([]);
  });

  it('cuenta como de hoy lo del día natural, no las últimas 24 horas', () => {
    const recent = [
      { id: 'l1', at: hoursAgo(2) }, // hoy
      { id: 'l2', at: hoursAgo(13) }, // hoy, de madrugada
      { id: 'l3', at: hoursAgo(20) }, // ayer por la tarde
    ];
    expect(openedToday(recent, NOW)).toBe(2);
  });

  it('ordena la lista corta por recencia y la corta en tres', () => {
    const recent = [
      { id: 'l3', at: hoursAgo(1) },
      { id: 'l1', at: hoursAgo(2) },
      { id: 'l2', at: hoursAgo(3) },
    ];
    const rows = recentRows(data(), recent, NOW, slotColor);
    expect(rows.map((r) => r.label)).toEqual(['PSP', 'Grafana', 'Kibana']);
    expect(rows).toHaveLength(3);
  });

  it('el punto de color de una fila es el del botón', () => {
    const rows = recentRows(data(), [{ id: 'l2', at: NOW }], NOW, slotColor);
    expect(rows[0].color).toBe('slot-1');
  });

  it('un enlace que ya no existe no deja fila en blanco', () => {
    const rows = recentRows(data(), [{ id: 'se-borró', at: NOW }], NOW, slotColor);
    expect(rows).toEqual([]);
  });

  it('sin nada abierto, la lista tiene su propio texto de vacío', () => {
    const s = linksSummary(data(), [], NOW, slotColor);
    expect(s.list.rows).toEqual([]);
    expect(s.list.emptyLabel).not.toBe('');
  });

  it('sin ningún enlace, las cifras van a cero y ninguna es grave', () => {
    const s = linksSummary({ areas: [], links: [] }, [], NOW, slotColor);
    expect(s.stats.map((x) => x.value)).toEqual([0, 0, 0]);
    expect(s.stats.every((x) => x.tone === 'neutral')).toBe(true);
  });
});
