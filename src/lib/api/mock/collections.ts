/**
 * Which endpoints talk about the same thing, and what identifies one of them.
 *
 * The mock is generated **per collection and above the endpoints**; an endpoint
 * shows a slice, an element or a filter of that. Generating each body on its own
 * produces two different entities with the same fields, which is the most
 * visible incoherence a mock can have.
 *
 * Almost everything needed here is already written in the contracts that exist:
 * the path says which collection an endpoint belongs to, whether it addresses
 * one entity, and — in its marker — **what the identity field is called**.
 */

import { rolesOf } from './pagination';
import { coordinate, unit, unitAt } from './prng';
import type {
  ApiEndpoint,
  ApiModel,
  ApiNode,
  Contract,
  MockSettings,
  PagingOverride,
} from '../model/types';

export interface Segment {
  text: string;
  /** Whether it is a `{marker}` rather than a literal. */
  marker: boolean;
}

/** A path, split. Empty segments — a double slash, a trailing one — are dropped. */
export function segments(path: string): Segment[] {
  return path
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map((s) => ({
      text: s.replace(/^\{|\}$/g, ''),
      marker: s.startsWith('{') && s.endsWith('}'),
    }));
}

/**
 * The collection key: the **last literal segment** of the path (D6).
 *
 * `/clientes`, `/v1/clientes` and `/clientes/{id}` are one collection;
 * `/clientes/{id}/pedidos` is another. A path segment and not a model, because a
 * list can be an array of objects written inline, with no model at all — and
 * because it unifies a versioned prefix without being asked.
 */
export function collectionKey(path: string): string {
  const literals = segments(path).filter((s) => !s.marker);
  return literals.length === 0 ? '' : literals[literals.length - 1].text;
}

/** Whether this endpoint addresses one entity: its path ends in a marker. */
export function isDetailPath(path: string): boolean {
  const parts = segments(path);
  return parts.length > 0 && parts[parts.length - 1].marker;
}

/** The parent collection of a nested path, or `''` when it is not nested. */
export function parentKey(path: string): string {
  const parts = segments(path);
  if (isDetailPath(path)) return '';
  // `/clientes/{id}/pedidos` → the literal before the marker before the last.
  for (let i = parts.length - 1; i >= 1; i--) {
    if (!parts[i].marker && parts[i - 1].marker) {
      for (let j = i - 2; j >= 0; j--) if (!parts[j].marker) return parts[j].text;
    }
  }
  return '';
}

/** The marker that names a parent in a nested path, e.g. `id` in `/clientes/{id}/pedidos`. */
export function parentMarker(path: string): string {
  const parts = segments(path);
  for (let i = parts.length - 1; i >= 1; i--) {
    if (!parts[i].marker && parts[i - 1].marker) return parts[i - 1].text;
  }
  return '';
}

/** The marker of a detail path: what the contract calls this entity's identity. */
export function identityMarker(path: string): string {
  const parts = segments(path);
  return isDetailPath(path) ? parts[parts.length - 1].text : '';
}

export interface Collection {
  key: string;
  /** The model that is this collection's shape, when there is one (D5). */
  modelId: string;
  /** The shape itself, when it was written inline instead. */
  shape: ApiNode | null;
  /** The field holding the identity, by key. `''` when the shape has none. */
  identity: string;
  size: number;
  /**
   * The collection this one hangs from, and the field that says so.
   *
   * Both halves matter. Without the **key**, a nested endpoint could not filter;
   * without the **field**, the children it selected would carry a foreign key
   * pointing at somebody else, and the filter and the data would contradict each
   * other in the most visible place there is.
   */
  parent: { key: string; foreignKey: string } | null;
}

/** `clientes` → `cliente`. Crude on purpose: it only has to match a field name. */
export function singular(key: string): string {
  return key.endsWith('s') ? key.slice(0, -1) : key;
}

