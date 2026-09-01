/**
 * The tree becomes the JSON it describes (R1, historia 5).
 *
 * This is the half of the tool that faces the other person in the room: you
 * type the field names and they watch the shape of the response appear. So a
 * field with no example written must still show *something* plausible — a blank
 * would make the panel useless exactly when the contract is least finished.
 *
 * Models are not resolvable yet, so a `ref` shows as a marker rather than as
 * the model's shape. The recursion guard that R10 asks for belongs with them:
 * without references there is no cycle to cut.
 */

import { isContainer } from './model/tree';
import type { ApiNode } from './model/types';

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

/** The children of a container, as an object. Fields without a key are skipped. */
function objectOf(node: ApiNode): { [k: string]: JsonValue } {
  const out: { [k: string]: JsonValue } = {};
  for (const child of node.children) {
    if (child.key.trim() === '') continue;
    out[child.key] = exampleOf(child);
  }
  return out;
}

/** The JSON one node describes. */
export function exampleOf(node: ApiNode): JsonValue {
  if (node.type === 'ref') return { '⚠': 'referencia a un modelo' };

  if (node.type === 'object') return objectOf(node);

  if (node.type === 'array') {
    if (node.itemType === 'object') return [objectOf(node)];
    if (node.itemType === 'ref') return [{ '⚠': 'referencia a un modelo' }];
    // An array of scalars: one element, shaped like the element type. The node's
    // own example describes that element, not the array.
    return [scalarValue({ ...node, type: node.itemType })];
  }

  return scalarValue(node);
}

/** How many fields a body describes, for the empty state to know it is empty. */
export function fieldCount(node: ApiNode): number {
  if (!isContainer(node)) return 0;
  return node.children.length;
}
