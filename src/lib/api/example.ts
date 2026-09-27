/**
 * The tree becomes the JSON it describes (R1, historia 5).
 *
 * This is the half of the tool that faces the other person in the room: you
 * type the field names and they watch the shape of the response appear. So a
 * field with no example written must still show *something* plausible — a blank
 * would make the panel useless exactly when the contract is least finished.
 *
 * References are resolved here, which is why every caller has to hand over the
 * catalogue of models. There is deliberately **no default** for it (D4): a
 * consumer left unmigrated would still compile and would quietly stop resolving
 * references, which is the kind of bug that shows up in an exported document
 * weeks later.
 */

import { isContainer } from './model/tree';
import type { ApiModel, ApiNode } from './model/types';

/** What a scalar with no example of its own should look like. */
const BY_FORMAT: Record<string, string> = {
  'date-time': '2026-01-31T10:00:00Z',
  date: '2026-01-31',
  uuid: '3f2b1c9a-0000-4a3d-9f00-abcdef123456',
  email: 'usuario@ejemplo.com',
  uri: 'https://ejemplo.com/recurso',
  password: '••••••••',
  byte: 'U3dhZ2dlciByb2Nrcw==',
};

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

/**
 * What a **mock** injects into this walk, and nothing else does.
 *
 * The whole point of the seam: a mock is not a second generator, it is *this*
 * walk with another source of values. Writing a parallel walk would duplicate
 * the recursion cut, the reference resolution and the format rules, and in two
 * months the example and the mock would stop saying the same thing.
 *
 * Absent, everything below behaves exactly as it did before mocks existed —
 * which is what `example.test.ts` pins without a single test having to change.
 */
export interface ExampleContext {
  /** The dotted path of the node being visited, from the body's root. */
  path: string;
  /**
   * What the mock wants at this node, or `null` to leave it to the deduction.
   *
   * Called for every scalar **and** for every `ref`: a reference to a model that
   * is the shape of a collection is drawn from that collection rather than
   * generated, and that decision belongs to the mock, not here.
   */
  resolve(node: ApiNode, path: string): JsonValue | null;
  /** How many elements an array holds. The example's answer is always one. */
  arrayLength(node: ApiNode, path: string): number;
}

/** The path of a child, from its parent's. The body's root has no path. */
export function childPath(parent: string, key: string): string {
  return parent === '' ? key : `${parent}.${key}`;
}

/**
 * One scalar's value: what was written, or what its type and format suggest.
 *
 * A number written as `39,95` is read as `39.95`: the field is typed on a
 * Spanish keyboard in the middle of a conversation, and refusing the comma
 * would put a `0` in the example for no good reason.
 */
export function scalarValue(
  node: Pick<ApiNode, 'type' | 'example' | 'format' | 'enums'>,
): JsonValue {
  const written = node.example.trim();

  if (node.type === 'boolean') {
    return written === '' ? false : /^(true|1|s[ií]|yes)$/i.test(written);
  }
  if (node.type === 'number' || node.type === 'integer') {
    if (written === '') return node.type === 'integer' ? 1 : 1.5;
    const parsed = Number(written.replace(',', '.'));
    if (Number.isNaN(parsed)) return 0;
    return node.type === 'integer' ? Math.trunc(parsed) : parsed;
  }
  if (node.type === 'null') return null;

  if (written !== '') return written;
  if (node.format === 'int64') return '9007199254740993';
  if (node.format === 'float') return '1.5';
  if (node.format in BY_FORMAT) return BY_FORMAT[node.format];
  // The first admitted value beats a generic placeholder: it is real, and it
  // shows the reader what the enumeration actually looks like.
  if (node.enums.length > 0) return node.enums[0];
  return 'texto';
}

/** The models a contract holds, for resolving a reference. */
export type ModelCatalog = readonly ApiModel[];

/**
 * Which models the current branch has already entered (D5).
 *
 * The **path**, not the depth. Entering a model that is already on the path is
 * a cycle and gets cut; entering the same model from two sibling fields is not,
 * and both expand. A depth counter would also truncate the legitimate nesting
 * of a deep contract that has no cycle at all.
 */
