import { describe, it, expect } from 'vitest';
import { GDV_FOUND, desplieguesMya, lineaDespliegue } from './fixtures';
import {
  enlaceSeguro,
  gdvPuedeCambiar,
  leerDespliegues,
  leerLineaDespliegue,
  rollbackPosterior,
  rutaDespliegues,
  ultimoRelease,
} from './despliegues';

const mya = () => leerDespliegues('mya', desplieguesMya());
const de = (runId: number) => mya().despliegues.find((d) => d.runId === runId)!;

describe('los despliegues de la fuente', () => {
  it('la ruta de un mes es relativa a la carpeta elegida', () => {
    expect(rutaDespliegues('mya', '2026-10')).toEqual(['deployments', 'mya', '2026-10.jsonl']);
  });

  it('un run con varias líneas es un solo despliegue, con su última línea', () => {
    const d = mya().despliegues.filter((x) => x.runId === 41036559302);
    expect(d).toHaveLength(1);
    expect(d[0].gdv.status).toBe('found');
  });

  it('en un empate de collectedAt gana la última línea del fichero', () => {
    const texto = [
      lineaDespliegue({ result: 'failure', collectedAt: '2026-11-03T05:00:00Z' }),
      lineaDespliegue({ result: 'success', collectedAt: '2026-11-03T05:00:00Z' }),
    ].join('\n');
    const r = leerDespliegues('mya', new Map([['2026-10', texto]]));
    expect(r.despliegues.map((d) => d.result)).toEqual(['success']);
  });

  it('una línea anterior no pisa a una más reciente aunque venga después', () => {
    const texto = [
      lineaDespliegue({ gdv: GDV_FOUND, collectedAt: '2026-11-16T00:00:00Z' }),
      lineaDespliegue({ collectedAt: '2026-11-03T05:00:00Z' }),
    ].join('\n');
    const r = leerDespliegues('mya', new Map([['2026-10', texto]]));
    expect(r.despliegues[0].gdv.status).toBe('found');
  });

  it('dos runs con la misma versión son dos despliegues', () => {
    const v = mya().despliegues.filter((d) => d.version === '0.0.543');
    expect(v.map((d) => d.runId).sort()).toEqual([200, 300, 302, 41036559302]);
  });

  it('salta la línea cortada y el kind desconocido, y avisa con fichero y línea', () => {
    const r = mya();
    expect(r.despliegues.some((d) => d.runId === 303 || d.runId === 304)).toBe(false);
    expect(r.avisos).toEqual([
      'mya: se saltaron 2 líneas ilegibles en los despliegues de 2026-11.jsonl (líneas 4, 5)',
    ]);
  });

  it('salta las líneas sin runId, sin finishedAt o con un result desconocido', () => {
    for (const mala of [
      lineaDespliegue({ runId: 0 }),
      lineaDespliegue({ runId: '41' }),
      lineaDespliegue({ finishedAt: null }),
      lineaDespliegue({ finishedAt: '3 de noviembre' }),
      lineaDespliegue({ result: 'timed_out' }),
      '[]',
    ]) {
      expect(leerLineaDespliegue(mala)).toBeNull();
    }
  });

  it('un campo de tipo raro queda desconocido y el despliegue se muestra', () => {
    const d = leerLineaDespliegue(
      lineaDespliegue({ version: 543, actor: null, components: 'x', plannedFrom: 'pronto' }),
    )!;
    expect(d.version).toBeNull();
    expect(d.actor).toBeNull();
    expect(d.components).toEqual([]);
    expect(d.plannedFrom).toBeNull();
  });

  it('avisa del mes que falta y lee los demás', () => {
    const textos = new Map<string, string | null>(desplieguesMya());
    textos.set('2026-04', null);
    const r = leerDespliegues('mya', textos);
    expect(r.avisos[0]).toBe('mya: falta el fichero de despliegues 2026-04.jsonl');
    expect(r.despliegues.some((d) => d.runId === 100)).toBe(false);
    expect(r.despliegues.some((d) => d.runId === 300)).toBe(true);
  });

  it('ordena por finishedAt, el más reciente primero', () => {
    expect(mya().despliegues.map((d) => d.runId)).toEqual([302, 301, 300, 41036559302, 200, 100]);
  });

  it('el pedido en octubre y terminado en noviembre se sitúa en noviembre', () => {
    expect(de(41036559302).finishedAt).toBe(Date.parse('2026-11-03T01:24:24Z'));
    expect(de(41036559302).requestedAt).toBe(Date.parse('2026-10-30T09:52:12Z'));
  });

  it('una GDV found trae su contenido tal cual, sin escapar', () => {
    const g = de(41036559302).gdv;
    expect(g.status).toBe('found');
    if (g.status !== 'found') return;
    expect(g.releaseNotes).toBe(GDV_FOUND.releaseNotes);
    expect(g.deployedAt).toBe(Date.parse('2026-11-03T02:02:00Z'));
    expect(g.release).toEqual({ key: 'PD00000473-15592', summary: 'Release_26_17_01_hotfix_MYA' });
  });

  it('las GDV sin contenido no son errores, y un estado desconocido es unavailable', () => {
    expect(de(301).gdv).toEqual({ status: 'not-applicable' });
    expect(de(200).gdv).toEqual({ status: 'not-found' });
    const d = leerLineaDespliegue(lineaDespliegue({ gdv: { status: 'raro' } }))!;
    expect(d.gdv).toEqual({ status: 'unavailable' });
  });

  it('un rollback guarda lo que revierte; un release nunca', () => {
    expect(de(301).rollbackOf).toBe(300);
    expect(de(302).rollbackOf).toBeNull();
    expect(leerLineaDespliegue(lineaDespliegue({ rollbackOf: 5 }))!.rollbackOf).toBeNull();
  });
});

