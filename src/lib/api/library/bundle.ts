/**
 * What gets saved when a model goes into the library (D1).
 *
 * Pure, and it copies: the entry must not share nodes with the contract it came
 * from, or editing the contract afterwards would silently rewrite the library.
 */

import { uid } from '../../util/id';
import { modelDependencies } from '../model/models';
import type { ApiModel, Contract } from '../model/types';
import type { LibraryEntry } from './types';

/**
 * The models an entry for this one would carry: the model itself, first, then
 * everything it needs.
 *
 * Exposed on its own so the screen can say what it is about to take along.
 * Saving a model and finding three in the library, with no warning, is an
 * invisible effect — and invisible effects are what make people stop trusting
 * a button.
 */
export function bundledModels(contract: Contract, modelId: string): ApiModel[] {
  const model = contract.models.find((m) => m.id === modelId);
  if (!model) return [];
  const deps = modelDependencies(contract, modelId)
    .map((id) => contract.models.find((m) => m.id === id))
    .filter((m): m is ApiModel => m !== undefined);
  return [model, ...deps];
}

/**
 * Build the entry to save.
 *
 * The models keep the ids they had in the contract. They are meaningless
 * outside it, but they are internally consistent — a reference inside the
 * bundle points at another model of the bundle — and that is all `bringBundle`
 * needs to remap them on the way in.
 */
export function bundleOf(contract: Contract, modelId: string): LibraryEntry | null {
  const models = bundledModels(contract, modelId);
  if (models.length === 0) return null;
  const [model] = models;
  return {
    id: uid('lib'),
    name: model.name,
    description: model.description,
    updated: new Date().toISOString(),
    models: structuredClone(models),
  };
}