type Seen = ReadonlySet<string>;

/** The children of a container, as an object. Fields without a key are skipped. */
function objectOf(
  node: ApiNode,
  models: ModelCatalog,
  seen: Seen,
  ctx?: ExampleContext,
): { [k: string]: JsonValue } {
  const out: { [k: string]: JsonValue } = {};
  for (const child of node.children ?? []) {
    if (child.key.trim() === '') continue;
    out[child.key] = exampleOf(
      child,
      models,
      seen,
      ctx === undefined ? undefined : { ...ctx, path: childPath(ctx.path, child.key) },
    );
  }
  return out;
}

/**
 * The shape a model describes, or an empty one when we are already inside it.
 *
 * The empty object is what "cutting the recursion" looks like: `Categoria` with
 * `hijas: array<Categoria>` shows one category whose daughters are empty, which
 * teaches the shape without pretending to enumerate it. The example is
 * illustrative; the **schema** keeps the recursion, because there it is the
 * contract.
 */
function modelShape(
  modelId: string,
  models: ModelCatalog,
  seen: Seen,
  ctx?: ExampleContext,
): JsonValue {
  const model = models.find((m) => m.id === modelId);
  if (!model?.node) return { '⚠': 'referencia a un modelo que no existe' };
  if (seen.has(modelId)) return {};
  const next = new Set(seen);
  next.add(modelId);
  // The path does not grow: a reference is not a level of the JSON, so the
  // model's own fields hang off the referencing field's path. Otherwise the same
  // field would have two coordinates depending on whether it arrived by
  // reference, and the mock would stop being stable.
  return exampleOf(model.node, models, next, ctx);
}

/** The JSON one node describes. */
export function exampleOf(
  node: ApiNode,
  models: ModelCatalog,
  seen: Seen = new Set(),
  ctx?: ExampleContext,
): JsonValue {
  if (node.type === 'ref') {
    const chosen = ctx?.resolve(node, ctx.path) ?? null;
    if (chosen !== null) return chosen;
    return modelShape(node.ref, models, seen, ctx);
  }

  if (node.type === 'object') return objectOf(node, models, seen, ctx);

  if (node.type === 'array') {
    // How many elements: one for the example, as many as the mock says otherwise.
    // Each gets its own coordinate, so `tags[0]` and `tags[1]` differ and stay
    // put when a sibling field is added.
    const count = ctx === undefined ? 1 : Math.max(0, ctx.arrayLength(node, ctx.path));
    const at = (i: number): ExampleContext | undefined =>
      ctx === undefined ? undefined : { ...ctx, path: `${ctx.path}[${i}]` };

    if (node.itemType === 'object') {
      return Array.from({ length: count }, (_, i) => objectOf(node, models, seen, at(i)));
    }
    if (node.itemType === 'ref') {
      // An empty array is the honest cut for a list of itself: one element that
      // is `{}` would read as "a category holds an empty category".
      if (seen.has(node.itemRef)) return [];
      return Array.from({ length: count }, (_, i) => {
        const inner = at(i);
        const chosen = inner
          ? inner.resolve({ ...node, type: 'ref', ref: node.itemRef }, inner.path)
          : null;
        return chosen ?? modelShape(node.itemRef, models, seen, inner);
      });
    }
    // An array of scalars: the node's own example describes the element, not
    // the array.
    const item = { ...node, type: node.itemType };
    return Array.from({ length: count }, (_, i) => {
      const inner = at(i);
      return (inner ? inner.resolve(item, inner.path) : null) ?? scalarValue(item);
    });
  }

  const chosen = ctx?.resolve(node, ctx.path) ?? null;
  return chosen !== null ? chosen : scalarValue(node);
}

/** How many fields a body describes, for the empty state to know it is empty. */
export function fieldCount(node: ApiNode): number {
  if (!isContainer(node)) return 0;
  return node.children.length;
}
