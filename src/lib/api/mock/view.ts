/**
 * What one endpoint shows: a slice, an element, or a filter of the dataset.
 *
 * An endpoint does not generate a body; it **looks at** the collection. That is
 * the whole of L3 and L4: the detail says what the list said because it is the
 * same entity, not because anything compares them afterwards.
 *
 * What is honoured and what is not is deliberate and asymmetric (D9): the path
 * declares its meaning —`/clientes/{id}` says «one», `/clientes/{id}/pedidos`
 * says «this one's»— and the pagination roles are confirmed on screen. Nobody
 * declares that a query parameter called `estado` filters by the field `estado`,
 * and guessing that is the kind of guess that is wrong without saying so.
 */

import {
  collectionKey,
  identityNode,
  indexOfIdentity,
  isDetailPath,
  nodeAtPath,
  parentKey,
  parentMarker,
  planCollections,
  singular,
  successResponse,
  type Collection,
  type MockPlan,
} from './collections';
import {
  bodyAt,
  bodyScope,
  entityAt,
  parentIndexOf,
  type EntityContext,
  type MockHooks,
} from './dataset';
import { isPaginated, pageCount, pageSlice, rolesOf } from './pagination';
import type { JsonValue } from '../example';
import type {
  ApiEndpoint,
  ApiModel,
  ApiResponse,
  Contract,
  MockSettings,
  PagingOverride,
} from '../model/types';

/** Everything a view needs, built once per contract. */
export interface MockWorld {
  contract: Contract;
  settings: MockSettings;
  plan: MockPlan;
  models: readonly ApiModel[];
  extra: MockHooks;
}

export function buildWorld(
  contract: Contract,
  settings: MockSettings,
  extra: MockHooks = {},
): MockWorld {
  return {
    contract,
    settings,
    plan: planCollections(contract, settings),
    models: contract.models,
    extra,
  };
}

function entityContext(world: MockWorld): EntityContext {
  return { plan: world.plan, models: world.models, settings: world.settings, extra: world.extra };
}

/**
 * Which entities of a collection an endpoint is looking at.
 *
 * For a plain list, all of them. For a nested one, the children of a parent —
 * and the total is the total of **that**, not of the collection.
 */
export interface Selection {
  collection: Collection;
  /** The indices, in order. */
  indices: number[];
  /** Which parent this is filtered by, when it is. */
  parent: { collection: Collection; index: number } | null;
}

/** Re-exported: the filter and the foreign key must use the same answer. */
export { parentIndexOf as parentOfChild };

/** The parent an endpoint is showing: the one asked for, or the example's. */
function parentOf(
  world: MockWorld,
  endpoint: ApiEndpoint,
  asked: number | null,
): Selection['parent'] {
  const denied = world.settings.relations[endpoint.id];
  const key = denied !== undefined ? denied.parent : parentKey(endpoint.path);
  if (key === '') return null;
  const collection = world.plan.collections.get(key);
  if (collection === undefined || collection.size <= 0) return null;

  // The contract already wrote which parent to show: the marker's example.
  const marker = parentMarker(endpoint.path);
  const declared = endpoint.params.find((p) => p.in === 'path' && p.name === marker);
  const node = identityNode(collection, world.models);
  if (asked !== null) {
    return { collection, index: Math.min(Math.max(0, asked), collection.size - 1) };
  }
  const found =
    declared === undefined
      ? -1
      : indexOfIdentity(collection, declared.example, node, world.settings.seed);
  return { collection, index: found >= 0 ? found : 0 };
}

/** Which entities this endpoint is looking at, before any page is cut. */
export function selectionFor(
  world: MockWorld,
  endpoint: ApiEndpoint,
  askedParent: number | null = null,
): Selection | null {
  const key = world.plan.byEndpoint.get(endpoint.id) ?? collectionKey(endpoint.path);
  const collection = world.plan.collections.get(key);
  if (collection === undefined) return null;

  const parent = parentOf(world, endpoint, askedParent);
  if (parent === null) {
    return { collection, indices: range(collection.size), parent: null };
  }
  const indices: number[] = [];
  for (let i = 0; i < collection.size; i++) {
    if (
      parentIndexOf(i, parent.collection.size, world.settings.seed, collection.key) === parent.index
    ) {
      indices.push(i);
    }
  }
  return { collection, indices, parent };
}

function range(n: number): number[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => i);
}

/** Which entity a detail endpoint addresses, from its own path parameter. */
export function detailIndex(
  world: MockWorld,
  endpoint: ApiEndpoint,
  collection: Collection,
): number {
  const marker = endpoint.path.match(/\{([^}]+)\}\s*$/)?.[1] ?? '';
  const declared = endpoint.params.find((p) => p.in === 'path' && p.name === marker);
  const node = identityNode(collection, world.models);
  const found =
    declared === undefined
      ? -1
      : indexOfIdentity(collection, declared.example, node, world.settings.seed);
  return found >= 0 ? found : 0;
}

/**
 * The page size in force for a response: what it denied, or the global one.
 *
 * Honouring a `size` query parameter would need a value to honour, and the only
 * one written anywhere is its example — so that is what is read, and nothing
 * else about the query is (D9).
 */
