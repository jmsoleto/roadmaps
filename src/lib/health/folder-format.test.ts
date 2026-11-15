import { describe, it, expect } from 'vitest';
import { FileSync, type FileMap } from '../folder/file-sync';
import { MemoryDir } from '../folder/memory-fs';
import { readAll } from '../folder/fs';
import { MARKER_FILE } from '../folder/marker';
import { HEALTH_FORMAT, isObsFile } from './folder-format';
import { datosIniciales, type HealthData, type Observacion } from './model';

const fila = (dia: string, metrica: string, valor: number): Observacion => ({
  dia,
  metrica,
  valor,
  fuente: 'kibana',
  capturado: '2026-11-07',
});

function ejemplo(): HealthData {
  return {
    ...datosIniciales('Europe/Madrid'),
    aplicaciones: [
      {
        id: 'pedidos',
        nombre: 'Pedidos',
        consultas: { 'errores-50x': 'status:500' },
        versiones: [{ id: 'v-1', version: '4.2.0', dia: '2026-11-03' }],
      },
      { id: 'pagos', nombre: 'Pagos', consultas: {}, versiones: [] },
    ],
    observaciones: {
      pedidos: [
        fila('2026-11-05', 'errores-50x', 340),
        fila('2026-11-05', 'errores-40x', 2),
        fila('2026-10-31', 'errores-50x', 12),
      ],
      pagos: [],
    },
  };
}

const parsed = (files: FileMap) => {
  const out = HEALTH_FORMAT.parse(files);
  if (out.kind !== 'ok') throw new Error(`ilegible: ${out.file}`);
  return out.data;
};

const unreadable = (files: FileMap) => {
  const out = HEALTH_FORMAT.parse(files);
  return out.kind === 'unreadable' ? out.file : null;
};

describe('el formato de Health Hub', () => {
  it('escribe el marcador, el catálogo, el orden y un fichero por aplicación y mes', () => {
    const names = [...HEALTH_FORMAT.serialize(ejemplo()).keys()].sort();
    expect(names).toEqual(
      [
        MARKER_FILE,
        'catalogo.json',
        'order.json',
        'app-pedidos.json',
        'app-pagos.json',
        'obs-pedidos-2026-10.json',
        'obs-pedidos-2026-11.json',
      ].sort(),
    );
  });

  it('se lee como se escribió', () => {
    const data = parsed(HEALTH_FORMAT.serialize(ejemplo()));
    expect(data.catalogo.zona).toBe('Europe/Madrid');
    expect(data.aplicaciones.map((a) => a.id)).toEqual(['pedidos', 'pagos']);
    expect(data.observaciones.pedidos).toHaveLength(3);
    expect(data.aplicaciones[0].consultas['errores-50x']).toBe('status:500');
  });

  it('da los mismos bytes con el mismo estado, venga en el orden que venga', () => {
    const a = HEALTH_FORMAT.serialize(ejemplo());
    const otro = ejemplo();
    otro.observaciones.pedidos.reverse();
    const b = HEALTH_FORMAT.serialize(otro);
    const bytes = (files: FileMap) => Object.fromEntries(files);
    expect(bytes(a)).toEqual(bytes(b));
    expect(bytes(HEALTH_FORMAT.serialize(parsed(a)))).toEqual(bytes(a));
  });

  it('pone cada observación en una sola línea, ordenadas por día y métrica', () => {
    const texto = HEALTH_FORMAT.serialize(ejemplo()).get('obs-pedidos-2026-11.json')!;
    const lineas = texto.split('\n').filter((l) => l.includes('"dia"'));
    expect(lineas).toHaveLength(2);
    expect(lineas[0]).toContain('"metrica":"errores-40x"');
    expect(lineas[1]).toContain('"metrica":"errores-50x"');
  });

  it('un día corregido cambia una sola línea', () => {
    const antes = HEALTH_FORMAT.serialize(ejemplo()).get('obs-pedidos-2026-11.json')!.split('\n');
    const data = ejemplo();
    data.observaciones.pedidos[0] = fila('2026-11-05', 'errores-50x', 341);
    const despues = HEALTH_FORMAT.serialize(data).get('obs-pedidos-2026-11.json')!.split('\n');
    expect(antes.filter((l, i) => l !== despues[i])).toHaveLength(1);
  });

  it('no pierde un campo que no conoce', () => {
    const files = HEALTH_FORMAT.serialize(ejemplo());
    const app = JSON.parse(files.get('app-pagos.json')!);
    files.set('app-pagos.json', JSON.stringify({ ...app, equipo: 'core' }));
    const vuelta = HEALTH_FORMAT.serialize(parsed(files));
    expect(JSON.parse(vuelta.get('app-pagos.json')!).equipo).toBe('core');
  });

  it('sin vínculo ni nota, el fichero de aplicación no cambia de bytes', () => {
    const texto = HEALTH_FORMAT.serialize(ejemplo()).get('app-pagos.json')!;
    expect(texto).toBe(
      '{\n  "id": "pagos",\n  "nombre": "Pagos",\n  "consultas": {},\n  "versiones": []\n}\n',
    );
  });

  it('guarda el vínculo y la nota tras el nombre, y los lee igual', () => {
    const data = ejemplo();
    data.aplicaciones[1] = { ...data.aplicaciones[1], fuente: 'cex-es', nota: 'Tasa aproximada' };
    const files = HEALTH_FORMAT.serialize(data);
    expect(Object.keys(JSON.parse(files.get('app-pagos.json')!))).toEqual([
      'id',
      'nombre',
      'fuente',
      'nota',
      'consultas',
      'versiones',
    ]);
    expect(parsed(files).aplicaciones[1]).toMatchObject({
      fuente: 'cex-es',
      nota: 'Tasa aproximada',
    });
  });

  it('no reclama la bandeja ni un fichero ajeno', () => {
    expect(HEALTH_FORMAT.owns('entrada-2026-11-07.json')).toBe(false);
    expect(HEALTH_FORMAT.owns('notas.md')).toBe(false);
    expect(isObsFile('obs-sin-mes.json')).toBe(false);
  });
});

