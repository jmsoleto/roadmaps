import { describe, expect, it, vi } from 'vitest';
import { festivosClient, festivosEnabled, type Fetcher } from './festivos-api';
import madrid2026 from './fixtures/festivos-madrid-2026.json';

const BASE = 'https://proxy.example';
const MADRID = { ccaa: 'mad', province: 'madrid', slug: 'madrid' };

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('el cliente del calendario', () => {
  it('sin la dirección del proxy, la importación no se ofrece', () => {
    expect(festivosEnabled).toBe(false);
  });

  it('Madrid 2026 da sus catorce festivos laborales, en orden', async () => {
    const fetcher = vi.fn<Fetcher>(() => json(madrid2026));
    const r = await festivosClient(BASE, fetcher).holidays(2026, MADRID);
    expect(fetcher).toHaveBeenCalledWith(`${BASE}/v1/2026/localidades/mad/madrid/madrid.json`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(14);
    expect(r.value[0]).toEqual({ date: '2026-01-01', name: 'Año Nuevo' });
    expect(r.value.map((h) => h.date)).toContain('2026-05-15');
  });

  it('un 404 es un año no publicado', async () => {
    const r = await festivosClient(BASE, () => json('', 404)).holidays(2028, MADRID);
    expect(r).toEqual({ ok: false, error: 'no-publicado' });
  });

  it('la red, un 500 o una respuesta sin calendario son un fallo', async () => {
    for (const fetcher of [
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => json({}, 500),
      () => json({ holidays: { national: [] } }),
      () => Promise.resolve(new Response('<html>', { status: 200 })),
    ] as Fetcher[]) {
      expect(await festivosClient(BASE, fetcher).holidays(2026, MADRID)).toEqual({
        ok: false,
        error: 'fallo',
      });
    }
  });

  it('descarta fechas imposibles y se queda con la primera de dos iguales', async () => {
    const body = {
      holidays: {
        calendar: [
          { date: '2026-02-30', name: 'Imposible' },
          { date: '2026-12-08', name: 'Inmaculada' },
          { date: '2026-12-08', name: 'Repetida' },
          { date: 'mañana', name: 'Texto' },
          { date: '2026-01-01', name: '  ' },
        ],
      },
    };
    const r = await festivosClient(BASE, () => json(body)).holidays(2026, MADRID);
    expect(r).toEqual({
      ok: true,
      value: [
        { date: '2026-01-01', name: 'Festivo' },
        { date: '2026-12-08', name: 'Inmaculada' },
      ],
    });
  });

  it('las listas en cascada, ordenadas y sin lo que no forma una URL', async () => {
    const fetcher = vi.fn<Fetcher>((url) => {
      if (url.endsWith('/comunidades.json'))
        return json({
          communities: [
            { code: 'MAD', slug: 'mad', name: 'Comunidad de Madrid' },
            { code: 'AND', slug: 'and', name: 'Andalucía' },
            { slug: 'Mal Slug', name: 'X' },
          ],
        });
      if (url.endsWith('/provincias.json'))
        return json({ provinces: [{ code: '28', slug: 'madrid', name: 'Madrid' }] });
      return json({
        municipalities: [
          { ine: '28079', slug: 'madrid', name: 'Madrid' },
          { ine: '28001', slug: 'acebeda-la', name: 'Acebeda, La' },
          { slug: 'sin-ine', name: 'Sin INE' },
        ],
      });
    });
    const c = festivosClient(BASE, fetcher);
    expect(await c.communities(2026)).toEqual({
      ok: true,
      value: [
        { slug: 'and', name: 'Andalucía' },
        { slug: 'mad', name: 'Comunidad de Madrid' },
      ],
    });
    expect(await c.provinces(2026, 'mad')).toEqual({
      ok: true,
      value: [{ slug: 'madrid', name: 'Madrid' }],
    });
    expect(fetcher).toHaveBeenLastCalledWith(`${BASE}/v1/2026/regiones/mad/provincias.json`);
    const m = await c.municipalities(2026, 'mad', 'madrid');
    expect(fetcher).toHaveBeenLastCalledWith(
      `${BASE}/v1/2026/regiones/mad/provincias/madrid/localidades.json`,
    );
    expect(m).toEqual({
      ok: true,
      value: [
        { slug: 'acebeda-la', name: 'Acebeda, La', ine: '28001' },
        { slug: 'madrid', name: 'Madrid', ine: '28079' },
      ],
    });
  });

  it('una lista sin su clave es un fallo', async () => {
    expect(await festivosClient(BASE, () => json({ otra: [] })).communities(2026)).toEqual({
      ok: false,
      error: 'fallo',
    });
  });
});
