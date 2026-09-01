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