describe('lo que deja Health Hub no disponible', () => {
  it('un conflicto de git', () => {
    const files = HEALTH_FORMAT.serialize(ejemplo());
    files.set('obs-pedidos-2026-11.json', '<<<<<<< HEAD\n{}\n=======\n{}\n>>>>>>> otra\n');
    expect(unreadable(files)).toBe('obs-pedidos-2026-11.json');
  });

  it('un fichero que contradice su nombre', () => {
    const files = HEALTH_FORMAT.serialize(ejemplo());
    const obs = JSON.parse(files.get('obs-pedidos-2026-11.json')!);
    files.set('obs-pedidos-2026-11.json', JSON.stringify({ ...obs, mes: '2026-12' }));
    expect(unreadable(files)).toBe('obs-pedidos-2026-11.json');
  });

  it('una fila fuera de su mes', () => {
    const files = HEALTH_FORMAT.serialize(ejemplo());
    const obs = JSON.parse(files.get('obs-pedidos-2026-11.json')!);
    obs.filas[0].dia = '2026-12-01';
    files.set('obs-pedidos-2026-11.json', JSON.stringify(obs));
    expect(unreadable(files)).toBe('obs-pedidos-2026-11.json');
  });

  it('un día duplicado para la misma métrica', () => {
    const files = HEALTH_FORMAT.serialize(ejemplo());
    const obs = JSON.parse(files.get('obs-pedidos-2026-11.json')!);
    obs.filas.push(obs.filas[0]);
    files.set('obs-pedidos-2026-11.json', JSON.stringify(obs));
    expect(unreadable(files)).toBe('obs-pedidos-2026-11.json');
  });

  it('observaciones de una aplicación sin fichero, que el siguiente guardado borraría', () => {
    const files = HEALTH_FORMAT.serialize(ejemplo());
    files.delete('app-pedidos.json');
    expect(unreadable(files)).toMatch(/^obs-pedidos-/);
  });

  it('un fichero de aplicación cuyo id no es el de su nombre', () => {
    const files = HEALTH_FORMAT.serialize(ejemplo());
    const app = JSON.parse(files.get('app-pagos.json')!);
    files.set('app-pagos.json', JSON.stringify({ ...app, id: 'otra' }));
    expect(unreadable(files)).toBe('app-otra.json');
  });

  it('un vínculo que no es un id de la fuente', () => {
    const files = HEALTH_FORMAT.serialize(ejemplo());
    const app = JSON.parse(files.get('app-pagos.json')!);
    files.set('app-pagos.json', JSON.stringify({ ...app, fuente: 'CEX ES' }));
    expect(unreadable(files)).toBe('app-pagos.json');
    files.set('app-pagos.json', JSON.stringify({ ...app, nota: 3 }));
    expect(unreadable(files)).toBe('app-pagos.json');
  });

  it('un valor negativo', () => {
    const files = HEALTH_FORMAT.serialize(ejemplo());
    const obs = JSON.parse(files.get('obs-pedidos-2026-11.json')!);
    obs.filas[0].valor = -1;
    files.set('obs-pedidos-2026-11.json', JSON.stringify(obs));
    expect(unreadable(files)).toBe('obs-pedidos-2026-11.json');
  });
});

describe('en una carpeta', () => {
  it('una captura de un mes solo reescribe ese mes', async () => {
    const dir = new MemoryDir('health');
    const sync = new FileSync(dir, HEALTH_FORMAT);
    await sync.save(ejemplo());
    const antes = await readAll(dir);

    const data = ejemplo();
    data.observaciones.pedidos.push(fila('2026-11-06', 'errores-50x', 1));
    await sync.save(data);
    const despues = await readAll(dir);

    const cambiados = [...despues.keys()].filter((n) => despues.get(n) !== antes.get(n));
    expect(cambiados).toEqual(['obs-pedidos-2026-11.json']);
  });

  it('eliminar una aplicación borra sus ficheros y nada más', async () => {
    const dir = new MemoryDir('health');
    const sync = new FileSync(dir, HEALTH_FORMAT);
    const data = ejemplo();
    await sync.save(data);
    await dir.getFileHandle('notas.md', { create: true });

    await sync.save({
      ...data,
      aplicaciones: data.aplicaciones.filter((a) => a.id !== 'pedidos'),
      observaciones: { pagos: [] },
    });
    const names = [...(await readAll(dir)).keys()];
    expect(names.some((n) => n.includes('pedidos'))).toBe(false);
    expect(names).toContain('notas.md');
  });
});
