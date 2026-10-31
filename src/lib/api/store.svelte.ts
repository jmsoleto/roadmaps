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
import { createApiBackend, type ApiBackend, type Unavailability } from './storage';
import { normalizeApiData } from './model/normalize';
import {
  emptyApiData,
  newContract,
  type ApiData,
  type ApiEndpoint,
  type ApiNode,
  type ApiParam,
  type ApiResponse,
  type Contract,
  type ApiModel,
  type ContractView,
  type HttpMethod,
  type ItemType,
  type MockSettings,
  type NodeType,
  type PagingOverride,
  type RelationOverride,
} from './model/types';
import {
  METHODS_WITH_BODY,
  newEndpoint,
  newMockSettings,
  newNode,
  newParam,
  newResponse,
  rootNode,
} from './model/factories';
import { newSeed } from './mock/prng';

/**
 * What an unconfigured contract's mock reads as.
 *
 * Frozen and shared, because it is only ever read: the moment somebody changes
 * something, `setMock` makes the contract one of its own with a real seed.
 */
const DEFAULT_MOCK: MockSettings = Object.freeze(newMockSettings(1));
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
import { reissueIds, reissueNodeIds } from './model/identity';
import { parseContractImport } from './io';
import {
  extractedName,
  uniqueModelName,
  usesOf as usesOfModel,
  contractBodies,
} from './model/models';

import { createPrefs, type DataSource, type Prefs } from '../store/storage';
import {
  PREF_COLLAPSED,
  PREF_OPEN,
  PREF_VIEWS,
  followView,
  liftApiView,
  parseIds,
  parseOpen,
  parseViews,
  serializeIds,
  type LegacyApiView,
  type Views,
} from './view-state';

const SAVE_DEBOUNCE_MS = 250;

/** Why the app cannot be used right now, or `null` when it can. */
export type Unavailable = { reason: string; why?: Unavailability } | null;

export class ApiContractsStore {
  private backend: ApiBackend;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  data = $state<ApiData>(emptyApiData());
  /**
   * Which contract is open, or `null` on the application's home.
   *
   * This, `views` and `collapsed` are how one person looks at the contracts,
   * kept as preferences and never in the documents (carpeta-api-hub, D4).
   */
  openId = $state<string | null>(null);
  /** What each contract shows, by contract id. A contract with no entry opens on its overview. */
  views = $state<Views>({});
  /** Ids of the folded nodes. Nodes are born open, so a new one writes nothing. */
  collapsed = $state<string[]>([]);
  private prefs: Prefs;
  /**
   * Set when the store could not be opened.
   *
   * While this is set the app refuses to create or change anything.
   */
  unavailable = $state<Unavailable>(null);
  ready = $state<boolean>(false);

  /** Why the last save to a folder failed, or `null`. A failed save in the browser still makes the store unavailable. */
  saveError = $state<string | null>(null);

  /** Where the document lives right now. */
  get source(): DataSource {
    return this.backend.source ?? 'browser';
  }

  /** True while a change is waiting for the debounce or a write is still running. */
  get pending(): boolean {
    return this.saveTimer !== null || !!this.backend.pending;
  }

  /** Resolve once nothing is being written. */
  settled(): Promise<void> {
    return this.backend.settled?.() ?? Promise.resolve();
  }

