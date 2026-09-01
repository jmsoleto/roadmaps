/**
 * A pasted JSON becomes a field tree (R6).
 *
 * This is what makes the tool usable at the speed of a conversation: you paste
 * the response Postman already gave you and start annotating, instead of typing
 * forty field names while the meeting waits.
 *
 * Pure, and it never mutates anything the caller owns. The store builds the
 * whole tree here first and only assigns it if the parse succeeded, which is
 * what makes a bad paste harmless (D6).
 */

import { newNode } from './model/factories';
import type { ApiNode, ItemType, NodeFormat } from './model/types';

/** Patterns that identify a format from the shape of a value alone. */
const PATTERNS: readonly { format: NodeFormat; test: RegExp }[] = [
  { format: 'date-time', test: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/ },
  { format: 'date', test: /^\d{4}-\d{2}-\d{2}$/ },
  { format: 'uuid', test: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
  { format: 'email', test: /^[^@\s]+@[^@\s]+\.\w+$/ },
  { format: 'uri', test: /^https?:\/\/\S+$/ },
];

/**
 * Which format a string looks like, or none.
 *
 * Order matters: `date-time` is checked before `date` because a timestamp also
 * begins with a date, and the more specific answer is the useful one.
 */
export function formatOf(value: string): NodeFormat {
  return PATTERNS.find((p) => p.test.test(value))?.format ?? '';
}

/** What an array of these values holds. */
function itemTypeOf(sample: unknown): ItemType {
  if (sample !== null && typeof sample === 'object' && !Array.isArray(sample)) return 'object';
  if (typeof sample === 'number') return Number.isInteger(sample) ? 'integer' : 'number';
  if (typeof sample === 'boolean') return 'boolean';
  return 'string';
}

/**
 * One value becomes one field.
 *
 * An integer is inferred as `integer` and not as `number`: it is the difference
 * between a generated client that accepts `1.5` for a page number and one that
 * does not, and it is free to get right here.
 *
 * Arrays of arrays are out of the model, so an array whose first element is an
 * array is described as an array of strings — wrong, but bounded, and the field
 * is visible for someone to correct.
 */
export function inferNode(key: string, value: unknown): ApiNode {
  if (value === null) return newNode(key, 'null');

  if (Array.isArray(value)) {
    const node = newNode(key, 'array');
    const sample = value[0];
    node.itemType = itemTypeOf(sample);
    if (node.itemType === 'object') {
      node.children = Object.entries(sample as Record<string, unknown>).map(([k, v]) =>
        inferNode(k, v),
      );
    }
    return node;
  }

  if (typeof value === 'object') {
    const node = newNode(key, 'object');
    node.children = Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      inferNode(k, v),
    );
    return node;
  }

  if (typeof value === 'number') {
    const node = newNode(key, Number.isInteger(value) ? 'integer' : 'number');
    node.example = String(value);
    return node;
  }

  if (typeof value === 'boolean') {
    const node = newNode(key, 'boolean');
    node.example = String(value);
    return node;
  }

  const node = newNode(key, 'string');
  node.example = String(value);
  node.format = formatOf(node.example);
  return node;
}

/** Why a paste could not be used. `null` when it could. */
export type PasteError = string | null;

export interface PasteResult {
  /** What the target node should become. `null` when the paste was refused. */
  shape: Pick<ApiNode, 'type' | 'itemType' | 'children'> | null;
  error: PasteError;
}

/**
 * Read a pasted document into the shape a node should take.
 *
 * Refuses anything that is not an object or an array: a bare number describes
 * no body, and silently turning the node into a string field would be a worse
 * answer than saying no. Nothing here touches the caller's tree — that is what
 * lets a bad paste leave half an hour of work untouched (R6, historia 13).
 */
export function readPaste(text: string): PasteResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { shape: null, error: 'Eso no es un JSON válido.' };
  }

  if (Array.isArray(parsed)) {
    const sample = parsed[0];
    const itemType = itemTypeOf(sample);
    return {
      shape: {
        type: 'array',
        itemType,
        children:
          itemType === 'object'
            ? Object.entries(sample as Record<string, unknown>).map(([k, v]) => inferNode(k, v))
            : [],
      },
      error: null,
    };
  }

  if (parsed !== null && typeof parsed === 'object') {
    return {
      shape: {
        type: 'object',
        itemType: 'string',
        children: Object.entries(parsed as Record<string, unknown>).map(([k, v]) =>
          inferNode(k, v),
        ),
      },
      error: null,
    };
  }

  return { shape: null, error: 'Pega un objeto o un array, no un valor suelto.' };
}
