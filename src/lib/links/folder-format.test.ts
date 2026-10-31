import { describe, it, expect } from 'vitest';
import { LINKS_FORMAT, ORDER_FILE, fileForArea, isAreaFile } from './folder-format';
import { MARKER_FILE } from '../folder/marker';
import type { Link, LinksData } from './model';

const link = (id: string, areaId: string, over: Partial<Link> = {}): Link => ({
  id,
  areaId,
  name: `Panel ${id}`,
  description: 'latencia p99',
  url: `https://grafana.example/${id}`,
  monogram: 'GR',
  from: 1,
  to: 4,
  wide: false,
  ...over,
});

const data = (): LinksData => ({
  areas: [
    { id: 'area-1-aaaaa', name: 'Pagos' },
    { id: 'area-2-bbbbb', name: 'Checkout' },
  ],
  links: [
    link('link-1', 'area-1-aaaaa'),
    link('link-2', 'area-2-bbbbb'),
    link('link-3', 'area-1-aaaaa', { wide: true }),
  ],
});

function reversedKeys<T>(v: T): T {
  if (Array.isArray(v)) return v.map(reversedKeys) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v)
        .reverse()
        .map(([k, x]) => [k, reversedKeys(x)]),
    ) as T;
  }
  return v;
}

const obj = (m: Map<string, string>) => Object.fromEntries(m);

describe('el formato de Links en la carpeta', () => {
  it('un fichero por área, el orden y el marcador', () => {
    expect([...LINKS_FORMAT.serialize(data()).keys()].sort()).toEqual(
      [MARKER_FILE, ORDER_FILE, 'area-1-aaaaa.json', 'area-2-bbbbb.json'].sort(),
    );
  });

  it('es determinista', () => {
    expect(obj(LINKS_FORMAT.serialize(reversedKeys(data())))).toEqual(
      obj(LINKS_FORMAT.serialize(data())),
    );
  });

  it('los enlaces van dentro de su área, en orden y sin areaId', () => {
    const file = JSON.parse(LINKS_FORMAT.serialize(data()).get('area-1-aaaaa.json')!);
    expect(file.links.map((l: Link) => l.id)).toEqual(['link-1', 'link-3']);
    expect(JSON.stringify(file)).not.toContain('areaId');
    expect(Object.keys(file.links[0])).toEqual([
      'id',
      'name',
      'description',
      'url',
      'monogram',
      'from',
      'to',
      'wide',
    ]);
  });

  it('ida y vuelta, con el área recuperada del fichero', () => {
    const back = LINKS_FORMAT.parse(LINKS_FORMAT.serialize(data()));
    expect(back.kind).toBe('ok');
    if (back.kind !== 'ok') return;
    expect(back.data.areas).toEqual(data().areas);
    const byId = (ls: Link[]) => [...ls].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(back.data.links)).toEqual(byId(data().links));
  });

  it('un campo nuevo de un enlace no se pierde', () => {
    const d = data();
    (d.links[0] as Link & { atajo?: string }).atajo = 'g p';
    const back = LINKS_FORMAT.parse(LINKS_FORMAT.serialize(d));
    expect(back.kind === 'ok' && (back.data.links[0] as Link & { atajo?: string }).atajo).toBe(
      'g p',
    );
  });

  it('editar un enlace cambia solo el fichero de su área', () => {
    const before = LINKS_FORMAT.serialize(data());
    const d = data();
    d.links[1].url = 'https://grafana.example/nuevo';
    const after = LINKS_FORMAT.serialize(d);
    expect([...after.keys()].filter((k) => after.get(k) !== before.get(k))).toEqual([
      'area-2-bbbbb.json',
    ]);
  });

  it('reordenar las áreas solo toca order.json', () => {
    const before = LINKS_FORMAT.serialize(data());
    const d = data();
    d.areas.reverse();
    const after = LINKS_FORMAT.serialize(d);
    expect([...after.keys()].filter((k) => after.get(k) !== before.get(k))).toEqual([ORDER_FILE]);
  });

  it('un id raro no se sale de la carpeta', () => {
    expect(fileForArea('../x')).toMatch(/^area-x[0-9a-f]+\.json$/);
    expect(isAreaFile('README.md')).toBe(false);
  });
});

describe('lo que no se puede leer', () => {
  it('un área con marcas de conflicto', () => {
    const files = LINKS_FORMAT.serialize(data());
    files.set('area-1-aaaaa.json', '<<<<<<< HEAD\n');
    expect(LINKS_FORMAT.parse(files)).toEqual({ kind: 'unreadable', file: 'area-1-aaaaa.json' });
  });

  it('dos ficheros con la misma área', () => {
    const files = LINKS_FORMAT.serialize(data());
    files.set('area-9-copia.json', files.get('area-1-aaaaa.json')!);
    expect(LINKS_FORMAT.parse(files)).toEqual({ kind: 'unreadable', file: 'area-9-copia.json' });
  });

  it('el mismo enlace en dos áreas', () => {
    const files = LINKS_FORMAT.serialize(data());
    const a = JSON.parse(files.get('area-2-bbbbb.json')!);
    a.links.push({ ...data().links[0], areaId: undefined });
    files.set('area-2-bbbbb.json', JSON.stringify(a));
    expect(LINKS_FORMAT.parse(files).kind).toBe('unreadable');
  });

  it('order.json desalineado: el área sin listar va al final', () => {
    const files = LINKS_FORMAT.serialize(data());
    files.set(ORDER_FILE, '{ "areas": ["area-2-bbbbb", "fantasma"] }');
    const back = LINKS_FORMAT.parse(files);
    expect(back.kind === 'ok' && back.data.areas.map((a) => a.id)).toEqual([
      'area-2-bbbbb',
      'area-1-aaaaa',
    ]);
  });
});
