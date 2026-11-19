/**
 * The working calendar of calendariosnacionales.com, read through the proxy in
 * `workers/festivos-proxy` (personas-festivos-api, D4).
 *
 * Every answer is either the data or why there is none: `no-publicado` when the
 * calendar does not have it (a 404, typically a year not out yet) and `fallo`
 * for anything else, a network error, the service down or a shape this code
 * does not understand. Nothing here throws, and nothing here touches the store.
 */

import type { Holiday } from './model';
import { readDate } from './holidays';

export type Fetcher = (url: string) => Promise<Response>;
export type FestivosError = 'no-publicado' | 'fallo';
export type FestivosResult<T> = { ok: true; value: T } | { ok: false; error: FestivosError };

/** A community or a province: its slug builds the URL. */
export interface Place {
  slug: string;
  name: string;
}
export interface MunicipalityOption extends Place {
  ine: string;
}

/** The proxy's base URL, set at build time. Empty: the import is not offered. */
export const FESTIVOS_BASE: string = (import.meta.env.VITE_FESTIVOS_PROXY ?? '')
  .trim()
  .replace(/\/+$/, '');
export const festivosEnabled = FESTIVOS_BASE !== '';

export const FESTIVOS_SITE = 'https://calendariosnacionales.com/es/';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const SLUG = /^[a-z0-9-]+$/;

const defaultFetch: Fetcher = (url) => fetch(url);

async function get(path: string, fetcher: Fetcher, base: string): Promise<FestivosResult<unknown>> {
  try {
    const res = await fetcher(`${base}/v1/${path}`);
    if (res.status === 404) return { ok: false, error: 'no-publicado' };
    if (!res.ok) return { ok: false, error: 'fallo' };
    return { ok: true, value: await res.json() };
  } catch {
    return { ok: false, error: 'fallo' };
  }
}

/** The list under `key`, each item kept only when it has a usable slug and name. */
function places<T extends Place>(
  body: unknown,
  key: string,
  extra: (o: Obj) => Omit<T, keyof Place> | null,
): FestivosResult<T[]> {
  if (!isObj(body) || !Array.isArray(body[key])) return { ok: false, error: 'fallo' };
  const out: T[] = [];
  for (const o of body[key] as unknown[]) {
    if (!isObj(o) || typeof o.slug !== 'string' || !SLUG.test(o.slug)) continue;
    if (typeof o.name !== 'string' || o.name === '') continue;
    const more = extra(o);
    if (more === null) continue;
    out.push({ slug: o.slug, name: o.name, ...more } as T);
  }
  out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return { ok: true, value: out };
}

const none = () => ({});

export interface Client {
  communities(year: number): Promise<FestivosResult<Place[]>>;
  provinces(year: number, ccaa: string): Promise<FestivosResult<Place[]>>;
  municipalities(
    year: number,
    ccaa: string,
    province: string,
  ): Promise<FestivosResult<MunicipalityOption[]>>;
  holidays(
    year: number,
    m: { ccaa: string; province: string; slug: string },
  ): Promise<FestivosResult<Holiday[]>>;
}

export function festivosClient(base = FESTIVOS_BASE, fetcher: Fetcher = defaultFetch): Client {
  const list = async <T extends Place>(
    path: string,
    key: string,
    extra: (o: Obj) => Omit<T, keyof Place> | null,
  ): Promise<FestivosResult<T[]>> => {
    const r = await get(path, fetcher, base);
    return r.ok ? places<T>(r.value, key, extra) : r;
  };
  return {
    communities: (year) => list<Place>(`${year}/comunidades.json`, 'communities', none),
    provinces: (year, ccaa) =>
      list<Place>(`${year}/regiones/${ccaa}/provincias.json`, 'provinces', none),
    municipalities: (year, ccaa, province) =>
      list<MunicipalityOption>(
        `${year}/regiones/${ccaa}/provincias/${province}/localidades.json`,
        'municipalities',
        (o) => (typeof o.ine === 'string' && o.ine !== '' ? { ine: o.ine } : null),
      ),
    async holidays(year, m) {
      const r = await get(
        `${year}/localidades/${m.ccaa}/${m.province}/${m.slug}.json`,
        fetcher,
        base,
      );
      if (!r.ok) return r;
      const body = r.value;
      const calendar = isObj(body) && isObj(body.holidays) ? body.holidays.calendar : undefined;
      if (!Array.isArray(calendar)) return { ok: false, error: 'fallo' };
      const seen = new Set<string>();
      const out: Holiday[] = [];
      for (const h of calendar) {
        if (!isObj(h) || typeof h.date !== 'string') continue;
        const date = readDate(h.date);
        if (date === null || seen.has(date)) continue;
        seen.add(date);
        const name = typeof h.name === 'string' && h.name.trim() !== '' ? h.name.trim() : 'Festivo';
        out.push({ date, name });
      }
      out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      return { ok: true, value: out };
    },
  };
}
