import { describe, it, expect } from 'vitest';
import {
  areaFilename,
  exportArea,
  exportNotice,
  importNotice,
  parseAreaImport,
  ImportError,
} from './io';
import { newArea, newLink, type Link } from './model';

function area(name = 'Pagos') {
  return newArea(name);
}

function links(areaId: string, ...drafts: Array<Partial<Link> & { name: string; url: string }>) {
  return drafts.map((d, i) => ({ ...newLink(areaId, d, i), ...d }) as Link);
}

const GRAFANA = { name: 'Grafana checkout', url: 'https://grafana.example/d/checkout' };
const KIBANA = { name: 'Kibana pagos', url: 'https://kibana.example/app/logs' };

describe('writing an area out', () => {
  it('carries the area name and every link', () => {
    const a = area();
    const doc = JSON.parse(exportArea(a, links(a.id, GRAFANA, KIBANA)));
    expect(doc.kind).toBe('tech-lead-hub/links');
    expect(doc.version).toBe(1);
    expect(doc.area).toEqual({ name: 'Pagos' });
    expect(doc.links).toHaveLength(2);
    expect(doc.links[0].name).toBe('Grafana checkout');
  });

  /** D1: identity is not in the file, so nobody can come to rely on it. */
  it('carries no identity of any kind', () => {
    const a = area();
    const text = exportArea(a, links(a.id, GRAFANA, KIBANA));
    expect(text).not.toContain('"id"');
    expect(text).not.toContain('"areaId"');
  });

  it('carries the palette slots and the size, which are the link’s appearance', () => {
    const a = area();
    const [link] = links(a.id, { ...GRAFANA, from: 2, to: 5, wide: true, monogram: 'GC' });
    const doc = JSON.parse(exportArea(a, [link]));
    expect(doc.links[0]).toMatchObject({ from: 2, to: 5, wide: true, monogram: 'GC' });
  });

  it('writes an area with no links at all', () => {
    const doc = JSON.parse(exportArea(area(), []));
    expect(doc.links).toEqual([]);
  });
});

describe('what the file is called', () => {
  it('says the application and the area', () => {
    expect(areaFilename('Pagos')).toBe('enlaces-Pagos.json');
  });

  /**
   * The roadmap export's rule, accents included. A better rule here would mean
   * two applications naming their downloads differently for no stated reason.
   */
  it('sanitises spaces and accents the way the roadmap export does', () => {
    expect(areaFilename('Pagos Móviles')).toBe('enlaces-Pagos_M_viles.json');
    expect(areaFilename('  Infra / red  ')).toBe('enlaces-Infra_red.json');
  });

  it('falls back rather than producing a nameless file', () => {
    expect(areaFilename('¿?')).toBe('enlaces-area.json');
  });
});

describe('refusing the envelope', () => {
  it('refuses something that is not JSON', () => {
    expect(() => parseAreaImport('{no')).toThrow(ImportError);
    expect(() => parseAreaImport('{no')).toThrow(/JSON válido/);
  });

  /** The likeliest mistake in the whole exchange gets a sentence, not a shrug. */
  it('names the application a foreign document really belongs to', () => {
    expect(() => parseAreaImport(JSON.stringify({ format: 'roadmaps.v1' }))).toThrow(/Roadmaps/);
    expect(() => parseAreaImport(JSON.stringify({ kind: 'tech-lead-hub/decisions' }))).toThrow(
      /Decisions/,
    );
    expect(() => parseAreaImport(JSON.stringify({ kind: 'tech-lead-hub/api-contract' }))).toThrow(
      /API Hub/,
    );
    expect(() => parseAreaImport(JSON.stringify({ kind: 'tech-lead-hub/api-library' }))).toThrow(
      /API Hub/,
    );
  });

  it('refuses a JSON that is nobody’s', () => {
    expect(() => parseAreaImport(JSON.stringify({ hola: 1 }))).toThrow(
      /no es un documento de enlaces/,
    );
  });

  it('refuses a document whose links are not a list', () => {
    expect(() =>
      parseAreaImport(JSON.stringify({ kind: 'tech-lead-hub/links', links: 7 })),
    ).toThrow(/una lista de enlaces/);
  });

  it('refuses a document with no links in it', () => {
    expect(() =>
      parseAreaImport(JSON.stringify({ kind: 'tech-lead-hub/links', links: [] })),
    ).toThrow(/no contiene ningún enlace\./);
  });

  it('gives each refusal its own sentence', () => {
    const messages = [
      '{no',
      JSON.stringify({ format: 'roadmaps.v1' }),
      JSON.stringify({ hola: 1 }),
      JSON.stringify({ kind: 'tech-lead-hub/links', links: 7 }),
      JSON.stringify({ kind: 'tech-lead-hub/links', links: [] }),
    ].map((text) => {
      try {
        parseAreaImport(text);
        return '';
      } catch (e) {
        return (e as Error).message;
      }
    });
    expect(new Set(messages).size).toBe(messages.length);
  });
});

