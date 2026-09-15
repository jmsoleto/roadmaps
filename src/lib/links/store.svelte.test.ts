import { describe, it, expect, beforeEach } from 'vitest';
import { LinksStore } from './store.svelte';
import type { LinksBackend } from './storage';
import { normalize, type LinksData } from './model';
import { parseAreaImport } from './io';

function backend(seed: unknown): LinksBackend & { saved: LinksData | null } {
  return {
    saved: null,
    load: () => normalize(seed),
    save(data) {
      this.saved = data;
    },
  };
}

const SEED = {
  areas: [
    { id: 'a1', name: 'Favoritos' },
    { id: 'a2', name: 'Pagos' },
    { id: 'a3', name: 'CSC' },
  ],
  links: [
    { id: 'l1', areaId: 'a1', name: 'Grafana', url: 'https://g.interno' },
    { id: 'l2', areaId: 'a1', name: 'Kibana', url: 'https://k.interno' },
    { id: 'l3', areaId: 'a2', name: 'PSP', url: 'https://p.interno' },
    { id: 'l4', areaId: 'a1', name: 'OpenShift', url: 'https://o.interno' },
  ],
};

let store: LinksStore;

beforeEach(() => {
  store = new LinksStore(backend(SEED));
  store.init();
});

describe('al entrar', () => {
  it('arranca en la primera área y sin foco', () => {
    expect(store.activeAreaId).toBe('a1');
    expect(store.focusedLinkId).toBe(null);
  });

  it('enseña solo los enlaces del área activa, en orden', () => {
    expect(store.visibleLinks.map((l) => l.id)).toEqual(['l1', 'l2', 'l4']);
  });

  it('cuenta los enlaces de cada área', () => {
    expect(store.countIn('a1')).toBe(3);
    expect(store.countIn('a2')).toBe(1);
    expect(store.countIn('a3')).toBe(0);
  });
});

describe('moverse entre áreas', () => {
  it('las flechas laterales dan la vuelta al llegar al final', () => {
    store.stepArea(1);
    expect(store.activeAreaId).toBe('a2');
    store.stepArea(1);
    store.stepArea(1);
    expect(store.activeAreaId).toBe('a1');
    store.stepArea(-1);
    expect(store.activeAreaId).toBe('a3');
  });

  it('cambiar de área suelta el foco, que era de la rejilla anterior', () => {
    store.setFocus('l1');
    store.stepArea(1);
    expect(store.focusedLinkId).toBe(null);
  });
});

describe('mover el foco', () => {
  it('recorre solo el área activa y da la vuelta', () => {
    store.stepFocus(1);
    expect(store.focusedLinkId).toBe('l1');
    store.stepFocus(1);
    store.stepFocus(1);
    expect(store.focusedLinkId).toBe('l4');
    store.stepFocus(1);
    expect(store.focusedLinkId).toBe('l1');
  });

  it('hacia atrás desde ningún foco entra por el final', () => {
    store.stepFocus(-1);
    expect(store.focusedLinkId).toBe('l4');
  });

  it('en un área vacía no hace nada', () => {
    store.setActiveArea('a3');
    store.stepFocus(1);
    expect(store.focusedLinkId).toBe(null);
  });
});

describe('llegar desde la landing', () => {
  it('activa el área del enlace y lo enfoca, sin abrirlo', () => {
    store.reveal('l3');
    expect(store.activeAreaId).toBe('a2');
    expect(store.focusedLinkId).toBe('l3');
  });

  it('un enlace que ya no existe no mueve nada', () => {
    store.reveal('se-borró');
    expect(store.activeAreaId).toBe('a1');
    expect(store.focusedLinkId).toBe(null);
  });
});

describe('áreas', () => {
  it('eliminar un área se lleva sus enlaces y solo los suyos', () => {
    store.deleteArea('a1');
    expect(store.data.areas.map((a) => a.id)).toEqual(['a2', 'a3']);
    expect(store.data.links.map((l) => l.id)).toEqual(['l3']);
    expect(store.activeAreaId).toBe('a2');
  });

  it('crear un área la deja activa', () => {
    const area = store.addArea('Logística');
    expect(store.activeAreaId).toBe(area!.id);
  });

  it('no crea áreas sin nombre', () => {
    expect(store.addArea('   ')).toBe(null);
    expect(store.data.areas).toHaveLength(3);
  });

  it('se reordenan', () => {
    store.moveArea('a3', 0);
    expect(store.data.areas.map((a) => a.id)).toEqual(['a3', 'a1', 'a2']);
  });
});

