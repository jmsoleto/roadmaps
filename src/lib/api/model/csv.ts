/**
 * The round trip between a list and the comma-separated box that edits it (D7).
 *
 * `enums` and `tags` are `string[]` in the document, because the exporter wants
 * a list and not a string it has to split again. The control stays a text box
 * with commas, because typing three values separated by commas is faster than
 * three clicks — and this is where the stray spaces and the trailing comma get
 * absorbed.
 */

/** `"alta, baja , pendiente,"` → `['alta', 'baja', 'pendiente']`. */
export function parseList(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/**
 * `['alta', 'baja']` → `"alta, baja"`.
 *
 * Not the exact inverse of `parseList`, and it must not be: the text is
 * regenerated from the list every time the field is redrawn, so a trailing
 * comma the user typed disappears the moment they leave the box. That is the
 * cost of keeping the list canonical, and it is the right side to lose on.
 */
export function formatList(values: readonly string[]): string {
  return values.join(', ');
}

/**
 * Whether an enumeration is made of numbers, deduced from its own values (D3).
 *
 * There is no control for this, and that is the decision. The alternatives were
 * a second picker — «enum of integer», like «array of integer» — which costs a
 * third fixed control in a row where the comment is the only thing that grows
 * and the comment is the point of the tool; or an enumeration that can only be
 * text, which leaves the numeric case living in the advanced strip and the
 * discoverable path unable to say it. Deducing keeps the row the same shape it
 * already has for `array` and `ref`, and spares anybody having to pick
 * `integer` *before* knowing they were going to enumerate.
 *
 * The rule is the **exact round trip**, and every value has to survive it:
 * `Number('01')` is a perfectly valid `1`, so a looser test would deliver `1`
 * where somebody agreed `01`. That is not a mistyped schema, it is an agreed
 * value changed in silence — and codes with leading zeros, phone prefixes and
 * amounts with a trailing zero are exactly the vocabulary of the contracts this
 * application exists to write down.
 *
 * The known cost (D5): `['2026', '2027']` is numeric here. A list of years is a
 * list of numbers, and nothing in it says it was meant as text. Telling them
 * apart needs either that second picker or syntax to learn, and syntax is worse
 * in something used while somebody is still talking.
 */
export function enumIsNumeric(values: readonly string[]): boolean {
  return values.length > 0 && values.every((v) => String(Number(v)) === v);
}

/**
 * One admitted value, with the type its list deduced.
 *
 * The value is checked against the round trip too, and not just its list. The
 * caller may hand over an example somebody typed by hand that is **not** in the
 * list — nothing stops them today, and catching that is a separate warning over
 * a hole that already exists — and `Number('fuera')` is `NaN`, which has no
 * business reaching a document somebody is going to be handed.
 */
export function enumValue(value: string, values: readonly string[]): string | number {
  return enumIsNumeric(values) && String(Number(value)) === value ? Number(value) : value;
}

/**
 * The whole list, with the type it deduced.
 *
 * A fresh array every time: this feeds a document that gets serialised, and
 * handing out the node's own array would let a caller mutate the contract.
 */
export function enumValues(values: readonly string[]): (string | number)[] {
  return enumIsNumeric(values) ? values.map(Number) : [...values];
}
