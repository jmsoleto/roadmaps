/**
 * A scalar's value in a mock, when no source was assigned to the field.
 *
 * Four situations, and they cannot be treated alike (D18):
 *
 *  - A **written `example`** is respected, in all N entities. It is a fact
 *    somebody declared about *that* field, and overwriting it would silently
 *    change what was typed by hand — in the place where most work is invested.
 *  - An **enumeration** varies across its values. The admitted values are already
 *    declared, so choosing one per entity guesses nothing.
 *  - **Nothing declared** varies within the type and the format. Without this the
 *    mock is the same row N times, which is of no use to anybody.
 *  - A **source** assigned beats all three, and is not this file's business.
 *
 * The vocabulary of somebody's domain is deliberately absent here: a plain text
 * field with nothing declared becomes `texto 7`, which reads as the placeholder
 * it is. Shipping a dictionary of plausible names would compete with value
 * sources while being worse at it — a source knows the real states of a real
 * order, and no dictionary does.
 */

import type { JsonValue } from '../example';
import { scalarValue } from '../example';
import type { ApiNode } from '../model/types';
import { pick, unit, unitAt } from './prng';

type Scalar = Pick<ApiNode, 'type' | 'example' | 'format' | 'enums'>;

const HEX = '0123456789abcdef';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** A run of characters from an alphabet, one draw per position. */
function chars(seed: number, coord: string, length: number, alphabet: string, from = 0): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(unitAt(seed, coord, from + i) * alphabet.length)];
  }
  return out;
}

/** Days since the epoch for an ISO date, or `null` when it is not one. */
function epochDay(iso: string): number | null {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 86400000);
}

/** An ISO date between two, inclusive. A backwards range is read forwards. */
export function dateBetween(seed: number, coord: string, from: string, to: string): string {
  const a = epochDay(from) ?? epochDay('2026-01-01')!;
  const b = epochDay(to) ?? epochDay('2026-12-31')!;
  const lo = Math.min(a, b);
  const span = Math.abs(b - a) + 1;
  const day = lo + Math.floor(unit(seed, coord) * span);
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

/** A plausible instant on a date in range, so two entities differ by more than the day. */
function dateTimeBetween(seed: number, coord: string, from: string, to: string): string {
  const day = dateBetween(seed, coord, from, to);
  const hour = Math.floor(unitAt(seed, coord, 1) * 24);
  const minute = Math.floor(unitAt(seed, coord, 2) * 60);
  const second = Math.floor(unitAt(seed, coord, 3) * 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day}T${pad(hour)}:${pad(minute)}:${pad(second)}Z`;
}

/** The window a date with nothing declared falls in. A year reads as a year. */
const YEAR_FROM = '2026-01-01';
const YEAR_TO = '2026-12-31';

/** A v4-shaped uuid built from the coordinate, so it is stable and unique. */
function uuidAt(seed: number, coord: string): string {
  const hex = chars(seed, coord, 31, HEX);
  // Version 4 and the variant bits, so what comes out passes for a uuid rather
  // than merely looking like one: a generator that rejects it would be right.
  const variant = HEX[8 + Math.floor(unitAt(seed, coord, 40) * 4)];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-${variant}${hex.slice(15, 18)}-${hex.slice(18, 30)}`;
}

/** An integer in `[min, max]`. */
function intBetween(seed: number, coord: string, min: number, max: number): number {
  return min + pick(seed, coord, Math.max(1, max - min + 1));
}

/**
 * One of the admitted values, coerced to the field's type.
 *
 * Handled before the type, and for every type: an enumeration on an integer
 * field is a legitimate contract, and today's deduction ignores it and answers
 * `1`. Inside a mock, answering one of the declared values is strictly better.
 */
function fromEnums(node: Scalar, seed: number, coord: string): JsonValue {
  const chosen = node.enums[pick(seed, coord, node.enums.length)];
  if (node.type === 'number' || node.type === 'integer') {
    const parsed = Number(chosen.replace(',', '.'));
    if (Number.isNaN(parsed)) return chosen;
    return node.type === 'integer' ? Math.trunc(parsed) : parsed;
  }
  if (node.type === 'boolean') return /^(true|1|s[ií]|yes)$/i.test(chosen);
  return chosen;
}

/** What a scalar is worth in a mock, at this coordinate. */
export function variedScalar(node: Scalar, seed: number, coord: string): JsonValue {
  // A written example wins: it is a declared fact about this field (D18).
  if (node.example.trim() !== '') return scalarValue(node);
  if (node.enums.length > 0) return fromEnums(node, seed, coord);

  if (node.type === 'null') return null;
  if (node.type === 'boolean') return unit(seed, coord) < 0.5;

  if (node.type === 'integer') {
    if (node.format === 'int64') return intBetween(seed, coord, 1, 9_000_000_000);
    return intBetween(seed, coord, 1, 999);
  }
  if (node.type === 'number') {
    // Two decimals, because the numbers a contract carries are prices and rates.
    return Math.round(unit(seed, coord) * 99900) / 100;
  }

  switch (node.format) {
    case 'date':
      return dateBetween(seed, coord, YEAR_FROM, YEAR_TO);
    case 'date-time':
      return dateTimeBetween(seed, coord, YEAR_FROM, YEAR_TO);
    case 'uuid':
      return uuidAt(seed, coord);
    case 'email':
      return `${chars(seed, coord, 7, LETTERS)}@ejemplo.com`;
    case 'uri':
      return `https://ejemplo.com/recurso/${intBetween(seed, coord, 1, 9999)}`;
    // A mask has nothing to vary: eight dots are eight dots.
    case 'password':
      return '••••••••';
    case 'byte':
      return `${chars(seed, coord, 22, B64)}==`;
    case 'int64':
      return String(intBetween(seed, coord, 1, 9_000_000_000_000));
    case 'float':
      return String(Math.round(unit(seed, coord) * 99900) / 100);
    default:
      // Honest placeholder, numbered so a table shows N different rows.
      return `texto ${intBetween(seed, coord, 1, 999)}`;
  }
}
