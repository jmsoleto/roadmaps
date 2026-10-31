/**
 * API Hub's view state lives in preferences (carpeta-api-hub, D4).
 *
 * One fake plays both the backend and the preferences and survives across
 * "restarts" (a new store over the same fake), as a browser does.
 */

import { describe, it, expect } from 'vitest';
import { ApiContractsStore } from './store.svelte';
import type { ApiBackend, LoadOutcome } from './storage';
import type { Prefs } from '../store/storage';
import type { ApiData } from './model/types';
import { exportContract } from './io';

class Browser implements ApiBackend, Prefs {
  doc: ApiData | null = null;
  prefs = new Map<string, string>();
  saves = 0;
  async load(): Promise<LoadOutcome<ApiData>> {
    return this.doc ? { kind: 'loaded', data: structuredClone(this.doc) } : { kind: 'empty' };
  }
  async save(data: ApiData): Promise<void> {
    this.doc = structuredClone(data);
    this.saves += 1;
  }
  async getPref(key: string): Promise<string | null> {
    return this.prefs.get(key) ?? null;
  }
  async setPref(key: string, value: string): Promise<void> {
    this.prefs.set(key, value);
  }
}

async function boot(browser: Browser) {
  const store = new ApiContractsStore(browser, browser);
  await store.init();
  return store;
}

/** A contract with an endpoint whose body has a child, saved and reopened. */
async function seeded() {
  const browser = new Browser();
  const store = await boot(browser);
  const c = store.addContract('Pedidos')!;
  const ep = store.addEndpoint()!;
  const body = store.open!.endpoints[0].body ?? null;
  await store.flush();
  return { browser, store, c, ep, body };
}

describe('el plegado de los nodos', () => {
  it('sobrevive a reiniciar y no guarda el contrato', async () => {
    const { browser, store } = await seeded();
    const model = store.addModel('Pedido')!;
    await store.flush();
    const saves = browser.saves;

    store.toggleOpen(model.node.id);
    await new Promise((r) => setTimeout(r, 300));
    expect(browser.saves).toBe(saves);
    expect(JSON.stringify(browser.doc)).not.toMatch(/"open"/);

    const again = await boot(browser);
    expect(again.isCollapsed(model.node.id)).toBe(true);
  });

  it('un nodo nuevo nace abierto sin escribir ninguna preferencia', async () => {
    const { browser, store } = await seeded();
    const model = store.addModel('Pedido')!;
    const before = browser.prefs.get('api:collapsed-nodes');
    const child = store.addChild(model.node.id)!;
    expect(store.isCollapsed(child.id)).toBe(false);
    expect(browser.prefs.get('api:collapsed-nodes')).toBe(before);
  });

  it('añadir un hijo a un nodo plegado lo despliega', async () => {
    const { store } = await seeded();
    const model = store.addModel('Pedido')!;
    store.toggleOpen(model.node.id);
    store.addChild(model.node.id);
    expect(store.isCollapsed(model.node.id)).toBe(false);
  });
});

describe('el contrato abierto y su vista', () => {
  it('se recuerdan al reiniciar, fuera del documento', async () => {
    const { browser, c, ep } = await seeded();
    const again = await boot(browser);
    expect(again.open?.id).toBe(c.id);
    expect(again.openEndpoint?.id).toBe(ep.id);
    expect(JSON.stringify(browser.doc)).not.toMatch(/"openId"|"view"/);
  });

  it('volver a la portada se recuerda', async () => {
    const { browser, store } = await seeded();
    store.setOpen(null);
    const again = await boot(browser);
    expect(again.open).toBeNull();
  });

  it('una vista que apunta a algo borrado no se aplica', async () => {
    const { browser, store, ep } = await seeded();
    store.deleteEndpoint(ep.id);
    await store.flush();
    const again = await boot(browser);
    expect(again.openEndpoint).toBeNull();
  });
});

describe('documentos guardados con la vista dentro', () => {
  function legacyBrowser() {
    const browser = new Browser();
    browser.doc = {
      contracts: [
        {
          id: 'c1',
          title: 'Viejo',
          version: '1.0.0',
          description: '',
          server: '',
          colorSlot: 0,
          models: [
            {
              id: 'm1',
              name: 'M',
              description: '',
              node: {
                id: 'n1',
                key: 'm',
                type: 'object',
                itemType: 'string',
                itemRef: '',
                ref: '',
                description: '',
                example: '',
                required: true,
                format: '',
                enums: [],
                nullable: false,
                children: [],
                open: false,
              },
            },
          ],
          endpoints: [],
          view: { kind: 'model', id: 'm1' },
        },
      ],
      openId: 'c1',
    } as unknown as ApiData;
    return browser;
  }

  it('los conserva como preferencias', async () => {
    const store = await boot(legacyBrowser());
    expect(store.open?.id).toBe('c1');
    expect(store.openModel?.id).toBe('m1');
    expect(store.isCollapsed('n1')).toBe(true);
  });

  it('sin forzar una escritura del documento', async () => {
    const browser = legacyBrowser();
    await boot(browser);
    await new Promise((r) => setTimeout(r, 300));
    expect(browser.saves).toBe(0);
  });

  it('y sobreviven al siguiente guardado', async () => {
    const browser = legacyBrowser();
    const store = await boot(browser);
    store.renameContract('c1', 'Renombrado');
    await store.flush();
    expect(JSON.stringify(browser.doc)).not.toMatch(/"open"|"openId"|"view"/);
    const again = await boot(browser);
    expect(again.openModel?.id).toBe('m1');
    expect(again.isCollapsed('n1')).toBe(true);
  });
});

describe('importar no cambia cómo se mira', () => {
  it('ni el plegado ni las vistas de quien importa', async () => {
    const { browser, store } = await seeded();
    const doc = JSON.parse(exportContract(store.open!));
    doc.contract.view = { kind: 'endpoint', id: doc.contract.endpoints[0].id };
    const before = new Map(browser.prefs);
    const imported = store.importContract(JSON.stringify(doc))!;
    expect(store.viewOf(imported)).toBeNull();
    expect(browser.prefs.get('api:collapsed-nodes')).toBe(before.get('api:collapsed-nodes'));
    expect(browser.prefs.get('api:views')).toBe(before.get('api:views'));
  });
});
