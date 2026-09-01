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
import {
  emptyApiData,
  newContract,
  type ApiData,
  type ApiEndpoint,
  type ApiNode,
  type ApiResponse,
  type Contract,
  type ContractView,
  type HttpMethod,
  type ItemType,
  type NodeType,
} from './model/types';
import {
  METHODS_WITH_BODY,
  newEndpoint,
  newNode,
  newParam,
  newResponse,
  rootNode,
} from './model/factories';
import { applyItemType, applyType } from './model/coerce';
import {
  cloneWithNewIds,
  copyKey,
  find,
  isContainer,
  moveAmongSiblings,
  uniqueKey,
  walk,
} from './model/tree';
import { readPaste } from './infer';

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

  // ---- the field tree and everything hanging off it ----

  /**
   * Every body in the open contract, for the operations that take a node id
   * without knowing which body it lives in.
   *
   * Searching all of them beats threading a body id through every call site:
   * a node id is unique across the document, and a contract has a handful of
   * bodies, not thousands.
   */
  private bodies(): ApiNode[] {
    const contract = this.open;
    if (!contract) return [];
    const out: ApiNode[] = [];
    for (const endpoint of contract.endpoints) {
      if (endpoint.body) out.push(endpoint.body);
      for (const response of endpoint.responses) if (response.body) out.push(response.body);
    }
    for (const model of contract.models) out.push(model.node);
    return out;
  }

  /** Locate a node by id anywhere in the open contract. */
  private locate(nodeId: string): { node: ApiNode; parent: ApiNode | null } | null {
    for (const body of this.bodies()) {
      const hit = find(body, nodeId);
      if (hit) return hit;
    }
    return null;
  }

  /**
   * Read one node, for a component that holds an id rather than the object.
   *
   * Public because the tree renders from the reactive document directly — the
   * scalar fields are bound to it (D1) — and a component that just navigated
   * needs a way back to the node.
   */
  node(nodeId: string): ApiNode | null {
    return this.locate(nodeId)?.node ?? null;
  }

  /**
   * Schedule the save, and nothing else (D1).
   *
   * The counterpart to the scalar fields being edited by direct binding: the
   * component mutates the reactive document and says so with this.
   *
   * Forgetting it is a latency bug and not a data-loss one, which is why the
   * trade is worth making: `flush` writes the **whole document**, not a delta,
   * so an unscheduled edit still reaches the store on the next save from any
   * other cause, and on the flush the shell runs before the page unloads.
   */
  touch(): void {
    if (this.unavailable) return;
    this.scheduleSave();
  }

  addChild(parentId: string): ApiNode | null {
    return this.structural(() => {
      const parent = this.locate(parentId)?.node;
      if (!parent || !isContainer(parent)) return null;
      const child = newNode(uniqueKey(parent.children), 'string');
      parent.children.push(child);
      parent.open = true;
      return child;
    });
  }

  deleteNode(nodeId: string): void {
    this.structural(() => {
      const hit = this.locate(nodeId);
      // A root has no parent: it is the body itself, removed by dropping the
      // body rather than by deleting a field.
      if (!hit?.parent) return null;
      const i = hit.parent.children.indexOf(hit.node);
      if (i !== -1) hit.parent.children.splice(i, 1);
      return null;
    });
  }

  /**
   * Copy a field with everything under it, as the sibling right below it.
   *
   * `$state.snapshot` first: a spread would copy the reactive proxy and the two
   * fields would share identity (D6).
   */
  duplicateNode(nodeId: string): ApiNode | null {
    return this.structural(() => {
      const hit = this.locate(nodeId);
      if (!hit?.parent) return null;
      const copy = cloneWithNewIds($state.snapshot(hit.node) as ApiNode);
      copy.key = copyKey(hit.parent.children, hit.node.key);
      hit.parent.children.splice(hit.parent.children.indexOf(hit.node) + 1, 0, copy);
      return copy;
    });
  }

  /** Move a field one place up or down inside its own object. */
  moveNode(nodeId: string, delta: -1 | 1): void {
    this.structural(() => {
      const hit = this.locate(nodeId);
      if (!hit?.parent) return null;
      moveAmongSiblings(hit.parent.children, hit.parent.children.indexOf(hit.node), delta);
      return null;
    });
  }

  setNodeType(nodeId: string, type: NodeType): void {
    this.structural(() => {
      const node = this.locate(nodeId)?.node;
      if (node) applyType(node, type);
      return null;
    });
  }

  setNodeItemType(nodeId: string, itemType: ItemType): void {
    this.structural(() => {
      const node = this.locate(nodeId)?.node;
      if (node) applyItemType(node, itemType);
      return null;
    });
  }

  toggleOpen(nodeId: string): void {
    this.structural(() => {
      const node = this.locate(nodeId)?.node;
      if (node) node.open = !node.open;
      return null;
    });
  }

  /**
   * Build a node's contents from a pasted document (R6, D6).
   *
   * Returns the error instead of throwing it: the dialog shows it, and a paste
   * that fails must leave the tree exactly as it was. That guarantee comes from
   * `readPaste` building the whole shape before this assigns anything.
   */
  pasteInto(nodeId: string, text: string): string | null {
    if (this.unavailable) return 'Los contratos no están disponibles.';
    const node = this.locate(nodeId)?.node;
    if (!node) return 'Ese campo ya no existe.';

    const { shape, error } = readPaste(text);
    if (!shape) return error;

    node.type = shape.type;
    node.itemType = shape.itemType;
    node.children = shape.children;
    node.ref = '';
    node.itemRef = '';
    node.example = '';
    node.open = true;
    this.scheduleSave();
    return null;
  }

  // ---- endpoints ----

  addEndpoint(): ApiEndpoint | null {
    return this.structural((contract) => {
      const endpoint = newEndpoint();
      contract.endpoints.push(endpoint);
      contract.view = { kind: 'endpoint', id: endpoint.id };
      return endpoint;
    });
  }

  duplicateEndpoint(endpointId: string): ApiEndpoint | null {
    return this.structural((contract) => {
      const source = contract.endpoints.find((e) => e.id === endpointId);
      if (!source) return null;

      const copy = structuredClone($state.snapshot(source) as ApiEndpoint);
      copy.id = uid('ep');
      copy.path = `${copy.path}-copia`;
      for (const param of copy.params) param.id = uid('par');
      if (copy.body) reissueNodeIds(copy.body);
      for (const response of copy.responses) {
        response.id = uid('res');
        if (response.body) reissueNodeIds(response.body);
      }

      contract.endpoints.splice(contract.endpoints.indexOf(source) + 1, 0, copy);
      contract.view = { kind: 'endpoint', id: copy.id };
      return copy;
    });
  }

  deleteEndpoint(endpointId: string): void {
    this.structural((contract) => {
      const i = contract.endpoints.findIndex((e) => e.id === endpointId);
      if (i === -1) return null;
      contract.endpoints.splice(i, 1);
      // Leaving the view pointing at what was just deleted would show a blank
      // editor over a list that still has entries.
      if (contract.view?.kind === 'endpoint' && contract.view.id === endpointId) {
        contract.view = null;
      }
      return null;
    });
  }

  /**
   * Change an endpoint's method.
   *
   * A method that normally carries a request body gets one, so that choosing
   * `POST` is one gesture instead of two. It is never taken away again: going
   * back to `GET` after describing a body would throw the description away.
   */
  setMethod(endpointId: string, method: HttpMethod): void {
    this.structural((contract) => {
      const endpoint = contract.endpoints.find((e) => e.id === endpointId);
      if (!endpoint) return null;
      endpoint.method = method;
      if (endpoint.body === null && METHODS_WITH_BODY.includes(method)) {
        endpoint.body = rootNode();
      }
      return null;
    });
  }

  setRequestBody(endpointId: string, present: boolean): void {
    this.structural((contract) => {
      const endpoint = contract.endpoints.find((e) => e.id === endpointId);
      if (!endpoint) return null;
      endpoint.body = present ? (endpoint.body ?? rootNode()) : null;
      return null;
    });
  }

  // ---- parameters ----

  addParam(endpointId: string): void {
    this.structural((contract) => {
      contract.endpoints.find((e) => e.id === endpointId)?.params.push(newParam());
      return null;
    });
  }

  deleteParam(endpointId: string, paramId: string): void {
    this.structural((contract) => {
      const endpoint = contract.endpoints.find((e) => e.id === endpointId);
      if (!endpoint) return null;
      endpoint.params = endpoint.params.filter((p) => p.id !== paramId);
      return null;
    });
  }

  // ---- responses ----

  addResponse(endpointId: string): ApiResponse | null {
    return this.structural((contract) => {
      const endpoint = contract.endpoints.find((e) => e.id === endpointId);
      if (!endpoint) return null;
      // The first extra response is almost always the error case, which is what
      // a refinement actually argues about.
      const response = newResponse(
        endpoint.responses.some((r) => r.code === '400') ? '500' : '400',
      );
      endpoint.responses.push(response);
      return response;
    });
  }

  deleteResponse(endpointId: string, responseId: string): void {
    this.structural((contract) => {
      const endpoint = contract.endpoints.find((e) => e.id === endpointId);
      if (!endpoint) return null;
      endpoint.responses = endpoint.responses.filter((r) => r.id !== responseId);
      return null;
    });
  }

  setResponseBody(endpointId: string, responseId: string, present: boolean): void {
    this.structural((contract) => {
      const response = contract.endpoints
        .find((e) => e.id === endpointId)
        ?.responses.find((r) => r.id === responseId);
      if (!response) return null;
      response.body = present ? (response.body ?? rootNode()) : null;
      return null;
    });
  }

  // ---- what is being edited inside the contract ----

  setView(view: ContractView): void {
    this.structural((contract) => {
      contract.view = view;
      return null;
    });
  }

  /** The endpoint being edited, or `null` on the contract's own overview. */
  get openEndpoint(): ApiEndpoint | null {
    const contract = this.open;
    if (contract?.view?.kind !== 'endpoint') return null;
    return contract.endpoints.find((e) => e.id === contract.view!.id) ?? null;
  }

  /**
   * Run a structural change against the open contract.
   *
   * One place for the two rules every one of them shares: refuse while the
   * store is unavailable, and schedule the save afterwards. Without it, both
   * would be repeated twenty times and forgotten once.
   */
  private structural<T>(fn: (contract: Contract) => T | null): T | null {
    if (this.unavailable) return null;
    const contract = this.open;
    if (!contract) return null;
    const out = fn(contract);
    this.scheduleSave();
    return out;
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

/** Reissue every id in a copied body, so the copy is nobody else's tree. */
function reissueNodeIds(node: ApiNode): void {
  walk(node, (n) => {
    n.id = uid('nod');
  });
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
