import { describe, it, expect } from 'vitest';
import {
  ASSIGNEES_FILE,
  BLOCKERS_FILE,
  MARKER_FILE,
  ORDER_FILE,
  fileForRoadmap,
  isRoadmapFile,
  markerText,
  parse,
  readMarker,
  serialize,
  type FileMap,
} from './folder-format';
import type { AppData, Item, Phase, Roadmap } from '../model/types';
import { seedAppData } from '../seed';

const item = (id: string, over: Partial<Item> = {}): Item => ({
  id,
  label: id,
  colorSlot: 1,
  startDate: '2026-02-02',
  endDate: '2026-02-06',
  assigneeId: 'as1',
  notes: '',
  dependsOn: [],
  blockers: [{ id: `ib-${id}`, blockerId: 'bl1', feature: 'API', resolved: false }],
  isMilestone: false,
  completedDate: null,
  endAtCompletion: null,
  baselineEnd: null,
  ...over,
});

const phase = (id: string, children: Item[]): Phase => ({
  id,
  name: id,
  colorSlot: 0,
  assigneeId: null,
  notes: 'notas de fase',
  startDate: null,
  endDate: null,
  children,
});

const roadmap = (id: string, rows: Phase[] = []): Roadmap => ({
  id,
  name: `Roadmap ${id}`,
  colorSlot: 2,
  startDate: '2026-01-01',
  windowDays: 730,
  baselineDate: null,
  rows,
});

const data = (): AppData => ({
  roadmaps: [
    roadmap('rm-1-aaaaa', [phase('ph-1', [item('it-1'), item('it-2', { dependsOn: ['it-1'] })])]),
    roadmap('rm-2-bbbbb', [phase('ph-2', [item('it-3')])]),
  ],
  assignees: [{ id: 'as1', name: 'Ana', colorSlot: 3 }],
  blockers: [{ id: 'bl1', name: 'Checkout', owner: 'Enrique', email: '' }],
});

/** The same value with every object's keys in reverse insertion order. */
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

const asObject = (files: FileMap) => Object.fromEntries(files);

