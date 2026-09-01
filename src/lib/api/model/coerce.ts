/**
 * What happens to a field when its type changes (design decision D5).
 *
 * The prototype scattered these rules through its `change` handler. Gathered
 * here they are five sentences, testable without a browser, and the fifth one —
 * what *survives* a type change — is the one the prototype never stated and the
 * one that decides whether correcting yourself mid-sentence costs you a retype.
 */

import { newNode } from './factories';
import { isContainer, isScalar } from './tree';
import type { ApiNode, ItemType, NodeType } from './types';

/**
 * Apply a type change to a node, in place.
 *
 * In place because the caller is the store, holding the reactive document, and
 * returning a new node would break the identity every `{#each}` key depends on.
 */
export function applyType(node: ApiNode, type: NodeType): void {
  node.type = type;

  // An array has to declare what it holds; without this a fresh array is a
  // half-built field that exports as nothing.
  if (type === 'array' && node.itemType === undefined) node.itemType = 'string';

  // A reference left over from a type that is no longer a reference would point
  // at a model this field has nothing to do with.
  if (type !== 'ref') node.ref = '';
  if (!(type === 'array' && node.itemType === 'ref')) node.itemRef = '';

  // A container with no children says nothing and costs a click at the worst
  // possible moment, which is while somebody is waiting for you to type.
  if (isContainer(node) && node.children.length === 0) {
    node.children = [newNode('campo', 'string')];
    node.open = true;
  }

  // The example of an object is its tree, not a piece of text. Same for a
  // reference, whose example belongs to the model.
  if (!isScalar(node)) node.example = '';

  // Format and enumeration only mean something on a scalar.
  if (!isScalar(node)) {
    node.format = '';
    node.enums = [];
  }

  // What is NOT touched, and it is the whole point: `key`, `description` and
  // `required`. They are true of the field whatever shape it turns out to have,
  // and losing the comment because you realised the field was an object would
  // punish exactly the correction this tool exists to make easy.
}

/** Apply a change of element type to an array, in place. */
export function applyItemType(node: ApiNode, itemType: ItemType): void {
  node.itemType = itemType;
  if (itemType !== 'ref') node.itemRef = '';
  if (isContainer(node) && node.children.length === 0) {
    node.children = [newNode('campo', 'string')];
    node.open = true;
  }
  // Leaving an array of objects for an array of scalars keeps the children in
  // place rather than deleting them: it is a common mis-click, and the fields
  // are still there if the type goes back. They are simply not exported.
}
