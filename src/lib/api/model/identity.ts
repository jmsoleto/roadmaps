/**
 * Giving a whole contract a new identity, references included.
 *
 * Two callers, and they are the same operation seen from two sides (D1):
 * duplicating a contract, and importing one from a file. If importing wrote its
 * own reissue, the day a model gains another field holding a reference — and it
 * will, `oneOf` is in the PRD's P2 — one of the two would be updated and the
 * other would not. The failure would be an imported contract quietly pointing
 * at somebody else's models, which nothing would flag.
 *
 * Mutates in place, and expects a plain contract: the store snapshots before
 * calling, and the importer builds one from text.
 */

import { uid } from '../../util/id';
import type { ApiNode, Contract } from './types';

/** Reissue every id under one body, remapping its references as it goes. */
function reissueNode(node: ApiNode, models: ReadonlyMap<string, string>): void {
  node.id = uid('nod');
  node.ref = models.get(node.ref) ?? node.ref;
  node.itemRef = models.get(node.itemRef) ?? node.itemRef;
  for (const child of node.children ?? []) reissueNode(child, models);
}

/**
 * Reissue every id under one body and nothing else.
 *
 * For copying a piece of a contract inside the same contract — an endpoint, a
 * model — where the references must keep pointing at the models that are still
 * there. Reissuing them would break the copy; `reissueIds` is the other case,
 * where the models are being copied too.
 */
export function reissueNodeIds(node: ApiNode): void {
  reissueNode(node, EMPTY);
}

/** No remapping: every reference is left exactly as it was. */
const EMPTY: ReadonlyMap<string, string> = new Map();

/**
 * Reissue every identifier in a contract, in place.
 *
 * Models first, so their new ids exist before anything that points at them is
 * walked. A reference to a model that is not in this contract is left alone
 * rather than blanked: it is already broken, and blanking it would throw away
 * the evidence of what it used to be.
 */
export function reissueIds(contract: Contract): void {
  const models = new Map<string, string>();
  for (const model of contract.models) {
    const next = uid('mod');
    models.set(model.id, next);
    model.id = next;
  }

  for (const model of contract.models) {
    if (model.node) reissueNode(model.node, models);
  }

  // The mock's corrections are keyed by endpoint and by response id, so the
  // remapping has to reach them too — otherwise importing a contract would
  // silently drop every envelope and every relation somebody had corrected, and
  // the mock would go back to whatever the inference says. Collected as the ids
  // are reissued, and applied once at the end.
  const endpointIds = new Map<string, string>();
  const responseIds = new Map<string, string>();

  for (const endpoint of contract.endpoints) {
    const old = endpoint.id;
    endpoint.id = uid('ep');
    endpointIds.set(old, endpoint.id);
    // The remembered view names an endpoint by id, so it has to follow.
    if (contract.view?.kind === 'endpoint' && contract.view.id === old) {
      contract.view = { kind: 'endpoint', id: endpoint.id };
    }
    for (const param of endpoint.params ?? []) param.id = uid('par');
    if (endpoint.body) reissueNode(endpoint.body, models);
    for (const response of endpoint.responses ?? []) {
      const oldResponse = response.id;
      response.id = uid('res');
      responseIds.set(oldResponse, response.id);
      if (response.body) reissueNode(response.body, models);
    }
  }

  if (contract.view?.kind === 'model') {
    const next = models.get(contract.view.id);
    contract.view = next ? { kind: 'model', id: next } : null;
  }

  if (contract.mock !== undefined) {
    contract.mock = {
      ...contract.mock,
      pagination: rekey(contract.mock.pagination, responseIds),
      relations: rekey(contract.mock.relations, endpointIds),
      collections: rekey(contract.mock.collections, endpointIds),
    };
  }
}

/**
 * The same map under the new ids, dropping what nothing answers to any more.
 *
 * Dropped and not kept: a correction keyed by an id that no longer exists is
 * unreachable, and leaving it would grow the document on every round trip with
 * entries nothing can ever read or delete. `sizes` and `identities` are not
 * rekeyed because they are keyed by collection — a path segment, which identity
 * never touches.
 */
function rekey<T>(map: Record<string, T>, ids: ReadonlyMap<string, string>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [old, value] of Object.entries(map)) {
    const next = ids.get(old);
    if (next !== undefined) out[next] = value;
  }
  return out;
}
