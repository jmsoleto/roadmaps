/**
 * The mock: derived every time, stored never.
 *
 * What persists is the seed and a handful of numbers (`MockSettings`); the
 * entities, the pages and the JSON on screen are computed from them whenever
 * anybody looks. That is not an optimisation, it is the guarantee: **there is
 * nothing saved that could contradict a contract**, so a contract that never
 * asked for a mock does not have an old one — it does not have one (D1).
 *
 * This file builds the `ExampleContext` that `example.ts` walks with. A mock is
 * that same walk with another source of values, never a second walk.
 */

import { coordinate, pick } from './prng';
import { variedScalar } from './scalars';
import {
  collectionOfModel,
  identityNode,
  identityValue,
  type Collection,
  type MockPlan,
} from './collections';
import { exampleOf, type ExampleContext, type JsonValue } from '../example';
import type { ApiModel, ApiNode, MockSettings } from '../model/types';

/** How many elements an array with nothing to say about its length holds. */
const ARRAY_MIN = 1;
const ARRAY_MAX = 3;

/**
 * A hook the later layers fill in.
 *
 * Kept as data rather than as a growing signature so each layer plugs its own
 * answer in without the ones below it learning about the ones above: value
 * sources decide a scalar, collections decide a reference, pagination decides
 * how long the items array is. Every one of them may answer `null`, and then the
 * layer underneath answers.
 */
export interface MockHooks {
  /**
   * A scalar with a source assigned, or `null` to let the deduction answer.
   *
   * `index` is which entity or variant this is, and it is handed over rather
   * than parsed back out of the coordinate: a list consumed `en ciclo` or `sin
   * repetir` advances with it, and without it every entity would draw the same.
   */
  scalar?(node: ApiNode, coord: string, index: number): JsonValue | null;
  /** A reference to a model that is a collection's shape, or `null`. */
  reference?(node: ApiNode, coord: string, index: number): JsonValue | null;
  /** How long an array is, or `null` for the default handful. */
  length?(node: ApiNode, path: string, coord: string, index: number): number | null;
}

/** What one body is generated against: a seed, a scope, and which one it is. */
export interface MockScope {
  seed: number;
  /** The coordinate's first segment: a collection key, or an endpoint's body. */
  scope: string;
  /** Which entity, or which variant. */
  index: number;
}

/**
 * The coordinate scope of a body that belongs to no collection.
 *
 * `POST /login` has no entities, so its variants are indexed on their own. The
 * endpoint's id and the block keep two bodies of the same endpoint apart — a
 * request and its response would otherwise share every coordinate, which is
 * right for a write against a collection and wrong here.
 */
export function bodyScope(endpointId: string, block: string): string {
  return `${endpointId}:${block}`;
}

/** The context `example.ts` walks a body with. */
export function mockContext(
  { seed, scope, index }: MockScope,
  hooks: MockHooks = {},
): ExampleContext {
  const ctx: ExampleContext = {
    path: '',
    resolve(node, path) {
      const coord = coordinate(scope, index, path);
      if (node.type === 'ref') return hooks.reference?.(node, coord, index) ?? null;
      return hooks.scalar?.(node, coord, index) ?? variedScalar(node, seed, coord);
    },
    arrayLength(node, path) {
      const coord = coordinate(scope, index, path);
      const said = hooks.length?.(node, path, coord, index);
      if (said !== null && said !== undefined) return said;
      return ARRAY_MIN + pick(seed, `${coord}#len`, ARRAY_MAX - ARRAY_MIN + 1);
    },
  };
  return ctx;
}

/** One body, at one coordinate scope and index. */
export function bodyAt(
  body: ApiNode,
  models: readonly ApiModel[],
  scope: MockScope,
  hooks: MockHooks = {},
): JsonValue {
  return exampleOf(body, models, new Set(), mockContext(scope, hooks));
}

/**
 * The N variants of a body that belongs to no collection.
 *
 * This is the "several mocks" of an endpoint that is not a list: three bodies of
 * the same shape with different values, which is what the panel steps through
 * when there are no pages to step through.
 */
export function bodyVariants(
  body: ApiNode,
  models: readonly ApiModel[],
  settings: MockSettings,
  scope: string,
  hooks: MockHooks = {},
): JsonValue[] {
  const count = Math.max(1, settings.variants);
  return Array.from({ length: count }, (_, index) =>
    bodyAt(body, models, { seed: settings.seed, scope, index }, hooks),
  );
}

/**
 * Several sets of hooks as one, first answer wins.
 *
 * The order is the precedence the spec fixes: identity is governed by the
 * dataset and beats everything, a model that is a collection's shape is drawn
 * from it, and an assigned source speaks last — over the deduction, and under
 * the two rules that exist to stop somebody breaking coherence with a dropdown.
 */
export function composeHooks(...all: readonly MockHooks[]): MockHooks {
  const first = <T>(fns: readonly ((...a: never[]) => T | null | undefined)[], args: never[]) => {
    for (const fn of fns) {
      const answer = fn(...args);
      if (answer !== null && answer !== undefined) return answer;
    }
    return null;
  };
  return {
    scalar: (node, coord, index) =>
      first(
        all.map((h) => h.scalar).filter((f) => f !== undefined),
        [node, coord, index] as never[],
      ),
    reference: (node, coord, index) =>
      first(
        all.map((h) => h.reference).filter((f) => f !== undefined),
        [node, coord, index] as never[],
      ),
    length: (node, path, coord, index) =>
      first(
        all.map((h) => h.length).filter((f) => f !== undefined),
        [node, path, coord, index] as never[],
      ),
  };
}