describe('el último despliegue a producción', () => {
  const d = (campos: Record<string, unknown>) => leerLineaDespliegue(lineaDespliegue(campos))!;

  it('es el último release con éxito, aunque haya un fallo después', () => {
    const lista = [
      d({ runId: 1, finishedAt: '2026-11-01T10:00:00Z', version: '0.0.542' }),
      d({ runId: 2, finishedAt: '2026-11-03T10:00:00Z', version: '0.0.543' }),
      d({ runId: 3, finishedAt: '2026-11-04T10:00:00Z', version: '0.0.544', result: 'failure' }),
    ];
    expect(ultimoRelease(lista)?.version).toBe('0.0.543');
  });

  it('un rollback no es un release, pero se indica si es posterior', () => {
    const release = d({ runId: 2, finishedAt: '2026-11-03T10:00:00Z' });
    const rb = d({ runId: 4, kind: 'rollback', finishedAt: '2026-11-05T10:00:00Z' });
    const viejo = d({ runId: 1, kind: 'rollback', finishedAt: '2026-11-01T10:00:00Z' });
    expect(ultimoRelease([rb, release, viejo])?.runId).toBe(2);
    expect(rollbackPosterior([rb, release, viejo], release)?.runId).toBe(4);
    expect(rollbackPosterior([release, viejo], release)).toBeNull();
  });

  it('sin release con éxito no hay último despliegue', () => {
    expect(ultimoRelease([d({ result: 'failure' }), d({ runId: 9, kind: 'rollback' })])).toBeNull();
  });
});

describe('la GDV que aún puede cambiar', () => {
  const fin = Date.parse('2026-11-03T01:24:24Z');
  const con = (gdv: Record<string, unknown>) => leerLineaDespliegue(lineaDespliegue({ gdv }))!;
  const DIA = 86_400_000;

  it('pending y unavailable siempre pueden cambiar; found y not-applicable no', () => {
    expect(gdvPuedeCambiar(con({ status: 'pending' }), fin + 30 * DIA)).toBe(true);
    expect(gdvPuedeCambiar(con({ status: 'unavailable' }), fin + 30 * DIA)).toBe(true);
    expect(gdvPuedeCambiar(con(GDV_FOUND), fin)).toBe(false);
    expect(gdvPuedeCambiar(con({ status: 'not-applicable' }), fin)).toBe(false);
  });

  it('not-found se reintenta durante 7 días desde que terminó el run', () => {
    expect(gdvPuedeCambiar(con({ status: 'not-found' }), fin + 2 * DIA)).toBe(true);
    expect(gdvPuedeCambiar(con({ status: 'not-found' }), fin + 8 * DIA)).toBe(false);
  });
});

describe('los enlaces', () => {
  it('acepta https', () => {
    expect(enlaceSeguro('https://jira.example/browse/GDV-1')).toBe(
      'https://jira.example/browse/GDV-1',
    );
  });

  it('rechaza todo lo demás', () => {
    for (const url of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'http://jira.example',
      'data:text/html,<b>x</b>',
      '/browse/GDV-1',
      'jira.example',
      '',
      null,
      undefined,
    ]) {
      expect(enlaceSeguro(url)).toBeNull();
    }
  });
});
