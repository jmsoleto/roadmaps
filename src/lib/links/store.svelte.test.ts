import { describe, it, expect, beforeEach } from 'vitest';
import { LinksStore } from './store.svelte';
import type { LinksBackend } from './storage';
import { normalize, type LinksData } from './model';

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
