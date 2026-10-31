import { describe, it, expect } from 'vitest';
import { hubApp, hubApps } from './registry';
import { API_ID, DECISIONS_ID, LINKS_ID, ROADMAPS_ID } from './apps';
import { links } from '../links/store.svelte';
import { isUnreadable, type AppAction } from './types';
import { store } from '../store/app.svelte';
import { roadmapsFolder } from '../store/roadmaps-folder.svelte';
import { apiFolder } from '../api/folder.svelte';
import { linksFolder } from '../links/folder.svelte';
import { apiContracts } from '../api/store.svelte';

/**
 * The contract the shell consumes, exercised the way the shell consumes it.
 *
 * This is what stops `App.svelte` and `Topbar.svelte` from growing a branch per
 * application again: if a live app forgets to register a screen or its actions,
 * the shell has nothing to render and no test would otherwise notice — the
 * failure is a blank page, not an error.
 */
describe('what the shell reads out of the registry', () => {
  it('gives every live application a screen', () => {
    for (const app of hubApps()) {
      if (app.state === 'live') expect(app.root).not.toBeNull();
      else expect(app.root).toBeNull();
    }
  });

  it('gives every live application a way in and a way to create', () => {
    for (const app of hubApps().filter((a) => a.state === 'live')) {
      expect(app.open).not.toBeNull();
      expect(app.create).not.toBeNull();
      expect(app.summary).not.toBeNull();
    }
  });

  it('lets an application decline a second breadcrumb level', () => {
    // Decisions has none; the topbar fills the gap itself.
    expect(hubApp(DECISIONS_ID)?.context).toBeNull();
    expect(hubApp(ROADMAPS_ID)?.context).not.toBeNull();
    expect(hubApp(API_ID)?.context).not.toBeNull();
  });

  it('declares actions as data, evaluated on demand', () => {
    for (const app of hubApps().filter((a) => a.state === 'live')) {
      const actions = app.actions?.() ?? [];
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) {
        expect(action.label).not.toBe('');
        expect(['button', 'file']).toContain(action.kind);
        expect(typeof action.run).toBe('function');
      }
    }
  });

  /**
   * The single hidden input in the topbar reads a file and hands its text to
   * whichever action asked for it, so a file action has to say what it accepts.
   */
  it('has every file action declare what it accepts', () => {
    const files = hubApps()
      .flatMap((a) => a.actions?.() ?? [])
      .filter((a): a is Extract<AppAction, { kind: 'file' }> => a.kind === 'file');

    expect(files.length).toBeGreaterThan(0);
    for (const action of files) expect(action.accept).toContain('json');
  });

  /**
   * A bad file has to reach the topbar as a thrown error, which is what it
   * turns into the message beside the actions. Swallowing it would leave the
   * user staring at an import that silently did nothing.
   */
  it('throws out of a file action when the document is not readable', () => {
    const files = hubApps()
      .flatMap((a) => a.actions?.() ?? [])
      .filter((a): a is Extract<AppAction, { kind: 'file' }> => a.kind === 'file');

    for (const action of files) expect(() => action.run('esto no es json')).toThrow();
  });

  it('registers no behaviour for an application that is not there', () => {
    expect(hubApp('incidents')).toBeUndefined();
  });
});

/**
 * Links Hub's three, and the one that has to be able to say "not now".
 *
 * The state is set directly rather than through `addArea`, which would schedule
 * a save into a `localStorage` this environment does not have. What is under
 * test is the actions the bar reads, not the store's writing.
 */
describe('the actions Links Hub declares', () => {
  function linkActions() {
    return hubApp(LINKS_ID)?.actions?.() ?? [];
  }

  function exportAction() {
    return linkActions().find((a) => a.label.includes('exportar'));
  }

  it('offers creating, importing and exporting', () => {
    const labels = linkActions().map((a) => a.label);
    expect(labels.some((l) => l.includes('nuevo enlace'))).toBe(true);
    expect(labels.some((l) => l.includes('importar'))).toBe(true);
    expect(labels.some((l) => l.includes('exportar'))).toBe(true);
  });

  it('cannot export with no area open', () => {
    links.data = { areas: [], links: [] };
    links.setActiveArea(null);
    expect(exportAction()?.disabled).toBe(true);
  });

  it('can export once an area is open', () => {
    links.data = { areas: [{ id: 'a1', name: 'Pagos' }], links: [] };
    links.setActiveArea('a1');
    expect(exportAction()?.disabled).toBe(false);
  });

  /** Importing never depends on there being an area: it brings its own. */
  it('offers importing even with nothing in the catalogue', () => {
    links.data = { areas: [], links: [] };
    links.setActiveArea(null);
    const importAction = linkActions().find((a) => a.label.includes('importar'));
    expect(importAction?.disabled).toBeFalsy();
  });
});

