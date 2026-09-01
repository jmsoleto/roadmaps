/**
 * Reactive store for API Hub (Svelte 5 runes).
 *
 * Same shape as the other two: the whole document in `$state`, mutations
 * through methods that schedule a debounced save, persistence delegated to a
 * seam. It follows Decisions rather than Roadmaps on the two points where they
 * differ, and for Decisions' reasons:
 *
 *  - Loading has **three** outcomes. A store that will not open is not a store
 *    with nothing in it, and the app has to say so instead of showing an empty
 *    list over contracts it could not read.
 *  - While the store is unavailable, every mutation is **refused**. Writing
 *    over work we failed to read would be irreversible; there is no server.
 */

import { uid } from '../util/id';
import { moveInArray } from '../model/derive';
import { PALETTE_SLOTS } from '../theme/tokens';
import { createApiBackend, type ApiBackend } from './storage';
import { normalizeApiData } from './model/normalize';
import { emptyApiData, newContract, type ApiData, type Contract } from './model/types';

const SAVE_DEBOUNCE_MS = 250;

/** Why the app cannot be used right now, or `null` when it can. */
export type Unavailable = { reason: string } | null;

export class ApiContractsStore {
  private backend: ApiBackend;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  data = $state<ApiData>(emptyApiData());
  /**
   * Set when the store could not be opened.
   *
   * While this is set the app refuses to create or change anything.
   */
  unavailable = $state<Unavailable>(null);
  ready = $state<boolean>(false);
  justSaved = $state<boolean>(false);

  constructor(backend: ApiBackend = createApiBackend()) {
    this.backend = backend;
  }

  async init(): Promise<void> {
    const out = await this.backend.load();
    if (out.kind === 'unavailable') {
      this.unavailable = { reason: out.reason };
    } else {
      this.data =
        out.kind === 'loaded' ? (normalizeApiData(out.data) ?? emptyApiData()) : emptyApiData();
      this.unavailable = null;
    }
    this.ready = true;
  }

  // ---- reading ----

  get contracts(): Contract[] {
    return this.data.contracts;
  }

  /** The contract being edited, or `null` on the application's home. */
  get open(): Contract | null {
    return this.data.contracts.find((c) => c.id === this.data.openId) ?? null;
  }

  /** How many endpoints and models there are across every contract. */
  get totals(): { endpoints: number; models: number } {
    let endpoints = 0;
    let models = 0;
    for (const c of this.data.contracts) {
      endpoints += c.endpoints.length;
      models += c.models.length;
    }
    return { endpoints, models };
  }

  contract(id: string): Contract | null {
    return this.data.contracts.find((c) => c.id === id) ?? null;
  }

  // ---- contracts ----

  /**
   * Create a contract and open it.
   *
   * The title may repeat: it is a name to recognise one by in a list, not a
   * key. Refusing a duplicate would mean inventing a suffix at the worst
   * possible moment, which is while you are talking.
   */
  addContract(title = 'API sin nombre'): Contract | null {
    if (this.unavailable) return null;
    const contract: Contract = {
      id: uid('api'),
      // The slot is the contract's own from birth, so it keeps its colour when
      // the list is reordered or something above it is deleted (D11).
      ...newContract(title.trim() || 'API sin nombre', this.data.contracts.length % PALETTE_SLOTS),
    };
    this.data.contracts.push(contract);
    this.data.openId = contract.id;
    this.scheduleSave();
    return contract;
  }

  /**
   * Copy a contract whole, and open the copy.
   *
   * `$state.snapshot` first: a spread would copy the reactive proxy, and every
   * id inside the tree has to be reissued anyway or the two copies would share
   * identity and stop being independent (D6).
   */
  duplicateContract(id: string): Contract | null {
    if (this.unavailable) return null;
    const source = this.data.contracts.find((c) => c.id === id);
    if (!source) return null;

    const copy = structuredClone($state.snapshot(source) as Contract);
    copy.id = uid('api');
    copy.title = `${source.title} (copia)`;
    copy.colorSlot = this.data.contracts.length % PALETTE_SLOTS;
    reissueIds(copy);

    this.data.contracts.splice(this.data.contracts.indexOf(source) + 1, 0, copy);
    this.data.openId = copy.id;
    this.scheduleSave();
    return copy;
  }