  /**
   * Point the store at another backend: the folder on connecting, the browser
   * on disconnecting. The caller runs `init()` afterwards, having flushed first.
   */
  useBackend(backend: ApiBackend): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.backend = backend;
  }
  justSaved = $state<boolean>(false);

  constructor(backend: ApiBackend = createApiBackend(), prefs: Prefs = createPrefs()) {
    this.backend = backend;
    this.prefs = prefs;
  }

  async init(): Promise<void> {
    this.ready = false;
    this.saveError = null;
    const out = await this.backend.load();
    let legacy: LegacyApiView = { openId: undefined, views: undefined, collapsed: undefined };
    if (out.kind === 'unavailable') {
      this.unavailable = { reason: out.reason, why: out.why };
      // Nothing of what another backend held may stay on screen as if it were this one's.
      this.data = emptyApiData();
    } else {
      // Before normalizing: the normaliser rebuilds each contract and would
      // drop the view without anyone keeping it.
      if (out.kind === 'loaded')
        legacy = liftApiView(out.data as Parameters<typeof liftApiView>[0]);
      this.data =
        out.kind === 'loaded' ? (normalizeApiData(out.data) ?? emptyApiData()) : emptyApiData();
      this.unavailable = null;
    }
    await this.hydrateView(legacy);
    this.ready = true;
  }

  /**
   * Read the view state from preferences, falling back on what older documents
   * carried. A preference that exists wins; when only the document said
   * something, it is written to the preference here, because the next save of
   * the document no longer carries it.
   */
  private async hydrateView(legacy: LegacyApiView): Promise<void> {
    const open = parseOpen(await this.prefs.getPref(PREF_OPEN));
    const views = parseViews(await this.prefs.getPref(PREF_VIEWS));
    const collapsed = parseIds(await this.prefs.getPref(PREF_COLLAPSED));

    this.openId = open !== undefined ? open : (legacy.openId ?? null);
    if (open === undefined && legacy.openId !== undefined) {
      void this.prefs.setPref(PREF_OPEN, this.openId ?? '');
    }
    // An open id naming a contract that is no longer there would leave the app
    // showing nothing over a list that has entries.
    if (this.openId !== null && !this.data.contracts.some((c) => c.id === this.openId)) {
      this.openId = null;
    }
    this.views = views ?? legacy.views ?? {};
    if (views === undefined && legacy.views !== undefined) {
      void this.prefs.setPref(PREF_VIEWS, JSON.stringify(this.views));
    }
    this.collapsed = collapsed ?? legacy.collapsed ?? [];
    if (collapsed === undefined && legacy.collapsed !== undefined) {
      void this.prefs.setPref(PREF_COLLAPSED, serializeIds(this.collapsed));
    }
  }

  // ---- how this person is looking at them ----

  private setOpenId(id: string | null): void {
    this.openId = id;
    void this.prefs.setPref(PREF_OPEN, id ?? '');
  }

  /**
   * What a contract shows, or `null` for its overview.
   *
   * Checked against the contract on every read: a view naming something that
   * has been deleted, here or by someone else in a shared folder, would open a
   * blank editor over a list that still has entries.
   */
  viewOf(contract: Contract): ContractView {
    const view = this.views[contract.id];
    if (!view) return null;
    const pool = view.kind === 'endpoint' ? contract.endpoints : contract.models;
    return pool.some((x) => x.id === view.id) ? view : null;
  }

  private setViewOf(contractId: string, view: ContractView): void {
    const next = { ...this.views };
    if (view) next[contractId] = view;
    else delete next[contractId];
    this.views = next;
    void this.prefs.setPref(PREF_VIEWS, JSON.stringify(next));
  }

  isCollapsed(nodeId: string): boolean {
    return this.collapsed.includes(nodeId);
  }

  private setCollapsed(nodeId: string, folded: boolean): void {
    if (folded === this.isCollapsed(nodeId)) return;
    this.collapsed = folded
      ? [...this.collapsed, nodeId]
      : this.collapsed.filter((id) => id !== nodeId);
    void this.prefs.setPref(PREF_COLLAPSED, serializeIds(this.collapsed));
  }

  // ---- reading ----

  get contracts(): Contract[] {
    return this.data.contracts;
  }

  /** The contract being edited, or `null` on the application's home. */
  get open(): Contract | null {
    return this.data.contracts.find((c) => c.id === this.openId) ?? null;
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

  // ---- the mock's settings ----

  /**
   * The open contract's mock settings, **without creating them**.
   *
   * Reading must not write. A getter that filled in a seed on first look would
   * give every contract in the document a mock the moment somebody opened the
   * panel, and would force a save doing it — which is exactly the promise this
   * feature makes not to break. So an unconfigured contract reads as the
   * defaults and stays unconfigured on disk until somebody changes something.
   */
  get mock(): MockSettings {
    return this.open?.mock ?? DEFAULT_MOCK;
  }

  /** Whether this contract has settings of its own, or is reading the defaults. */
  get hasMock(): boolean {
    return this.open?.mock !== undefined;
  }

  /**
   * Change the mock's settings, creating them on the first change.
   *
   * The seed is issued here and not in the factory's defaults, because it is the
   * one value that is genuinely random and must not differ between two reads of
   * the same unconfigured contract.
   */
  setMock(patch: Partial<MockSettings>): void {
    const contract = this.open;
    if (contract === null) return;
    contract.mock = { ...(contract.mock ?? newMockSettings(newSeed())), ...patch };
    this.touch();
  }

  /** Another mock: the one gesture where unpredictability is the point. */
  reseed(): void {
    this.setMock({ seed: newSeed() });
  }

  /**
   * Deny what was inferred about a response's envelope.
   *
   * Stored whole, and only once somebody has touched it: a contract nobody has
   * corrected keeps nothing at all, which is what lets an old one work without
   * being opened.
   */
  denyPaging(responseId: string, roles: PagingOverride): void {
    this.setMock({ pagination: { ...this.mock.pagination, [responseId]: { ...roles } } });
  }

  /** Take back a denial, and let the inference speak again. */
  undenyPaging(responseId: string): void {
    const rest = { ...this.mock.pagination };
    delete rest[responseId];
    this.setMock({ pagination: rest });
  }

  /** Deny what was inferred about an endpoint's parent. */
  denyRelation(endpointId: string, relation: RelationOverride): void {
    this.setMock({ relations: { ...this.mock.relations, [endpointId]: { ...relation } } });
  }

  undenyRelation(endpointId: string): void {
    const rest = { ...this.mock.relations };
    delete rest[endpointId];
    this.setMock({ relations: rest });
  }

  /** Deny the size of one collection, or take the denial back with `null`. */
  denySize(key: string, size: number | null): void {
    const rest = { ...this.mock.sizes };
    if (size === null) delete rest[key];
    else rest[key] = Math.max(0, Math.trunc(size));
    this.setMock({ sizes: rest });
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
    this.setOpenId(contract.id);
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
    // The copy opens on the copy of what the original was showing.
    this.setViewOf(copy.id, followView(source, copy, this.viewOf(source)));
    this.setOpenId(copy.id);
    this.scheduleSave();
    return copy;
  }

  /**
   * Bring in a contract from a file.
   *
   * Adds, never replaces: overwriting what is here would be irreversible and
   * there is no server to recover from. Throws what the parser threw, so the
   * topbar shows the reason — including which application a foreign document
   * really belongs to.
   *
   * The imported contract is opened, as Roadmaps does with an imported roadmap:
   * you asked for it, so looking at it is what comes next.
   */
  importContract(text: string): Contract | null {
    if (this.unavailable) return null;
    const contract = parseContractImport(text, this.data.contracts.length % PALETTE_SLOTS);
    this.data.contracts.push(contract);
    this.setOpenId(contract.id);
    this.scheduleSave();
    return contract;
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
    if (this.openId === id) this.setOpenId(null);
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
    this.setOpenId(id);
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
    return contractBodies(contract).map((b) => b.root);
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
      this.setCollapsed(parent.id, false);
      return child;
    });
  }

  /**
   * The field right after this one, with its shape and nothing else (D1).
   *
   * The third verb of creating a field: the contents of `addChild` — a new,
   * empty field — in the position of `duplicateNode`, immediately below. It is
   * not a flag on either of them because the pair of them would then have two
   * behaviours and a signature that does not say which is which.
   *
   * The shape travels and the contents do not. `applyType` is what settles it
   * rather than a list of assignments here: it already knows that a container
   * is born with a first child, and by building the node from scratch instead
   * of copying the origin, the comment, the example, the format, the
   * enumeration and the model a reference points at are all left behind — which
   * is exactly right, because those are true of *that* field, not of its shape.
   *
   * `null` for the root of a body: it is not a field of anything, so it has no
   * siblings to be inserted among. Unreachable from the screen — the root has
   * no key box to press Enter in — but the store is driven straight from tests.
   */
  addSiblingAfter(nodeId: string): ApiNode | null {
    return this.structural(() => {
      const hit = this.locate(nodeId);
      if (!hit?.parent) return null;
      const sibling = newNode(uniqueKey(hit.parent.children), hit.node.type);
      // Before `applyType`, because what an array holds is the second half of
      // the same type declaration and the rules read it.
      if (hit.node.type === 'array') sibling.itemType = hit.node.itemType;
      applyType(sibling, hit.node.type);
      hit.parent.children.splice(hit.parent.children.indexOf(hit.node) + 1, 0, sibling);
      return sibling;
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
      if (node && applyType(node, type)) this.setCollapsed(node.id, false);
      return null;
    });
  }

  setNodeItemType(nodeId: string, itemType: ItemType): void {
    this.structural(() => {
      const node = this.locate(nodeId)?.node;
      if (node && applyItemType(node, itemType)) this.setCollapsed(node.id, false);
      return null;
    });
  }

  /** Fold or unfold a node. A preference: the contract does not change, nothing is saved. */
  toggleOpen(nodeId: string): void {
    if (this.locate(nodeId)) this.setCollapsed(nodeId, !this.isCollapsed(nodeId));
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
    this.setCollapsed(node.id, false);
    this.scheduleSave();
    return null;
  }

  // ---- endpoints ----

  addEndpoint(): ApiEndpoint | null {
    return this.structural((contract) => {
      const endpoint = newEndpoint();
      contract.endpoints.push(endpoint);
      this.setViewOf(contract.id, { kind: 'endpoint', id: endpoint.id });
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
      this.setViewOf(contract.id, { kind: 'endpoint', id: copy.id });
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
      const view = this.views[contract.id];
      if (view?.kind === 'endpoint' && view.id === endpointId) this.setViewOf(contract.id, null);
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

  /**
   * The parameter right after this one, with its shape and nothing else.
   *
   * The counterpart of `addSiblingAfter` for a list that is flat. There is no
   * `applyType` here because there is nothing to settle: a parameter is five
   * scalars, so the shape is copied by hand and it is two fields.
   *
   * Where it travels is part of that shape, alongside the type. Declaring three
   * headers in a row is the case that hurts, and `in` is as much what a
   * parameter *is* as its type — what stays behind is `required`, the example
   * and the comment.
   */
  addParamAfter(endpointId: string, paramId: string): ApiParam | null {
    return this.structural((contract) => {
      const endpoint = contract.endpoints.find((e) => e.id === endpointId);
      if (!endpoint) return null;
      const i = endpoint.params.findIndex((p) => p.id === paramId);
      if (i === -1) return null;
      const next = newParam();
      next.in = endpoint.params[i].in;
      next.type = endpoint.params[i].type;
      endpoint.params.splice(i + 1, 0, next);
      return next;
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

  // ---- models ----

  /** The model being edited, or `null` when it is an endpoint or nothing. */
  get openModel(): ApiModel | null {
    const contract = this.open;
    const view = contract ? this.viewOf(contract) : null;
    if (!contract || view?.kind !== 'model') return null;
    return contract.models.find((m) => m.id === view.id) ?? null;
  }

  /** Where a model is used, named. Computed on read, never stored (D8). */
  usesOf(modelId: string): string[] {
    const contract = this.open;
    return contract ? usesOfModel(contract, modelId) : [];
  }

  addModel(name = 'Modelo'): ApiModel | null {
    return this.structural((contract) => {
      const node = rootNode();
      node.children = [newNode('campo', 'string')];
      const model: ApiModel = {
        id: uid('mod'),
        name: uniqueModelName(contract.models, name),
        description: '',
        node,
      };
      contract.models.push(model);
      this.setViewOf(contract.id, { kind: 'model', id: model.id });
      return model;
    });
  }

  renameModel(modelId: string, name: string): void {
    this.structural((contract) => {
      const model = contract.models.find((m) => m.id === modelId);
      if (model) model.name = name;
      return null;
    });
  }

  setModelDescription(modelId: string, description: string): void {
    this.structural((contract) => {
      const model = contract.models.find((m) => m.id === modelId);
      if (model) model.description = description;
      return null;
    });
  }

  duplicateModel(modelId: string): ApiModel | null {
    return this.structural((contract) => {
      const source = contract.models.find((m) => m.id === modelId);
      if (!source) return null;
      const copy = structuredClone($state.snapshot(source) as ApiModel);
      copy.id = uid('mod');
      copy.name = uniqueModelName(contract.models, `${source.name} copia`);
      reissueNodeIds(copy.node);
      contract.models.splice(contract.models.indexOf(source) + 1, 0, copy);
      this.setViewOf(contract.id, { kind: 'model', id: copy.id });
      return copy;
    });
  }

  /**
   * Delete a model.
   *
   * The fields pointing at it are **left as they are**. Repointing them
   * somewhere would be inventing a decision, and blanking them would silently
   * throw away the comment and the obligation somebody wrote. A dangling
   * reference is a reachable state that the validator names and the exporter
   * survives; the warning before this runs is what makes it a choice.
   */
  deleteModel(modelId: string): void {
    this.structural((contract) => {
      const i = contract.models.findIndex((m) => m.id === modelId);
      if (i === -1) return null;
      contract.models.splice(i, 1);
      const view = this.views[contract.id];
      if (view?.kind === 'model' && view.id === modelId) this.setViewOf(contract.id, null);
      return null;
    });
  }

  /**
   * Turn a written block into a named model, leaving a reference behind (D2).
   *
   * The guarantee is that **the generated example does not change**: the
   * children move across untouched, the field keeps its key, its comment and
   * its obligation — those belong to the field, not to the block — and the
   * example generator resolves the reference back to the same object. That is
   * what makes this safe to do live, in front of somebody.
   */
  extractToModel(nodeId: string): ApiModel | null {
    return this.structural((contract) => {
      const node = this.locate(nodeId)?.node;
      if (!node) return null;

      const asArray = node.type === 'array';
      if (!isContainer(node)) return null;

      const modelNode = rootNode();
      modelNode.children = structuredClone($state.snapshot(node.children) as ApiNode[]);
      const model: ApiModel = {
        id: uid('mod'),
        name: uniqueModelName(contract.models, extractedName(node.key, asArray)),
        description: '',
        node: modelNode,
      };
      contract.models.push(model);

      if (asArray) {
        node.itemType = 'ref';
        node.itemRef = model.id;
      } else {
        node.type = 'ref';
        node.ref = model.id;
      }
      // A reference has no children of its own; its shape is the model's.
      node.children = [];
      node.example = '';
      return model;
    });
  }

  /**
   * Undo a reference in place (D3).
   *
   * Copies, never moves: the model stays where it was and the other fields
   * pointing at it keep pointing at it. The copied children get new ids, or the
   * expanded field and the model would share nodes and editing one would edit
   * the other.
   */
  expandRef(nodeId: string): void {
    this.structural((contract) => {
      const node = this.locate(nodeId)?.node;
      if (!node) return null;
      const asArray = node.type === 'array' && node.itemType === 'ref';
      if (node.type !== 'ref' && !asArray) return null;

      const model = contract.models.find((m) => m.id === (asArray ? node.itemRef : node.ref));
      if (!model?.node) return null;

      node.children = (
        structuredClone($state.snapshot(model.node.children) as ApiNode[]) ?? []
      ).map((child) => {
        walk(child, (n) => {
          n.id = uid('nod');
        });
        return child;
      });
      if (asArray) {
        node.itemType = 'object';
        node.itemRef = '';
      } else {
        node.type = 'object';
        node.ref = '';
      }
      this.setCollapsed(node.id, false);
      return null;
    });
  }

  /**
   * Take in the models the library worked out for this contract.
   *
   * The merge itself is the library's — pure, in `bring.ts` — and committing it
   * is this store's, because the library is not the one that edits a contract.
   * Opens what was brought, which is what somebody asking for it wants to see.
   */
  addBroughtModels(models: readonly ApiModel[], broughtId: string): void {
    this.structural((contract) => {
      contract.models.push(...(models as ApiModel[]));
      if (models.some((m) => m.id === broughtId)) {
        this.setViewOf(contract.id, { kind: 'model', id: broughtId });
      }
      return null;
    });
  }

  /** Point a field at a model. */
  setNodeRef(nodeId: string, modelId: string): void {
    this.structural(() => {
      const node = this.locate(nodeId)?.node;
      if (node) node.ref = modelId;
      return null;
    });
  }

  /** Point an array's elements at a model. */
  setNodeItemRef(nodeId: string, modelId: string): void {
    this.structural(() => {
      const node = this.locate(nodeId)?.node;
      if (node) node.itemRef = modelId;
      return null;
    });
  }

  // ---- what is being edited inside the contract ----

  /** What the open contract shows. A preference: nothing is saved. */
  setView(view: ContractView): void {
    const contract = this.open;
    if (contract) this.setViewOf(contract.id, view);
  }

  /** The endpoint being edited, or `null` on the contract's own overview. */
  get openEndpoint(): ApiEndpoint | null {
    const contract = this.open;
    const view = contract ? this.viewOf(contract) : null;
    if (!contract || view?.kind !== 'endpoint') return null;
    return contract.endpoints.find((e) => e.id === view.id) ?? null;
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
      // The indicator waits for the folder to have nothing pending, not just
      // for this write to start (`local-persistence`, «Autosave»).
      await this.settled();
      this.saveError = null;
      this.justSaved = true;
      setTimeout(() => (this.justSaved = false), 1200);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      // In a folder a failed write can be passing, and the backend retries what it
      // could not write on the next save: say so without locking the document. In
      // the browser it means the store went away underneath us, as it always did.
      if (this.source === 'folder') this.saveError = reason;
      else this.unavailable = { reason };
    }
  }
}

export const apiContracts = new ApiContractsStore();
