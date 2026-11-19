import { describe, expect, it, vi } from 'vitest';
import { allowedPath, handle, type Env, type Fetcher } from './index';

const env: Env = { ALLOWED_ORIGINS: 'https://app.example, http://localhost:1420' };
const APP = 'https://app.example';

describe('allowedPath', () => {
  it.each([
    '/v1/2026/comunidades.json',
    '/v1/2026/regiones/mad/provincias.json',
    '/v1/2026/regiones/mad/provincias/madrid/localidades.json',
    '/v1/2027/localidades/mad/madrid/madrid.json',
    '/v1/2026/localidades/cat/barcelona/sant-cugat-del-valles.json',
  ])('accepts %s', (p) => {
    expect(allowedPath(p)).toBe(p);
  });

  it.each([
    '/v1/2026/fiscal.json',
    '/v1/2026/fiscal/autonomos.json',
    '/v1/2026/escolar.json',
    '/v1/2026/todo.json',
    '/v1/2026/nacionales.json',
    '/v1/26/comunidades.json',
    '/v1/2026/localidades/mad/madrid/../../x.json',
    '/v1/2026/localidades/mad/madrid/Madrid.json',
    '/v1/2026/localidades/mad/madrid.json',
    '//evil.example/v1/2026/comunidades.json',
    '/es/v1/2026/comunidades.json',
    '/',
  ])('rejects %s', (p) => {
    expect(allowedPath(p)).toBeNull();
  });
});

const ok = () => Promise.resolve(new Response('{"a":1}', { status: 200 }));

function req(path: string, init: RequestInit & { origin?: string } = {}): Request {
  const headers = new Headers();
  if (init.origin) headers.set('Origin', init.origin);
  return new Request(`https://proxy.example${path}`, { method: init.method ?? 'GET', headers });
}

describe('handle', () => {
  it('forwards an allowed route and lets the app read it', async () => {
    const fetcher = vi.fn<Fetcher>(ok);
    const res = await handle(
      req('/v1/2026/localidades/mad/madrid/madrid.json', { origin: APP }),
      env,
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://calendariosnacionales.com/es/v1/2026/localidades/mad/madrid/madrid.json',
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(APP);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(await res.text()).toBe('{"a":1}');
  });

  it('rejects any other route without asking upstream', async () => {
    const fetcher = vi.fn<Fetcher>(ok);
    for (const p of [
      '/v1/2026/fiscal.json',
      '/v1/2026/comunidades.json?x=1',
      '/https://x.example',
    ]) {
      const res = await handle(req(p, { origin: APP }), env, fetcher);
      expect(res.status).toBe(404);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('gives no CORS header to a foreign origin', async () => {
    const res = await handle(
      req('/v1/2026/comunidades.json', { origin: 'https://evil.example' }),
      env,
      vi.fn<Fetcher>(ok),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('answers the preflight without going upstream', async () => {
    const fetcher = vi.fn<Fetcher>(ok);
    const res = await handle(
      req('/v1/2026/comunidades.json', { origin: 'http://localhost:1420', method: 'OPTIONS' }),
      env,
      fetcher,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:1420');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refuses other methods', async () => {
    const fetcher = vi.fn<Fetcher>(ok);
    const res = await handle(
      req('/v1/2026/comunidades.json', { origin: APP, method: 'POST' }),
      env,
      fetcher,
    );
    expect(res.status).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('passes a 404 through, cached for an hour', async () => {
    const res = await handle(req('/v1/2028/comunidades.json', { origin: APP }), env, () =>
      Promise.resolve(new Response('', { status: 404 })),
    );
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(APP);
  });

  it('turns upstream errors into 502', async () => {
    const boom = await handle(req('/v1/2026/comunidades.json'), env, () =>
      Promise.reject(new Error('down')),
    );
    expect(boom.status).toBe(502);
    const five = await handle(req('/v1/2026/comunidades.json'), env, () =>
      Promise.resolve(new Response('', { status: 503 })),
    );
    expect(five.status).toBe(502);
  });
});
