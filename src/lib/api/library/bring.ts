/**
 * Bringing a library entry into a contract (D3, D4).
 *
 * The piece with the edges, and pure on purpose: the whole matrix — collision
 * and no collision, reuse and bring separately, a dependency that collides
 * while the model asked for does not — is testable without mounting anything.
 *
 * What makes it delicate is the remapping. A model arriving from the library
 * points at **the library's** identifiers, and each one has to end up pointing
 * either at its freshly created copy or at the contract's own model that was
 * chosen to be reused. One translation table, built before anything is
 * inserted.
 */

import { uid } from '../../util/id';
import { reissueNodeIds } from '../model/identity';
import { uniqueModelName } from '../model/models';
import { walk } from '../model/tree';
import type { ApiModel, Contract } from '../model/types';
import type { LibraryEntry } from './types';

/** What to do with one model of the bundle whose name the contract already has. */
export type Resolution = 'reutilizar' | 'traer';

/**
 * A name the bundle brings that the contract already uses.
 *
 * `mineFields` and `theirsFields` are what the screen shows to make the choice
 * informed. Deliberately a count and not a diff: it is the least that tells
 * «they are the same» from «they are not» without opening a comparison in the
 * middle of a refinement, and it does not pretend to be more.
 */
export interface Collision {
  /** The id in the bundle. */
  libraryId: string;
  /** The id of the contract's own model with that name. */
  contractId: string;
  name: string;
  mineFields: number;
  theirsFields: number;
}

const fieldCount = (model: ApiModel): number => model.node?.children?.length ?? 0;

/** Which of the bundle's models share a name with one already in the contract. */
export function collisionsOf(contract: Contract, entry: LibraryEntry): Collision[] {
  const out: Collision[] = [];
  for (const theirs of entry.models) {
    const mine = contract.models.find((m) => m.name === theirs.name);
    if (!mine) continue;
    out.push({
      libraryId: theirs.id,
      contractId: mine.id,
      name: theirs.name,
      mineFields: fieldCount(mine),
      theirsFields: fieldCount(theirs),
    });
  }
  return out;
}

export interface BroughtBundle {
  /** The models to append to the contract, already reidentified and remapped. */
  models: ApiModel[];
  /** The contract-side id of the model the entry is named after. */
  broughtId: string;
}

/**
 * Work out what the contract should receive.
 *
 * Returns rather than mutates, so the caller decides when to commit — and so a
 * bad decision map cannot leave a contract half-merged.
 *
 * `decisions` maps a colliding **library** id to what to do with it. A model
 * that does not collide is always brought, decision or not — that is the normal
 * case and the one that costs a single click. A model that **does** collide and
 * has no decision is reused, which is the same default the screen offers (D3),
 * so the function and the screen cannot disagree about what «just bring it»
 * means.
 */
export function bringBundle(
  contract: Contract,
  entry: LibraryEntry,
  decisions: ReadonlyMap<string, Resolution> = new Map(),
): BroughtBundle | null {
  if (entry.models.length === 0) return null;

  const collisions = new Map(collisionsOf(contract, entry).map((c) => [c.libraryId, c]));

  // One table, built before anything is inserted: every library id ends up
  // pointing either at its new copy or at the contract's model being reused.
  const translation = new Map<string, string>();
  const arriving: { source: ApiModel; copy: ApiModel }[] = [];
  // Names are claimed as we go, so two arriving models cannot take the same one.
  const claimed: { name: string }[] = contract.models.map((m) => ({ name: m.name }));

  for (const source of entry.models) {
    const collision = collisions.get(source.id);
    if (collision && decisions.get(source.id) !== 'traer') {
      // Reusing: nothing is added, and whatever pointed at this one inside the
      // bundle will point at the contract's model instead.
      translation.set(source.id, collision.contractId);
      continue;
    }

    const copy = structuredClone(source);
    copy.id = uid('mod');
    copy.name = uniqueModelName(claimed, source.name);
    claimed.push({ name: copy.name });
    translation.set(source.id, copy.id);
    arriving.push({ source, copy });
  }

  // Only now, with every id known, are the references rewritten.
  for (const { copy } of arriving) {
    if (!copy.node) continue;
    reissueNodeIds(copy.node);
    walk(copy.node, (node) => {
      const ref = translation.get(node.ref);
      if (ref) node.ref = ref;
      const itemRef = translation.get(node.itemRef);
      if (itemRef) node.itemRef = itemRef;
    });
  }

  const broughtId = translation.get(entry.models[0].id);
  if (!broughtId) return null;
  return { models: arriving.map((a) => a.copy), broughtId };
}
