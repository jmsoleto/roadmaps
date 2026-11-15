/** Test data shaped like the collector's folder. Imported by tests only. */

export const ALCANCE = 'request.uri:"https://example" AND NOT request.headers:eci_monitoriz';

/** The shape the collector writes today, trimmed. */
export function indiceReal(): Record<string, unknown> {
  const metrica = (name: string, query: string, extra: Record<string, unknown> = {}) => ({
    name,
    query,
    effectiveQuery: `(${ALCANCE}) AND (${query})`,
    step: 3600,
    from: '2026-11-06T20:00:00Z',
    to: '2026-11-13T21:00:00Z',
    months: ['2026-11'],
    ...extra,
  });
  return {
    formatVersion: 1,
    apps: {
      'cex-es': {
        name: 'CEX ES',
        scope: ALCANCE,
        metrics: {
          'no-controlados': metrica('No controlados', 'exception.message:*'),
          'errores-50x': metrica('Errores 50x', 'response.status >= 500'),
          'errores-404': metrica('Errores 404', 'response.status:404'),
          'errores-40x': metrica('Errores 40x', 'response.status >= 400'),
          peticiones: metrica('Peticiones', 'response.status >= 200'),
          antigua: {
            removed: true,
            step: 3600,
            from: '2026-11-06T20:00:00Z',
            to: '2026-11-07T00:00:00Z',
            months: ['2026-11'],
          },
        },
      },
      mya: {
        name: 'MYA',
        metrics: {
          'no-controlados': {
            ...metrica('No controlados', 'message:"internal server error"'),
            effectiveQuery: 'message:"internal server error"',
          },
          peticiones: {
            ...metrica('Peticiones', 'message:"Petición recibida"'),
            effectiveQuery: 'message:"Petición recibida"',
          },
        },
      },
    },
    dashboards: {
      viejo: { name: 'antiguo', series: { s: { title: 't', months: ['2026-11'] } } },
    },
    skipped: [],
  };
}

const H = 3_600_000;

/** One collector line: hourly counts from `from` (ms). */
export const linea = (from: number, v: number[], run = from + v.length * H): string =>
  JSON.stringify({
    run: new Date(run).toISOString(),
    from: new Date(from).toISOString().replace('.000', ''),
    step: 3600,
    v,
  });

/**
 * The collector's `index.json` as it is today, field for field and in its
 * order, with the internal host replaced: this repository is public.
 */
export function indiceColector(): Record<string, unknown> {
  const scope =
    'request.uri:"https://host.example" AND NOT request.headers:eci_monitoriz AND NOT request.headers:NavegacionEnlatadaECI';
  const m = (name: string, query: string, alcance: string | null = scope) => ({
    name,
    query,
    effectiveQuery: alcance ? `(${alcance}) AND (${query})` : query,
    step: 3600,
    from: '2026-11-06T20:00:00Z',
    to: '2026-11-13T21:00:00Z',
    months: ['2026-11'],
  });
  return {
    formatVersion: 1,
    apps: {
      'cex-es': {
        name: 'CEX ES',
        scope,
        metrics: {
          'errores-404': m('Errores 404', 'response.status:404'),
          'errores-40x': m(
            'Errores 40X (sin 404)',
            'response.status >= 400 AND response.status < 500 AND NOT response.status:404',
          ),
          'errores-50x': m('Errores 50X', 'response.status >= 500 AND response.status < 600'),
          'no-controlados': m(
            'Errores no controlados',
            'exception.message:* OR exception.stack_trace:*',
          ),
          peticiones: m('Peticiones', 'response.status >= 200 AND response.status < 600'),
        },
      },
      mya: {
        name: 'MYA',
        metrics: {
          'no-controlados': m(
            'Errores no controlados (internal server error)',
            'message:"internal server error"',
            null,
          ),
          peticiones: m(
            'Peticiones (log TRACE «Petición recibida»)',
            'message:"Petición recibida"',
            null,
          ),
        },
      },
    },
    skipped: [],
  };
}