describe('enlaces', () => {
  it('se añaden al área activa', () => {
    const link = store.addLink({ name: 'Akamai', url: 'https://a.interno' });
    expect(link?.areaId).toBe('a1');
    expect(store.visibleLinks.map((l) => l.id)).toEqual(['l1', 'l2', 'l4', link!.id]);
  });

  it('no se pueden añadir sin un área donde ponerlos', () => {
    const empty = new LinksStore(backend(null));
    empty.init();
    expect(empty.addLink({ name: 'X', url: 'https://x.interno' })).toBe(null);
  });

  it('se reordenan dentro de su área sin tocar las demás', () => {
    // Es lo que cambia qué enlace responde al 1 y al 2, así que importa.
    store.moveLink('l4', 0);
    expect(store.visibleLinks.map((l) => l.id)).toEqual(['l4', 'l1', 'l2']);
    store.setActiveArea('a2');
    expect(store.visibleLinks.map((l) => l.id)).toEqual(['l3']);
  });

  it('eliminar uno corre a los de detrás, y solo dentro de su área', () => {
    // Lo que cuesta borrar no es el enlace: es que los de detrás cambian de
    // tecla. `l1` era el 1, así que al irse `l2` pasa a ser el 1 y `l4` el 2.
    store.deleteLink('l1');
    expect(store.visibleLinks.map((l) => l.id)).toEqual(['l2', 'l4']);
    store.setActiveArea('a2');
    expect(store.visibleLinks.map((l) => l.id)).toEqual(['l3']);
  });

  it('eliminar el enfocado suelta el foco', () => {
    store.setFocus('l2');
    store.deleteLink('l2');
    expect(store.focusedLinkId).toBe(null);
  });

  it('volver a casa deja la primera área y ningún foco', () => {
    store.setActiveArea('a2');
    store.setFocus('l3');
    store.home();
    expect(store.activeAreaId).toBe('a1');
    expect(store.focusedLinkId).toBe(null);
  });
});

describe('guardar', () => {
  it('escribe un objeto plano, no el proxy reactivo', () => {
    const be = backend(SEED);
    const s = new LinksStore(be);
    s.init();
    s.addArea('Nueva');
    s.flush();
    expect(be.saved).not.toBe(null);
    expect(JSON.parse(JSON.stringify(be.saved))).toEqual(be.saved);
    expect(be.saved!.areas.map((a) => a.name)).toContain('Nueva');
  });
});

describe('al importar un área', () => {
  const DOC = JSON.stringify({
    kind: 'tech-lead-hub/links',
    area: { name: 'Pagos' },
    links: [
      { name: 'PSP', url: 'https://psp.interno' },
      { name: 'Conciliación', url: 'https://conc.interno' },
    ],
  });

  function bring() {
    const { area, links } = parseAreaImport(DOC);
    store.importArea(area, links);
    return area;
  }

  it('la añade al final y la deja abierta, sin foco', () => {
    const area = bring();
    expect(store.areas.map((a) => a.name)).toEqual(['Favoritos', 'Pagos', 'CSC', 'Pagos']);
    expect(store.activeAreaId).toBe(area.id);
    expect(store.focusedLinkId).toBe(null);
    expect(store.visibleLinks.map((l) => l.name)).toEqual(['PSP', 'Conciliación']);
  });

  /** Escenario «Importar dos veces»: conviven, y editar una no toca a la otra. */
  it('importar dos veces deja dos áreas independientes', () => {
    const first = bring();
    const second = bring();

    expect(first.id).not.toBe(second.id);
    expect(store.areas).toHaveLength(5);
    expect(store.countIn(first.id)).toBe(2);
    expect(store.countIn(second.id)).toBe(2);

    store.renameArea(second.id, 'Pagos (de Ana)');
    expect(store.areas.find((a) => a.id === first.id)?.name).toBe('Pagos');

    store.deleteArea(second.id);
    expect(store.countIn(first.id)).toBe(2);
  });

  /** Escenario «Un nombre que ya existe»: la que estaba no se toca. */
  it('no funde con el área que ya tenía ese nombre', () => {
    const before = store.data.links.filter((l) => l.areaId === 'a2').map((l) => l.id);
    const area = bring();

    expect(area.id).not.toBe('a2');
    expect(store.countIn('a2')).toBe(before.length);
    expect(store.data.links.filter((l) => l.areaId === 'a2').map((l) => l.id)).toEqual(before);
  });

  it('deja los enlaces importados colgando de su propia área', () => {
    const area = bring();
    expect(store.data.links.filter((l) => l.areaId === area.id)).toHaveLength(2);
  });

  it('guarda lo importado', () => {
    const back = backend(SEED);
    const s = new LinksStore(back);
    s.init();
    const { area, links } = parseAreaImport(DOC);
    s.importArea(area, links);
    s.flush();
    expect(back.saved?.areas.map((a) => a.name)).toContain('Pagos');
    expect(back.saved?.links.filter((l) => l.areaId === area.id)).toHaveLength(2);
  });
});
