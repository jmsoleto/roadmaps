/**
 * Where a mock's values come from: a coordinate, not a stream.
 *
 * This is the decision the whole feature hangs from, and it is invisible until
 * you suffer it. A sequential generator —`prng.next()` consumed in the order the
 * tree is walked— means that adding one field shifts the consumption and **every
 * entity changes value at once**: the panel flickers whole with each keystroke,
 * exactly where it is meant to be read while typing. Here every value is a pure
 * function of `(seed, coordinate)`, so adding a field adds a column and touches
 * nothing else.
 *
 * It also gives referential coherence for free. An entity is worth the same
 * whoever computes it —in a list, in a detail, embedded in another— because its
 * value **does not depend on the order it was asked for**. Coherence stops being
 * a mechanism somebody has to maintain and becomes a property of how the value
 * is born.
 *
 * Which is why this file has **no state**. The day someone reaches for a
 * `Math.random()` or a cursor here, both properties go, and nothing fails loudly.
 */

/**
 * A coordinate: what identifies one cell of the mock.
 *
 * Written `clientes/7/direccion.ciudad`, and an element of a scalar array
 * `clientes/7/tags[2]`. The collection may be an endpoint's own key when the
 * body belongs to no collection at all — see `dataset.ts`.
 */
export function coordinate(scope: string, index: number, path: string): string {
  return `${scope}/${index}/${path}`;
}

/**
 * A 32-bit hash of a string, mixed with the seed.
 *
 * xmur3's mixing: enough avalanche that two coordinates differing by one
 * character land nowhere near each other, which is the whole requirement —
 * `nombre` and `nombre2` must not produce neighbouring values, or every entity
 * would look like a gradient.
 */
function mix(seed: number, text: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(h ^ text.charCodeAt(i), 0x5bd1e995) + 0x1b873593) >>> 0;
    h = ((h << 13) | (h >>> 19)) >>> 0;
  }
  // Final avalanche, so the last characters typed matter as much as the first.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** The unit value of one coordinate: the same one, always, in any browser. */
export function unit(seed: number, coord: string): number {
  // Divided by 2^32 so the result is in [0,1) and never reaches 1, which every
  // consumer relies on when it multiplies by a length.
  return mix(seed, coord) / 4294967296;
}

/**
 * A second value for the same coordinate, when one is not enough.
 *
 * A decimal needs its integer part and its fraction; a pattern needs one value
 * per placeholder. Salting the coordinate keeps each of them a pure function of
 * it, which is what `unit` promises — a counter would not.
 */
export function unitAt(seed: number, coord: string, nth: number): number {
  return nth === 0 ? unit(seed, coord) : unit(seed, `${coord}~${nth}`);
}

/** An integer in `[0, count)` for one coordinate. `count <= 0` gives 0. */
export function pick(seed: number, coord: string, count: number): number {
  if (count <= 0) return 0;
  return Math.floor(unit(seed, coord) * count);
}

/**
 * A seed to start from, or to replace the one in use.
 *
 * Random **here** and nowhere else: asking for another mock is the one moment
 * where unpredictability is the point. Once chosen it is data, saved with the
 * contract, and everything downstream is a pure function of it.
 */
export function newSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