  renameContract(id: string, title: string): void {
    this.patch(id, (c) => {
      c.title = title;
    });
  }

  /**
   * Delete a contract.
   *
   * The confirmation belongs to the screen, not here: the store is also driven
   * by tests and by the hub, and a `confirm()` in this file would make both
   * impossible. What the store guarantees is that nothing is left half-open.
   */
  deleteContract(id: string): void {
    if (this.unavailable) return;
    const i = this.data.contracts.findIndex((c) => c.id === id);
    if (i === -1) return;
    this.data.contracts.splice(i, 1);
    // Deleting the open one lands on the application's home rather than on a
    // contract nobody chose.
    if (this.data.openId === id) this.data.openId = null;
    this.scheduleSave();
  }

  /** Reorder the list. The order is the application's, shown everywhere. */
  moveContract(id: string, to: number): void {
    if (this.unavailable) return;
    const from = this.data.contracts.findIndex((c) => c.id === id);
    if (from === -1 || from === to) return;
    this.data.contracts = moveInArray(this.data.contracts, from, to);
    this.scheduleSave();
  }

  /** Open a contract, or return to the application's home with `null`. */
  setOpen(id: string | null): void {
    if (id !== null && !this.data.contracts.some((c) => c.id === id)) return;
    this.data.openId = id;
    this.scheduleSave();
  }

  // ---- the API's own data ----

  setTitle(id: string, value: string): void {
    this.patch(id, (c) => {
      c.title = value;
    });
  }

  setVersion(id: string, value: string): void {
    this.patch(id, (c) => {
      c.version = value;
    });
  }

  setDescription(id: string, value: string): void {
    this.patch(id, (c) => {
      c.description = value;
    });
  }

  setServer(id: string, value: string): void {
    this.patch(id, (c) => {
      c.server = value;
    });
  }

  private patch(id: string, fn: (c: Contract) => void): void {
    if (this.unavailable) return;
    const contract = this.data.contracts.find((c) => c.id === id);
    if (!contract) return;
    fn(contract);
    this.scheduleSave();
  }

  // ---- persistence ----

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  /** Persist immediately (e.g. on window close) so no pending change is lost. */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.unavailable) return;
    try {
      await this.backend.save($state.snapshot(this.data) as ApiData);
      this.justSaved = true;
      setTimeout(() => (this.justSaved = false), 1200);
    } catch (e) {
      // Worth showing, unlike Roadmaps' localStorage backend: it means the
      // store went away underneath us, and further edits would be lost
      // silently.
      this.unavailable = { reason: e instanceof Error ? e.message : String(e) };
    }
  }
}

/**
 * Reissue every id inside a copied contract.
 *
 * References travel by id — a field of type `ref` names a model, an array of a
 * model names it too — so remapping has to rewrite them or the copy would point
 * at the original's models and stop being independent.
 */
function reissueIds(contract: Contract): void {
  const models = new Map<string, string>();
  for (const model of contract.models) {
    const next = uid('mod');
    models.set(model.id, next);
    model.id = next;
  }

  const walk = (node: { id: string; ref: string; itemRef: string; children: unknown[] }): void => {
    node.id = uid('nod');
    node.ref = models.get(node.ref) ?? node.ref;
    node.itemRef = models.get(node.itemRef) ?? node.itemRef;
    for (const child of node.children) walk(child as typeof node);
  };

  for (const model of contract.models) walk(model.node);
  for (const endpoint of contract.endpoints) {
    const old = endpoint.id;
    endpoint.id = uid('ep');
    if (contract.view?.kind === 'endpoint' && contract.view.id === old) {
      contract.view = { kind: 'endpoint', id: endpoint.id };
    }
    for (const param of endpoint.params) param.id = uid('par');
    if (endpoint.body) walk(endpoint.body);
    for (const response of endpoint.responses) {
      response.id = uid('res');
      if (response.body) walk(response.body);
    }
  }

  if (contract.view?.kind === 'model') {
    const next = models.get(contract.view.id);
    contract.view = next ? { kind: 'model', id: next } : null;
  }
}

export const apiContracts = new ApiContractsStore();