describe('la tarjeta de Roadmaps con la carpeta sin leer (carpeta-roadmaps, D10)', () => {
  // The registry reads the app's singletons; these tests drive them directly
  // and put them back, so the order of the suite does not matter.
  async function withStore(
    state: { ready: boolean; unavailable: (typeof store)['unavailable'] },
    fn: () => void | Promise<void>,
  ) {
    const before = { ready: store.ready, unavailable: store.unavailable };
    store.ready = state.ready;
    store.unavailable = state.unavailable;
    try {
      await fn();
    } finally {
      store.ready = before.ready;
      store.unavailable = before.unavailable;
    }
  }

  const summary = () => hubApp(ROADMAPS_ID)!.summary!();

  it('mientras abre no enseña cifras', async () => {
    await withStore({ ready: false, unavailable: null }, () => {
      const s = summary();
      expect(isUnreadable(s)).toBe(true);
      expect('stats' in s).toBe(false);
    });
  });

  it('sin permiso ofrece concederlo', async () => {
    await withStore(
      { ready: true, unavailable: { reason: 'x', why: { cause: 'permiso' } } },
      () => {
        const s = summary();
        expect(isUnreadable(s) && s.reason).toContain('permiso');
        expect(isUnreadable(s) && typeof s.grant).toBe('function');
      },
    );
  });

  it('con un fichero ilegible no ofrece conceder nada', async () => {
    await withStore(
      {
        ready: true,
        unavailable: { reason: 'x', why: { cause: 'fichero-ilegible', file: 'rm-1.json' } },
      },
      () => {
        const s = summary();
        expect(isUnreadable(s)).toBe(true);
        expect(isUnreadable(s) && s.grant).toBeUndefined();
      },
    );
  });

  it('no aporta avisos a la tira de la landing ni deja crear desde la barra', async () => {
    await withStore(
      { ready: true, unavailable: { reason: 'x', why: { cause: 'permiso' } } },
      () => {
        const actions = hubApp(ROADMAPS_ID)!.actions!();
        const create = actions.find((a) => a.label.includes('nuevo'));
        expect(create?.disabled).toBe(true);
        const folder = actions.find((a) => a.label.includes('carpeta'));
        expect(folder?.disabled).toBeFalsy();
      },
    );
  });

  it('con los datos leídos vuelve a dar sus cifras', async () => {
    await withStore({ ready: true, unavailable: null }, () => {
      const s = summary();
      expect(isUnreadable(s)).toBe(false);
      expect('stats' in s && s.stats).toHaveLength(3);
    });
  });
});

describe('la tarjeta de API Hub con la carpeta sin leer (carpeta-api-hub, 5.5)', () => {
  async function withApi(
    state: {
      source: 'browser' | 'folder';
      ready: boolean;
      unavailable: (typeof apiContracts)['unavailable'];
    },
    fn: () => void,
  ) {
    const before = { ready: apiContracts.ready, unavailable: apiContracts.unavailable };
    const backendBefore = (apiContracts as unknown as { backend: unknown }).backend;
    (apiContracts as unknown as { backend: unknown }).backend = {
      source: state.source,
      load: async () => ({ kind: 'empty' }),
      save: async () => {},
    };
    apiContracts.ready = state.ready;
    apiContracts.unavailable = state.unavailable;
    try {
      fn();
    } finally {
      apiContracts.ready = before.ready;
      apiContracts.unavailable = before.unavailable;
      (apiContracts as unknown as { backend: unknown }).backend = backendBefore;
    }
  }
  const summary = () => hubApp(API_ID)!.summary!();

  it('sin permiso ofrece concederlo y no da cifras', async () => {
    await withApi(
      { source: 'folder', ready: true, unavailable: { reason: 'x', why: { cause: 'permiso' } } },
      () => {
        const s = summary();
        expect(isUnreadable(s) && typeof s.grant).toBe('function');
      },
    );
  });

  it('abriendo la carpeta no da cifras', async () => {
    await withApi({ source: 'folder', ready: false, unavailable: null }, () => {
      expect(isUnreadable(summary())).toBe(true);
    });
  });

  it('con los contratos leídos da sus cifras aunque la biblioteca no se pueda leer', async () => {
    await withApi({ source: 'folder', ready: true, unavailable: null }, () => {
      expect(isUnreadable(summary())).toBe(false);
    });
  });

  it('en el navegador sigue como siempre', async () => {
    await withApi({ source: 'browser', ready: true, unavailable: null }, () => {
      expect(isUnreadable(summary())).toBe(false);
    });
  });

  it('la acción de carpeta está siempre y crear no mientras no se pueda leer', async () => {
    await withApi(
      { source: 'folder', ready: true, unavailable: { reason: 'x', why: { cause: 'permiso' } } },
      () => {
        const actions = hubApp(API_ID)!.actions!();
        expect(actions.find((a) => a.label.includes('carpeta'))?.disabled).toBeFalsy();
        expect(actions.find((a) => a.label.includes('nuevo'))?.disabled).toBe(true);
      },
    );
  });
});

