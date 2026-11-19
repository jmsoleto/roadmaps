/**
 * The proxy in front of calendariosnacionales.com (personas-festivos-api, D1-D3).
 *
 * The public API serves the Spanish working calendar as static JSON but sends
 * no CORS headers, so the app, a static page, cannot read it from the browser.
 * This Worker forwards exactly the four routes the app uses, adds CORS for the
 * app's own origins, and caches what it gets.
 *
 * It is closed on purpose: the target URL is always built here from a path
 * that passed `allowedPath`, so nothing can make it fetch another host or any
 * other part of the API. Everything else is a 404 without a request upstream.
 */

export interface Env {
  /** Comma-separated origins allowed to read the responses from a browser. */
  ALLOWED_ORIGINS: string;
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

const UPSTREAM = 'https://calendariosnacionales.com/es';

const SEG = '[a-z0-9-]+';
const ROUTES = [
  new RegExp(`^/v1/\\d{4}/comunidades\\.json$`),
  new RegExp(`^/v1/\\d{4}/regiones/${SEG}/provincias\\.json$`),
  new RegExp(`^/v1/\\d{4}/regiones/${SEG}/provincias/${SEG}/localidades\\.json$`),
  new RegExp(`^/v1/\\d{4}/localidades/${SEG}/${SEG}/${SEG}\\.json$`),
];

/** The path when it is one of the four the app uses, `null` otherwise. */
export function allowedPath(pathname: string): string | null {
  return ROUTES.some((r) => r.test(pathname)) ? pathname : null;
}

/** One day for what exists, one hour for a 404 so a newly published year shows up soon. */
const OK_TTL = 86400;
const MISSING_TTL = 3600;

function corsHeaders(origin: string | null, env: Env): Headers {
  const headers = new Headers({ Vary: 'Origin' });
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  if (origin !== null && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

export async function handle(request: Request, env: Env, fetcher: Fetcher): Promise<Response> {
  const url = new URL(request.url);
  const headers = corsHeaders(request.headers.get('Origin'), env);
  const path = url.search === '' ? allowedPath(url.pathname) : null;

  if (path === null) return new Response('Not found', { status: 404, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET') {
    headers.set('Allow', 'GET, OPTIONS');
    return new Response('Method not allowed', { status: 405, headers });
  }

  let upstream: Response;
  try {
    upstream = await fetcher(UPSTREAM + path, {
      // Cloudflare's edge cache, keyed by the upstream URL.
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { '200-299': OK_TTL, '404': MISSING_TTL, '500-599': 0 },
      },
    } as RequestInit);
  } catch {
    return new Response('Bad gateway', { status: 502, headers });
  }

  const status = upstream.status;
  if (status === 200) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', `public, max-age=${OK_TTL}`);
    return new Response(upstream.body, { status, headers });
  }
  if (status === 404) {
    headers.set('Cache-Control', `public, max-age=${MISSING_TTL}`);
    return new Response('Not found', { status, headers });
  }
  return new Response('Bad gateway', { status: 502, headers });
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env, (input, init) => fetch(input, init)),
};