/** Names compare without case, accents or separators. */
function plain(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * The child's field that points at its parent.
 *
 * Read from the shape somebody already wrote: `clienteId`, `cliente_id`,
 * `idCliente`, or a field of type reference to the parent's model. A field, not
 * a declaration: this is the same «inferred and then corrected» as everything
 * else, and `RelationOverride.foreignKey` is where the correction lands.
 */
export function foreignKeyOf(
  children: readonly ApiNode[],
  parentCollectionKey: string,
  parentModelId: string,
): string {
  const one = plain(singular(parentCollectionKey));
  const wanted = [`${one}id`, `id${one}`, one];
  const byName = children.find(
    (c) => c.type !== 'object' && c.type !== 'array' && wanted.includes(plain(c.key)),
  );
  if (byName) return byName.key;
  if (parentModelId !== '') {
    const byRef = children.find((c) => c.type === 'ref' && c.ref === parentModelId);
    if (byRef) return byRef.key;
  }
  return '';
}

export interface MockPlan {
  collections: Map<string, Collection>;
  /** The collection an endpoint belongs to, by endpoint id. `''` means none. */
  byEndpoint: Map<string, string>;
}

/** The 200-ish response of an endpoint: the one a mock shows. */
export function successResponse(endpoint: ApiEndpoint) {
  return (
    endpoint.responses.find((r) => r.code.startsWith('2') && r.body !== null) ??
    endpoint.responses.find((r) => r.body !== null) ??
    null
  );
}

/** The node one element of a list is shaped like, given the items field. */
function itemShape(
  body: ApiNode | null,
  items: string,
): { modelId: string; shape: ApiNode | null } {
  if (body === null || items === '') return { modelId: '', shape: null };
  const node = nodeAtPath(body, items);
  if (node === null || node.type !== 'array') return { modelId: '', shape: null };
  if (node.itemType === 'ref') return { modelId: node.itemRef, shape: null };
  // An inline array of objects: the **element** is the shape, not the array. The
  // array node carries the element's fields as its own children, so the shape is
  // that node read as an object — walking the array itself would produce a list
  // of lists.
  if (node.itemType === 'object') return { modelId: '', shape: { ...node, type: 'object' } };
  return { modelId: '', shape: null };
}

/** The node a dotted path names inside a body, or `null`. */
export function nodeAtPath(body: ApiNode, path: string): ApiNode | null {
  let node: ApiNode | null = body;
  for (const step of path.split('.')) {
    if (node === null) return null;
    node = (node.children ?? []).find((c) => c.key === step) ?? null;
  }
  return node;
}

/** The fields of a shape, whether it is a model or an inline object. */
export function shapeChildrenOf(
  collection: Collection,
  models: readonly ApiModel[],
): readonly ApiNode[] {
  if (collection.modelId !== '') {
    return models.find((m) => m.id === collection.modelId)?.node.children ?? [];
  }
  return collection.shape?.children ?? [];
}

/**
 * What the collections of a contract are, and what identifies each.
 *
 * Every inference here can be denied: which collection an endpoint belongs to,
 * which field is the identity, and how many entities there are.
 */
export function planCollections(contract: Contract, settings: MockSettings): MockPlan {
  const byEndpoint = new Map<string, string>();
  const groups = new Map<string, ApiEndpoint[]>();

  for (const endpoint of contract.endpoints) {
    const denied = settings.collections[endpoint.id];
    const key = denied !== undefined ? denied : collectionKey(endpoint.path);
    byEndpoint.set(endpoint.id, key);
    if (key === '') continue;
    const group = groups.get(key) ?? [];
    group.push(endpoint);
    groups.set(key, group);
  }

  const collections = new Map<string, Collection>();
  for (const [key, endpoints] of groups) {
    let modelId = '';
    let shape: ApiNode | null = null;

    // A list endpoint's items say what an element is shaped like.
    for (const endpoint of endpoints) {
      if (isDetailPath(endpoint.path)) continue;
      const response = successResponse(endpoint);
      if (response === null) continue;
      const roles = rolesOf(response.body, settings.pagination[response.id]);
      const found = itemShape(response.body, roles.items);
      if (found.modelId !== '' || found.shape !== null) {
        modelId = found.modelId;
        shape = found.shape;
        break;
      }
    }

    // Failing that, a detail endpoint's body is one element.
    if (modelId === '' && shape === null) {
      for (const endpoint of endpoints) {
        if (!isDetailPath(endpoint.path)) continue;
        const body = successResponse(endpoint)?.body ?? null;
        if (body === null) continue;
        if (body.type === 'ref') modelId = body.ref;
        else shape = body;
        break;
      }
    }

    const draft: Collection = { key, modelId, shape, identity: '', size: 0, parent: null };
    draft.identity = identityOf(draft, endpoints, settings, contract.models);
    draft.size = settings.sizes[key] ?? settings.size;
    collections.set(key, draft);
  }

  // The parents come second: a link needs both collections to exist first.
  for (const [key, endpoints] of groups) {
    const collection = collections.get(key);
    if (collection === undefined) continue;

    let parentName = '';
    let denied: string | undefined;
    for (const endpoint of endpoints) {
      const override = settings.relations[endpoint.id];
      if (override !== undefined) {
        parentName = override.parent;
        denied = override.foreignKey;
        break;
      }
      const inferred = parentKey(endpoint.path);
      if (inferred !== '') parentName = inferred;
    }
    if (parentName === '' || !collections.has(parentName)) continue;

    const parentCollection = collections.get(parentName)!;
    const children = shapeChildrenOf(collection, contract.models);
    const foreignKey =
      denied !== undefined && denied !== ''
        ? denied
        : foreignKeyOf(children, parentName, parentCollection.modelId);
    collection.parent = { key: parentName, foreignKey };
  }

  return { collections, byEndpoint };
}

/**
 * Which field holds the identity.
 *
 * The **path names it**: `/clientes/{clienteId}` says `clienteId`, and that is a
 * gift — the contract already wrote it, so the hardest question of L3 is
 * answered by reading what is on screen. Failing that, a field called `id`.
 * Failing that, none, and the dataset carries identity without emitting it.
 */
function identityOf(
  collection: Collection,
  endpoints: readonly ApiEndpoint[],
  settings: MockSettings,
  models: readonly ApiModel[],
): string {
  const denied = settings.identities[collection.key];
  if (denied !== undefined) return denied;

  const children = shapeChildrenOf(collection, models);
  const has = (name: string) => children.some((c) => c.key === name);

  for (const endpoint of endpoints) {
    const marker = identityMarker(endpoint.path);
    if (marker !== '' && has(marker)) return marker;
  }
  if (has('id')) return 'id';
  // The marker even when the shape does not declare it: the contract said this
  // is how one is addressed, and saying so beats saying nothing.
  for (const endpoint of endpoints) {
    const marker = identityMarker(endpoint.path);
    if (marker !== '') return marker;
  }
  return '';
}

/**
 * The identity of the `index`-th entity of a collection.
 *
 * Derived from the collection and the index and **from nothing else** (D3). That
 * is what stops a foreign key from ever creating a circular dependency: a field
 * pointing at another entity needs only its identity, never one of its fields,
 * so two collections that reference each other resolve without an order.
 *
 * A number reads as a number — «el cliente 7» is how somebody says it out loud,
 * and it is what they type into the path parameter's example.
 */
export function identityValue(
  collection: Collection,
  index: number,
  node: ApiNode | null,
  seed: number,
): string | number {
  const ordinal = index + 1;
  if (node === null) return ordinal;
  if (node.type === 'integer' || node.type === 'number') return ordinal;
  if (node.format === 'uuid') {
    const coord = coordinate(collection.key, index, '#id');
    const hex = Array.from(
      { length: 31 },
      (_, i) => '0123456789abcdef'[Math.floor(unitAt(seed, coord, i) * 16)],
    ).join('');
    const variant = '89ab'[Math.floor(unit(seed, `${coord}~v`) * 4)];
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-${variant}${hex.slice(15, 18)}-${hex.slice(18, 30)}`;
  }
  // A readable string identity: three letters of the collection and the ordinal.
  const prefix = collection.key.slice(0, 3).toUpperCase() || 'ENT';
  return `${prefix}-${String(ordinal).padStart(4, '0')}`;
}

/** Which entity an identity names, or `-1`. The inverse of `identityValue`. */
export function indexOfIdentity(
  collection: Collection,
  written: string,
  node: ApiNode | null,
  seed: number,
): number {
  const text = written.trim();
  if (text === '') return -1;
  const asNumber = Number(text);
  if (Number.isFinite(asNumber) && Number.isInteger(asNumber)) {
    const index = asNumber - 1;
    return index >= 0 && index < collection.size ? index : -1;
  }
  for (let i = 0; i < collection.size; i++) {
    if (String(identityValue(collection, i, node, seed)) === text) return i;
  }
  return -1;
}

/** The identity field's node, for knowing what kind of value it wants. */
export function identityNode(collection: Collection, models: readonly ApiModel[]): ApiNode | null {
  if (collection.identity === '') return null;
  return shapeChildrenOf(collection, models).find((c) => c.key === collection.identity) ?? null;
}

/** Whether a model is the shape of some collection — the rule of D5. */
export function collectionOfModel(plan: MockPlan, modelId: string): Collection | null {
  for (const collection of plan.collections.values()) {
    if (collection.modelId !== '' && collection.modelId === modelId) return collection;
  }
  return null;
}

export type { PagingOverride };