describe('la tarjeta de Links con la carpeta sin leer (carpeta-links, 3.4)', () => {
  async function withLinks(
    state: { folder: boolean; ready: boolean; unavailable: (typeof links)['unavailable'] },
    fn: () => void,
  ) {
    const before = { ready: links.ready, unavailable: links.unavailable };
    const backendBefore = (links as unknown as { backend: unknown }).backend;
    if (state.folder) {
      (links as unknown as { backend: unknown }).backend = {
        source: 'folder',
        load: async () => ({ kind: 'empty' }),
        save: async () => {},
      };
    }
    links.ready = state.ready;
    links.unavailable = state.unavailable;
    try {
      fn();
    } finally {
      links.ready = before.ready;
      links.unavailable = before.unavailable;
      (links as unknown as { backend: unknown }).backend = backendBefore;
    }
  }
  const summary = () => hubApp(LINKS_ID)!.summary!();

  it('sin carpeta da sus cifras como siempre', async () => {
    await withLinks({ folder: false, ready: true, unavailable: null }, () => {
      expect(isUnreadable(summary())).toBe(false);
    });
  });

  it('con carpeta abriendo no da cifras', async () => {
    await withLinks({ folder: true, ready: false, unavailable: null }, () => {
      expect(isUnreadable(summary())).toBe(true);
    });
  });

  it('sin permiso ofrece concederlo, y crear queda desactivado', async () => {
    await withLinks(
      { folder: true, ready: true, unavailable: { reason: 'x', why: { cause: 'permiso' } } },
      () => {
        const s = summary();
        expect(isUnreadable(s) && typeof s.grant).toBe('function');
        const actions = hubApp(LINKS_ID)!.actions!();
        expect(actions.find((a) => a.label.includes('nuevo'))?.disabled).toBe(true);
        expect(actions.find((a) => a.label.includes('carpeta'))?.disabled).toBeFalsy();
      },
    );
  });
});

describe('el piloto del botón de carpeta (piloto-de-carpeta)', () => {
  const cases = [
    { id: ROADMAPS_ID, connection: () => roadmapsFolder, data: () => store },
    { id: API_ID, connection: () => apiFolder, data: () => apiContracts },
    { id: LINKS_ID, connection: () => linksFolder, data: () => links },
  ] as const;

  const pilotOf = (id: string) => {
    const action = hubApp(id)!.actions!().find((a) => a.label.includes('carpeta'))!;
    return action.kind === 'button' ? action.pilot : undefined;
  };

  for (const c of cases) {
    it(`${c.id}: sin carpeta no hay piloto; conectada parpadea; sin poder leer, alerta`, () => {
      const conn = c.connection();
      const data = c.data() as { unavailable: unknown };
      const before = { name: conn.folderName, unavailable: data.unavailable };
      try {
        conn.folderName = null;
        data.unavailable = null;
        expect(pilotOf(c.id)).toBeUndefined();

        conn.folderName = 'repo/x';
        expect(pilotOf(c.id)).toBe('ok');

        data.unavailable = { reason: 'x', why: { cause: 'permiso' } };
        expect(pilotOf(c.id)).toBe('alert');
      } finally {
        conn.folderName = before.name;
        data.unavailable = before.unavailable;
      }
    });
  }
});