describe('reading an area in', () => {
  it('brings back what went out', () => {
    const a = area();
    const original = links(
      a.id,
      { ...GRAFANA, from: 2, to: 5, wide: true, monogram: 'GC' },
      { ...KIBANA, description: 'logs de pagos' },
    );
    const back = parseAreaImport(exportArea(a, original));

    expect(back.area.name).toBe('Pagos');
    expect(back.discarded).toBe(0);
    expect(back.links.map((l) => [l.name, l.url, l.monogram, l.from, l.to, l.wide])).toEqual(
      original.map((l) => [l.name, l.url, l.monogram, l.from, l.to, l.wide]),
    );
    expect(back.links[1].description).toBe('logs de pagos');
  });

  /** Two areas, not one overwriting the other — by construction, not by a check. */
  it('gives fresh identity every time it reads the same text', () => {
    const a = area();
    const text = exportArea(a, links(a.id, GRAFANA, KIBANA));
    const first = parseAreaImport(text);
    const second = parseAreaImport(text);

    expect(first.area.id).not.toBe(second.area.id);
    expect(first.area.id).not.toBe(a.id);
    expect(first.links.map((l) => l.id)).not.toEqual(second.links.map((l) => l.id));
    // And every link hangs from the area it arrived with.
    expect(first.links.every((l) => l.areaId === first.area.id)).toBe(true);
  });

  /** A tampered file cannot smuggle identity in and collide with what is here. */
  it('overwrites any id the document did bring', () => {
    const back = parseAreaImport(
      JSON.stringify({
        kind: 'tech-lead-hub/links',
        area: { id: 'area_robada', name: 'Pagos' },
        links: [{ ...GRAFANA, id: 'link_robado', areaId: 'area_robada' }],
      }),
    );
    expect(back.area.id).not.toBe('area_robada');
    expect(back.links[0].id).not.toBe('link_robado');
    expect(back.links[0].areaId).toBe(back.area.id);
  });

  it('names an area the document left unnamed', () => {
    const back = parseAreaImport(JSON.stringify({ kind: 'tech-lead-hub/links', links: [GRAFANA] }));
    expect(back.area.name).toBe('Sin nombre');
  });
});

describe('what did not make it in', () => {
  /** Tolerant inside a document that is ours, and never silent about it. */
  it('drops the unusable links and reports how many', () => {
    const back = parseAreaImport(
      JSON.stringify({
        kind: 'tech-lead-hub/links',
        area: { name: 'Pagos' },
        links: [GRAFANA, { name: 'Roto', url: 'grafana.example' }, { name: '', url: KIBANA.url }],
      }),
    );
    expect(back.links).toHaveLength(1);
    expect(back.links[0].name).toBe('Grafana checkout');
    expect(back.discarded).toBe(2);
  });

  it('refuses a document in which nothing is usable', () => {
    expect(() =>
      parseAreaImport(
        JSON.stringify({
          kind: 'tech-lead-hub/links',
          links: [{ name: 'Roto', url: 'no-es-una-url' }],
        }),
      ),
    ).toThrow(/ningún enlace legible/);
  });
});

describe('what the bar says', () => {
  it('reports a clean import too, so silence never means success', () => {
    expect(importNotice(7, 0)).toBe('7 enlaces importados');
  });

  it('reports the discarded ones', () => {
    expect(importNotice(7, 2)).toBe('7 enlaces importados, 2 descartados');
  });

  it('counts one of each in the singular', () => {
    expect(importNotice(1, 1)).toBe('1 enlace importado, 1 descartado');
  });

  it('says what an exported file carries', () => {
    expect(exportNotice('enlaces-Pagos.json')).toContain('enlaces-Pagos.json');
    expect(exportNotice('enlaces-Pagos.json')).toContain('direcciones internas');
  });

  /** The bar clips from the right, so the warning has to come before the name. */
  it('puts the warning before the filename, so truncation eats the name', () => {
    const notice = exportNotice('enlaces-Pagos.json');
    expect(notice.indexOf('direcciones internas')).toBeLessThan(notice.indexOf('enlaces-Pagos'));
  });
});
