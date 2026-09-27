/**
 * What the panel steps through, for one body.
 *
 * The thin seam between the component and the mock: the panel asks for «the
 * things to show for this block» and gets back a list, what they are called, and
 * what was inferred so it can offer to deny it. Everything that grows — pages
 * instead of variants, a filter by parent — grows here, so `ExamplePanel.svelte`
 * never learns what a collection is.
 */

import { bodyScope, bodyVariants, type MockHooks } from './dataset';
import { buildWorld, viewOf, type MockWorld } from './view';
import { fromSource } from './values';
import type { JsonValue } from '../example';
import type {
  ApiEndpoint,
  ApiModel,
  ApiNode,
  ApiResponse,
  Contract,
  MockSettings,
  PagingOverride,
} from '../model/types';
import type { ValueSource } from '../sources/types';

/**
 * The hook that lets a field's assigned source answer.
 *
 * It sits here and not inside `dataset.ts` so the engine never learns where
 * sources are stored: it is handed a lookup, and everything else is the same
 * walk it always did.
 */
export function sourceHooks(seed: number, lookup: (id: string) => ValueSource | null): MockHooks {
  return {
    scalar(node, coord, index) {
      if (node.source === undefined) return null;
      return fromSource(node.source, lookup, seed, coord, index);
    },
  };
}

export type StepKind = 'variant' | 'page' | 'single';

export interface BlockViews {
  kind: StepKind;
  /** One entry per step, in order. */
  items: JsonValue[];
  /** What to say beside the stepper, e.g. `pedidos de cliente 7`. */
  note: string;
  /** What the envelope was inferred to be, for the block that offers to deny it. */
  roles: PagingOverride | null;
  paginated: boolean;
  /** The collection this block belongs to, or `''` — which the panel says out loud. */
  collectionKey: string;
  /** Which parent is on screen and how many there are, for stepping between them. */
  parent: { key: string; index: number; count: number } | null;
  /** Where to open when this block has not been stepped yet. */
  defaultStep: number;
  /** The query parameters the mock leaves alone, said out loud (D9). */
  ignoredParams: string[];
}

/** How one step reads: `página 2 de 3`. */
export function stepLabel(kind: StepKind, index: number, count: number): string {
  if (kind === 'single') return '';
  const what = kind === 'page' ? 'página' : 'variante';
  return `${what} ${index + 1} de ${count}`;
}

export { buildWorld };
export type { MockWorld };

/** The world a panel works against: built once per contract and reused per block. */
export function panelWorld(
  contract: Contract,
  settings: MockSettings,
  lookup: (id: string) => ValueSource | null,
): MockWorld {
  return buildWorld(contract, settings, sourceHooks(settings.seed, lookup));
}

/** The views of one endpoint body. */
export function endpointViews(
  world: MockWorld,
  endpoint: ApiEndpoint,
  response: ApiResponse,
  askedParent: number | null = null,
): BlockViews {
  const view = viewOf(world, endpoint, response, askedParent);
  return {
    kind: view.kind,
    items: view.bodies,
    note: view.note,
    roles: view.roles,
    paginated: view.paginated,
    collectionKey: view.collectionKey,
    parent: view.parent,
    defaultStep: view.defaultStep,
    ignoredParams: view.ignoredParams,
  };
}

/**
 * The views of a body that has no endpoint: a model being edited, or a request
 * body, which describes what goes **in** rather than what a collection holds.
 */
export function looseViews(
  body: ApiNode,
  models: readonly ApiModel[],
  settings: MockSettings,
  owner: string,
  slot: string,
  hooks: MockHooks,
): BlockViews {
  return {
    kind: 'variant',
    items: bodyVariants(body, models, settings, bodyScope(owner, slot), hooks),
    note: '',
    roles: null,
    paginated: false,
    collectionKey: '',
    parent: null,
    defaultStep: 0,
    ignoredParams: [],
  };
}
