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

/** One deployment line, as the collector writes it: every field present. */
export function lineaDespliegue(campos: Record<string, unknown> = {}): string {
  return JSON.stringify({
    runId: 41036559302,
    attempt: 1,
    kind: 'release',
    result: 'success',
    version: '0.0.543',
    crq: 'CRQ000002715667',
    requestedAt: '2026-10-30T09:52:12Z',
    startedAt: '2026-11-03T01:00:08Z',
    finishedAt: '2026-11-03T01:24:24Z',
    plannedFrom: '2026-11-03T01:00:00Z',
    plannedTo: '2026-11-03T04:00:00Z',
    actor: 'alguien_geci',
    runUrl: 'https://github.com/org/deploy/actions/runs/41036559302',
    originBranch: 'vuestore/mya/release/release_17_01',
    components: [{ name: 'msh3-my-account-web', version: '0.1.537' }],
    rollbackOf: null,
    gdv: { status: 'pending' },
    collectedAt: '2026-11-03T05:00:00Z',
    ...campos,
  });
}

/** A `found` GDV whose changelog tries to be HTML and Markdown. */
export const GDV_FOUND = {
  status: 'found',
  key: 'GDV-24812',
  url: 'https://jira.example/browse/GDV-24812',
  summary: 'MSH3_MY_ACCOUNT - Despliegue_Release_26_17_01_hotfix',
  releaseNotes: 'IAMC:\r\n * MYA - <img src=x onerror=alert(1)> **negrita**\r\n',
  releaseNotesTruncated: false,
  deployedAt: '2026-11-03T02:02:00Z',
  release: { key: 'PD00000473-15592', summary: 'Release_26_17_01_hotfix_MYA' },
};

/**
 * `indiceReal` with deployments: `mya` has months with a gap, and `pagos` has
 * deployments and no metrics. `mya` also carries a key nobody knows.
 */
export function indiceConDespliegues(): Record<string, unknown> {
  const i = indiceReal() as { apps: Record<string, Record<string, unknown>> };
  i.apps.mya.deployments = {
    repo: 'org/deploy',
    count: 6,
    from: '2026-04-02T09:12:03Z',
    to: '2026-11-03T04:51:10Z',
    months: ['2026-04', '2026-10', '2026-11'],
  };
  i.apps.mya.alerts = { cualquier: 'cosa' };
  i.apps.pagos = {
    name: 'Pagos',
    metrics: {},
    deployments: {
      repo: null,
      count: 1,
      from: '2026-11-01T10:00:00Z',
      to: '2026-11-01T11:00:00Z',
      months: ['2026-11'],
    },
  };
  return i;
}

/**
 * The months of `mya` in `indiceConDespliegues`, by month. Covers: a run
 * enriched later, two runs with the same version, a rollback with and without
 * its release, a failure, a cancelled run, a cut line and an unknown kind.
 */
export function desplieguesMya(): Map<string, string> {
  return new Map([
    [
      '2026-04',
      [
        lineaDespliegue({
          runId: 100,
          version: '0.0.300',
          requestedAt: '2026-04-02T09:12:03Z',
          finishedAt: '2026-04-02T10:00:00Z',
          collectedAt: '2026-04-02T11:00:00Z',
        }),
      ].join('\n') + '\n',
    ],
    [
      '2026-10',
      [
        // Requested in October, finished in November: lives in October's file.
        lineaDespliegue({ collectedAt: '2026-11-03T05:00:00Z' }),
        lineaDespliegue({
          runId: 200,
          kind: 'release',
          result: 'failure',
          requestedAt: '2026-10-29T08:00:00Z',
          finishedAt: '2026-11-02T22:00:00Z',
          collectedAt: '2026-11-03T05:00:01Z',
          gdv: { status: 'not-found' },
        }),
        lineaDespliegue({ gdv: GDV_FOUND, collectedAt: '2026-11-16T15:41:51Z' }),
      ].join('\n') + '\n',
    ],
    [
      '2026-11',
      [
        lineaDespliegue({
          runId: 300,
          crq: 'CRQ-OTRO',
          requestedAt: '2026-11-03T06:00:00Z',
          finishedAt: '2026-11-03T07:00:00Z',
          collectedAt: '2026-11-03T08:00:00Z',
        }),
        lineaDespliegue({
          runId: 301,
          kind: 'rollback',
          version: '0.0.542',
          requestedAt: '2026-11-04T06:00:00Z',
          finishedAt: '2026-11-04T07:00:00Z',
          rollbackOf: 300,
          gdv: { status: 'not-applicable' },
          collectedAt: '2026-11-04T08:00:00Z',
        }),
        lineaDespliegue({
          runId: 302,
          kind: 'rollback',
          result: 'cancelled',
          requestedAt: '2026-11-05T06:00:00Z',
          finishedAt: '2026-11-05T07:00:00Z',
          rollbackOf: null,
          gdv: { status: 'not-applicable' },
          collectedAt: '2026-11-05T08:00:00Z',
        }),
        lineaDespliegue({ runId: 303, kind: 'hotfix', collectedAt: '2026-11-06T08:00:00Z' }),
        '{"runId":304,"attempt":1,"kind":"rel',
      ].join('\n'),
    ],
  ]);
}