describe('escribir es determinista (D2)', () => {
  it('el mismo estado da los mismos bytes, nazca como nazca cada objeto', () => {
    expect(asObject(serialize(reversedKeys(data())))).toEqual(asObject(serialize(data())));
  });

  it('guardar dos veces lo mismo deja los ficheros byte a byte iguales', () => {
    const d = data();
    const first = serialize(d);
    const back = parse(first);
    expect(back.kind).toBe('ok');
    if (back.kind !== 'ok') return;
    expect(asObject(serialize(back.data))).toEqual(asObject(first));
  });

  it('dos espacios y salto de línea final en cada fichero', () => {
    for (const [, text] of serialize(data())) {
      expect(text.endsWith('}\n')).toBe(true);
      expect(text).toMatch(/^\{\n {2}"/);
    }
  });

  it('el seed también se escribe sin campos de vista', () => {
    const files = serialize(seedAppData());
    for (const [, text] of files) expect(text).not.toMatch(/"expanded"|"activeId"/);
  });

  it('un campo que no está en la lista no se escribe', () => {
    const d = data();
    (d.roadmaps[0].rows[0] as Phase & { expanded?: boolean }).expanded = false;
    (d as AppData & { activeId?: string }).activeId = 'rm-1-aaaaa';
    for (const [, text] of serialize(d)) expect(text).not.toMatch(/"expanded"|"activeId"/);
  });
});

describe('la estructura de la carpeta (D1)', () => {
  it('marcador, orden, dos catálogos y un fichero por roadmap', () => {
    expect([...serialize(data()).keys()].sort()).toEqual(
      [
        MARKER_FILE,
        ORDER_FILE,
        ASSIGNEES_FILE,
        BLOCKERS_FILE,
        'rm-1-aaaaa.json',
        'rm-2-bbbbb.json',
      ].sort(),
    );
  });

  it('el fichero lleva el id, no el nombre', () => {
    const d = data();
    d.roadmaps[0].name = 'Otro nombre';
    expect(serialize(d).has('rm-1-aaaaa.json')).toBe(true);
  });

  it('un id raro no escapa de la carpeta ni choca con otro', () => {
    const odd = fileForRoadmap('../../etc/passwd');
    expect(odd).toMatch(/^rm-x[0-9a-f]+\.json$/);
    expect(isRoadmapFile(odd)).toBe(true);
    expect(fileForRoadmap('rm-xyz')).not.toBe('rm-xyz.json');
    expect(fileForRoadmap('a')).not.toBe(fileForRoadmap('rm-a'));
  });

  it('los ficheros que no son de roadmap no se toman por roadmaps', () => {
    expect(isRoadmapFile('README.md')).toBe(false);
    expect(isRoadmapFile('package.json')).toBe(false);
    expect(isRoadmapFile(ORDER_FILE)).toBe(false);
  });
});

describe('ida y vuelta (4.2)', () => {
  it('los mismos roadmaps, en el mismo orden, con los mismos catálogos', () => {
    const d = data();
    const back = parse(serialize(d));
    expect(back).toEqual({ kind: 'ok', data: d });
  });

  it('el orden lo dice order.json y no el nombre de los ficheros', () => {
    const d = data();
    d.roadmaps.reverse();
    const back = parse(serialize(d));
    expect(back.kind === 'ok' && back.data.roadmaps.map((r) => r.id)).toEqual([
      'rm-2-bbbbb',
      'rm-1-aaaaa',
    ]);
  });

  it('un roadmap que order.json no nombra va al final', () => {
    const files = serialize(data());
    files.set(ORDER_FILE, '{\n  "roadmaps": ["rm-2-bbbbb"]\n}\n');
    const back = parse(files);
    expect(back.kind === 'ok' && back.data.roadmaps.map((r) => r.id)).toEqual([
      'rm-2-bbbbb',
      'rm-1-aaaaa',
    ]);
  });

  it('un id de order.json sin fichero se ignora', () => {
    const files = serialize(data());
    files.delete('rm-1-aaaaa.json');
    const back = parse(files);
    expect(back.kind === 'ok' && back.data.roadmaps.map((r) => r.id)).toEqual(['rm-2-bbbbb']);
  });

  it('una carpeta marcada sin nada más es un plan vacío', () => {
    const files: FileMap = new Map([[MARKER_FILE, markerText()]]);
    expect(parse(files)).toEqual({
      kind: 'ok',
      data: { roadmaps: [], assignees: [], blockers: [] },
    });
  });
});

describe('lo que no se puede leer (4.3, D8)', () => {
  it('marcas de conflicto de git nombran el fichero', () => {
    const files = serialize(data());
    const text = files.get('rm-1-aaaaa.json')!;
    files.set(
      'rm-1-aaaaa.json',
      text.replace(
        '"name": "Roadmap rm-1-aaaaa"',
        '<<<<<<< HEAD\n"name": "A"\n=======\n"name": "B"\n>>>>>>> otra',
      ),
    );
    expect(parse(files)).toEqual({ kind: 'unreadable', file: 'rm-1-aaaaa.json' });
  });

  it('un catálogo sin su lista nombra el fichero', () => {
    const files = serialize(data());
    files.set(ASSIGNEES_FILE, '{\n  "personas": []\n}\n');
    expect(parse(files)).toEqual({ kind: 'unreadable', file: ASSIGNEES_FILE });
  });

  it('un roadmap sin filas nombra el fichero', () => {
    const files = serialize(data());
    files.set('rm-2-bbbbb.json', '{\n  "id": "rm-2-bbbbb",\n  "name": "x"\n}\n');
    expect(parse(files)).toEqual({ kind: 'unreadable', file: 'rm-2-bbbbb.json' });
  });

  it('dos ficheros con el mismo id nombran el segundo', () => {
    const files = serialize(data());
    files.set('rm-9-copia.json', files.get('rm-1-aaaaa.json')!);
    expect(parse(files)).toEqual({ kind: 'unreadable', file: 'rm-9-copia.json' });
  });
});

describe('un cambio pequeño es un diff pequeño (4.4)', () => {
  it('mover una fecha cambia un fichero y una línea', () => {
    const before = serialize(data());
    const d = data();
    d.roadmaps[0].rows[0].children[1].endDate = '2026-02-13';
    const after = serialize(d);

    const changed = [...after.keys()].filter((k) => after.get(k) !== before.get(k));
    expect(changed).toEqual(['rm-1-aaaaa.json']);

    const a = before.get('rm-1-aaaaa.json')!.split('\n');
    const b = after.get('rm-1-aaaaa.json')!.split('\n');
    expect(b).toHaveLength(a.length);
    const lines = b.filter((line, i) => line !== a[i]);
    expect(lines).toEqual(['          "endDate": "2026-02-13",']);
  });

  it('reordenar los roadmaps solo toca order.json', () => {
    const before = serialize(data());
    const d = data();
    d.roadmaps.reverse();
    const after = serialize(d);
    const changed = [...after.keys()].filter((k) => after.get(k) !== before.get(k));
    expect(changed).toEqual([ORDER_FILE]);
  });
});

describe('el marcador (4.5)', () => {
  it('el nuestro', () => {
    expect(readMarker(markerText())).toEqual({ kind: 'ours' });
  });

  it('el de otra aplicación dice cuál', () => {
    expect(readMarker('{ "app": "api", "format": 1 }')).toEqual({ kind: 'foreign', app: 'api' });
  });

  it('sin marcador, o con uno que no se entiende, no es nuestra', () => {
    expect(readMarker(null)).toEqual({ kind: 'not-ours' });
    expect(readMarker('no es json')).toEqual({ kind: 'not-ours' });
    expect(readMarker('{ "app": "roadmaps" }')).toEqual({ kind: 'not-ours' });
  });

  it('una versión del formato posterior', () => {
    expect(readMarker('{ "app": "roadmaps", "format": 2 }')).toEqual({ kind: 'future', format: 2 });
  });
});