function pageSizeFor(world: MockWorld, endpoint: ApiEndpoint, roles: PagingOverride): number {
  if (roles.pageSize > 0) return roles.pageSize;
  const declared = endpoint.params.find(
    (p) => p.in === 'query' && roles.size !== '' && p.name === roles.size.split('.').pop(),
  );
  const written = Number(declared?.example ?? '');
  if (Number.isFinite(written) && written > 0) return Math.trunc(written);
  return Math.max(1, world.settings.pageSize);
}

/**
 * The query parameters this endpoint declares that the mock leaves alone.
 *
 * Everything but the two with a pagination role. The asymmetry is the rule of
 * the whole design: what has a role — declared, or inferred and confirmed on
 * screen — is honoured, and what has none is not.
 */
function ignoredQueryParams(endpoint: ApiEndpoint, roles: PagingOverride): string[] {
  const honoured = new Set(
    [roles.page, roles.size].filter((p) => p !== '').map((p) => p.split('.').pop()),
  );
  return endpoint.params
    .filter((p) => p.in === 'query' && !honoured.has(p.name))
    .map((p) => p.name)
    .filter((name) => name.trim() !== '');
}

/** The page a query parameter asks for, as a step index, or `0`. */
function askedPage(endpoint: ApiEndpoint, roles: PagingOverride): number {
  if (roles.page === '') return 0;
  const name = roles.page.split('.').pop();
  const declared = endpoint.params.find((p) => p.in === 'query' && p.name === name);
  const written = Number(declared?.example ?? '');
  if (!Number.isFinite(written)) return 0;
  return Math.max(0, Math.trunc(written) - roles.base);
}

/** What one body of one endpoint shows, step by step. */
export interface EndpointView {
  kind: 'page' | 'variant' | 'single';
  bodies: JsonValue[];
  note: string;
  /** What was inferred, so a panel can show it and offer to deny it. */
  roles: PagingOverride;
  paginated: boolean;
  collectionKey: string;
  /** Which parent is on screen and how many there are, for stepping between them. */
  parent: { key: string; index: number; count: number } | null;
  /**
   * The page the request asks for, when a query parameter with the page's role
   * carries an example. The panel opens there; stepping still goes anywhere.
   */
  defaultStep: number;
  /**
   * The query parameters the mock does **not** honour.
   *
   * Said out loud rather than passed over: emitting a body that looks filtered
   * and is not would be worse than admitting the filter is ignored. Nobody
   * declares that a parameter called `estado` filters by the field `estado`, and
   * guessing it is the kind of guess that is wrong without saying so (D9).
   */
  ignoredParams: string[];
}

/** Write the value a dotted path names into a plain object, creating the way. */
function putAt(target: JsonValue, path: string, value: JsonValue): void {
  if (path === '' || target === null || typeof target !== 'object' || Array.isArray(target)) return;
  const steps = path.split('.');
  let node = target as { [k: string]: JsonValue };
  for (const step of steps.slice(0, -1)) {
    const next = node[step];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) return;
    node = next as { [k: string]: JsonValue };
  }
  const last = steps[steps.length - 1];
  // Only where the envelope actually has the field: creating one would emit a
  // key the contract does not declare.
  if (last in node) node[last] = value;
}

/** The absolute link to a page, when the contract gave a server to build it on. */
function pageLink(
  world: MockWorld,
  endpoint: ApiEndpoint,
  roles: PagingOverride,
  page: number,
): string {
  const base = world.contract.server.trim().replace(/\/$/, '');
  const size = roles.size === '' ? 'size' : (roles.size.split('.').pop() ?? 'size');
  const name = roles.page === '' ? 'page' : (roles.page.split('.').pop() ?? 'page');
  const path = endpoint.path.replace(/\{([^}]+)\}/g, (_, m: string) => {
    const declared = endpoint.params.find((p) => p.in === 'path' && p.name === m);
    return declared?.example.trim() || '1';
  });
  return `${base}${path}?${name}=${page}&${size}=${world.settings.pageSize}`;
}

/**
 * The bodies one response shows.
 *
 * A list becomes pages; one entity becomes itself; anything else becomes the N
 * variants that a body belonging to no collection has always had.
 */