/** What generating one entity of a collection needs to know. */
export interface EntityContext {
  plan: MockPlan;
  models: readonly ApiModel[];
  settings: MockSettings;
  /** Whatever the caller wants on top: value sources, mostly. */
  extra: MockHooks;
}

/**
 * The identity hook: the dataset governs it, and nothing else may (D3).
 *
 * A source assigned to an identity field is **ignored**, not honoured. It is not
 * a restriction for tidiness: if identity could be drawn from a list, two
 * collections that reference each other would have no order to resolve in, and a
 * detail endpoint could stop naming an entity the list actually holds.
 */
function identityHook(collection: Collection, index: number, ctx: EntityContext): MockHooks {
  if (collection.identity === '') return {};
  const node = identityNode(collection, ctx.models);
  // Matched on the coordinate's tail: `clientes/7/id` is the entity's own
  // identity, while `clientes/7/direccion.id` — a dotted path — is not, so a
  // nested field that happens to share the name is left alone.
  const tail = `/${collection.identity}`;
  return {
    scalar: (candidate, coord) =>
      coord.endsWith(tail)
        ? identityValue(collection, index, node ?? candidate, ctx.settings.seed)
        : null,
  };
}

/**
 * Which parent a child belongs to (D8).
 *
 * The wheel first, so **no parent is left with none** when there are at least as
 * many children as parents; the rest by coordinate, so the counts are uneven,
 * which is what real data looks like. It lives here because two places need the
 * same answer and they must never disagree: the foreign key a child carries, and
 * the filter a nested endpoint applies. Same function, so they cannot.
 */
export function parentIndexOf(
  childIndex: number,
  parents: number,
  seed: number,
  childKey: string,
): number {
  if (parents <= 0) return -1;
  if (childIndex < parents) return childIndex;
  return pick(seed, `${childKey}/${childIndex}#padre`, parents);
}

/**
 * The foreign-key hook: a child carries the identity of the parent it belongs to.
 *
 * Without it the filter and the data contradict each other — a nested endpoint
 * would select nine pedidos and each of them would name a different cliente,
 * which is the most visible incoherence a mock can have and the one this whole
 * feature exists to kill.
 *
 * It is also why a foreign key can never loop: the parent's identity depends on
 * `(collection, index)` and on nothing else (D3), so this needs no field of the
 * parent and cannot ask for one.
 */
function foreignKeyHook(collection: Collection, index: number, ctx: EntityContext): MockHooks {
  const link = collection.parent;
  if (link === null || link.foreignKey === '') return {};
  const parent = ctx.plan.collections.get(link.key);
  if (parent === undefined || parent.size <= 0) return {};
  const at = parentIndexOf(index, parent.size, ctx.settings.seed, collection.key);
  if (at < 0) return {};
  const tail = `/${link.foreignKey}`;
  const node = identityNode(parent, ctx.models);
  return {
    scalar: (_candidate, coord) =>
      coord.endsWith(tail) ? identityValue(parent, at, node, ctx.settings.seed) : null,
    // The link written as a reference: the whole parent entity, and the one the
    // filter agrees with rather than any of them.
    reference: (candidate, coord) =>
      coord.endsWith(tail) && candidate.ref === parent.modelId
        ? entityAt(parent, at, ctx, new Set([collection.key]))
        : null,
  };
}

/**
 * The reference hook: a model that is a collection's shape is **drawn from it**
 * wherever it appears (D5), rather than generated afresh.
 *
 * `seen` is the collections already open on this branch. An entity that embeds
 * one of itself —or two that embed each other— would otherwise expand forever;
 * answering `null` there hands the node back to the model walk, whose own cut
 * already knows how to stop.
 */
function referenceHook(ctx: EntityContext, seen: ReadonlySet<string>): MockHooks {
  return {
    reference(node, coord) {
      const target = node.type === 'ref' ? node.ref : '';
      if (target === '') return null;
      const collection = collectionOfModel(ctx.plan, target);
      if (collection === null || collection.size <= 0) return null;
      if (seen.has(collection.key)) return null;
      const index = pick(ctx.settings.seed, `${coord}#ref`, collection.size);
      return entityAt(collection, index, ctx, seen);
    },
  };
}

/**
 * One entity of a collection: the unit everything else is a view of.
 *
 * The same entity is worth the same whoever asks for it — in a list, in a
 * detail, embedded in another — because every value is a function of its
 * coordinate and not of the order it was requested in.
 */
export function entityAt(
  collection: Collection,
  index: number,
  ctx: EntityContext,
  seen: ReadonlySet<string> = new Set(),
): JsonValue {
  const shape = shapeOf(collection, ctx.models);
  if (shape === null) return {};
  const next = new Set(seen);
  next.add(collection.key);
  const hooks = composeHooks(
    identityHook(collection, index, ctx),
    foreignKeyHook(collection, index, ctx),
    referenceHook(ctx, next),
    ctx.extra,
  );
  return bodyAt(
    shape,
    ctx.models,
    { seed: ctx.settings.seed, scope: collection.key, index },
    hooks,
  );
}

/** The node a collection's elements are shaped like. */
export function shapeOf(collection: Collection, models: readonly ApiModel[]): ApiNode | null {
  if (collection.modelId !== '') {
    return models.find((m) => m.id === collection.modelId)?.node ?? null;
  }
  return collection.shape;
}