export function viewOf(
  world: MockWorld,
  endpoint: ApiEndpoint,
  response: ApiResponse,
  askedParent: number | null = null,
): EndpointView {
  const body = response.body;
  const roles = rolesOf(body, world.settings.pagination[response.id]);
  const key = world.plan.byEndpoint.get(endpoint.id) ?? '';
  const collection = world.plan.collections.get(key) ?? null;
  const ctx = entityContext(world);

  const ignoredParams = ignoredQueryParams(endpoint, roles);
  const empty = { parent: null, defaultStep: 0, ignoredParams };

  if (body === null) {
    return {
      kind: 'variant',
      bodies: [],
      note: '',
      roles,
      paginated: false,
      collectionKey: key,
      ...empty,
    };
  }

  // One entity: a detail endpoint, or a write that answers with what it made.
  if (collection !== null && isDetailPath(endpoint.path) && body.type !== 'array') {
    const index = detailIndex(world, endpoint, collection);
    const node = identityNode(collection, world.models);
    const shown = String(
      node === null ? index + 1 : (entityIdentity(world, collection, index) ?? index + 1),
    );
    return {
      kind: 'single',
      bodies: [entityAt(collection, index, ctx)],
      note: `${collection.key} ${shown}`,
      roles,
      paginated: false,
      collectionKey: key,
      ...empty,
    };
  }

  // A write against a collection: the request and the response are one **new**
  // entity, so the fields they share carry the same value and the identity shows
  // up only where it is declared.
  if (collection !== null && isWrite(endpoint) && !isDetailPath(endpoint.path)) {
    return {
      kind: 'single',
      bodies: [entityAt(collection, collection.size, ctx)],
      note: `${collection.key} recién creado`,
      roles,
      paginated: false,
      collectionKey: key,
      ...empty,
    };
  }

  const selection = collection === null ? null : selectionFor(world, endpoint, askedParent);
  const parentOf_ =
    selection?.parent == null
      ? null
      : {
          key: selection.parent.collection.key,
          index: selection.parent.index,
          count: selection.parent.collection.size,
        };

  if (selection !== null && isPaginated(roles)) {
    return {
      ...pagedView(world, endpoint, response, selection, roles, key),
      parent: parentOf_,
      defaultStep: askedPage(endpoint, roles),
      ignoredParams,
    };
  }

  // A bare array at the root, or a list with no envelope worth cutting: the
  // elements come out whole (D15).
  if (selection !== null && body.type === 'array') {
    return {
      kind: 'single',
      bodies: [selection.indices.map((i) => entityAt(selection.collection, i, ctx))],
      note: parentNote(world, selection),
      roles,
      paginated: false,
      collectionKey: key,
      parent: parentOf_,
      defaultStep: 0,
      ignoredParams,
    };
  }

  const scope = bodyScope(endpoint.id, response.id);
  const count = Math.max(1, world.settings.variants);
  return {
    kind: 'variant',
    bodies: Array.from({ length: count }, (_, index) =>
      bodyAt(body, world.models, { seed: world.settings.seed, scope, index }, world.extra),
    ),
    note: '',
    roles,
    paginated: false,
    collectionKey: key,
    ...empty,
  };
}

function entityIdentity(world: MockWorld, collection: Collection, index: number): JsonValue | null {
  const entity = entityAt(collection, index, entityContext(world));
  if (entity === null || typeof entity !== 'object' || Array.isArray(entity)) return null;
  return (entity as { [k: string]: JsonValue })[collection.identity] ?? null;
}

function isWrite(endpoint: ApiEndpoint): boolean {
  return endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH';
}

function parentNote(world: MockWorld, selection: Selection): string {
  if (selection.parent === null) return '';
  const shown = entityIdentity(world, selection.parent.collection, selection.parent.index);
  const one = singular(selection.parent.collection.key);
  return `${selection.collection.key} de ${one} ${String(shown ?? selection.parent.index + 1)}`;
}

/** Every page of a paginated response, each one true about all the others. */
function pagedView(
  world: MockWorld,
  endpoint: ApiEndpoint,
  response: ApiResponse,
  selection: Selection,
  roles: PagingOverride,
  key: string,
): EndpointView {
  const ctx = entityContext(world);
  const total = selection.indices.length;
  const size = pageSizeFor(world, endpoint, roles);
  const pages = pageCount(total, size);
  const body = response.body!;

  const bodies: JsonValue[] = [];
  for (let page = 0; page < pages; page++) {
    const [from, to] = pageSlice(page, size, total);
    // The envelope is generated once per page like any other body, and then the
    // fields with a role are overwritten: the arithmetic wins over whatever a
    // source or a written example would have said, because a `total` that does
    // not match the elements is the error this whole feature exists to kill.
    const shell = bodyAt(
      body,
      world.models,
      { seed: world.settings.seed, scope: bodyScope(endpoint.id, response.id), index: page },
      world.extra,
    );
    putAt(
      shell,
      roles.items,
      selection.indices.slice(from, to).map((i) => entityAt(selection.collection, i, ctx)),
    );
    if (roles.page !== '') putAt(shell, roles.page, page + roles.base);
    if (roles.size !== '') putAt(shell, roles.size, size);
    if (roles.total !== '') putAt(shell, roles.total, total);
    if (roles.hasNext !== '') putAt(shell, roles.hasNext, page < pages - 1);
    if (roles.next !== '') {
      putAt(
        shell,
        roles.next,
        page < pages - 1 ? pageLink(world, endpoint, roles, page + 1 + roles.base) : null,
      );
    }
    if (roles.prev !== '') {
      putAt(
        shell,
        roles.prev,
        page > 0 ? pageLink(world, endpoint, roles, page - 1 + roles.base) : null,
      );
    }
    bodies.push(shell);
  }

  return {
    kind: 'page',
    bodies,
    note: parentNote(world, selection),
    roles,
    paginated: true,
    collectionKey: key,
    parent: null,
    defaultStep: 0,
    ignoredParams: [],
  };
}

export { successResponse, nodeAtPath };
