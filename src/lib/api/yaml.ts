/**
 * A YAML emitter for exactly the documents this application produces (D1).
 *
 * Not a general one, on purpose. What goes through here is objects, arrays,
 * strings, numbers and booleans — no anchors, no tags, no dates, no complex
 * keys, no multi-document. Pulling in a YAML library would be the project's
 * first runtime dependency, to serialise a tree whose shape we already know
 * exactly.
 *
 * The only hard part is **when to quote**. A plain scalar that YAML would read
 * as something else does not fail: it parses, into the wrong value, and shows
 * up weeks later as a field that is `true` instead of `"true"`. That is why
 * `needsQuotes` is conservative and why `yaml.test.ts` carries a table of
 * ambiguous cases and a round trip through a real parser.
 */

export type YamlValue =
  string | number | boolean | null | undefined | YamlValue[] | { [k: string]: YamlValue };

/**
 * Whether a string has to be quoted to survive a round trip.
 *
 * Each clause is a way YAML would read the text as something other than that
 * text:
 *
 *  - empty, or padded with whitespace, which a plain scalar would lose
 *  - starting with an indicator, which would begin a sequence, a mapping, a
 *    comment, an anchor, a block scalar…
 *  - carrying `: ` or ` #`, which end a plain scalar mid-string
 *  - carrying a line break or a tab
 *  - spelling a boolean, a null or a number in any casing
 *
 * Commas are deliberately absent: they only matter inside flow collections,
 * and nothing here emits one except the empty `{}` and `[]`. Quoting them
 * would put quotes around most comments a person writes.
 */
function needsQuotes(s: string): boolean {
  return (
    s === '' ||
    /^\s|\s$/.test(s) ||
    /^[-?:,[\]{}#&*!|>'"%@`]/.test(s) ||
    s.includes(': ') ||
    s.includes(' #') ||
    s.endsWith(':') ||
    /[\n\r\t]/.test(s) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(s) ||
    /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) ||
    /^0[xob]/i.test(s)
  );
}

/** One scalar, quoted only when leaving it bare would change what it means. */
export function scalar(value: YamlValue): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const s = String(value);
  // Double-quoted style, whose escapes are the ones `JSON.stringify` produces.
  return needsQuotes(s) ? JSON.stringify(s) : s;
}

/** A key stays bare while it is made of the characters a path or a name uses. */
function key(k: string): string {
  return /^[A-Za-z0-9_.\-/]+$/.test(k) ? k : JSON.stringify(k);
}

const isCollection = (v: YamlValue): v is YamlValue[] | { [k: string]: YamlValue } =>
  v !== null && v !== undefined && typeof v === 'object';

/**
 * Emit one value at the given indent.
 *
 * A collection returns a **leading newline** and its lines already indented,
 * so a caller writes `key:` and appends this. A scalar returns just itself.
 */
function emit(value: YamlValue, indent: number): string {
  const pad = '  '.repeat(indent);
  if (!isCollection(value)) return scalar(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return (
      '\n' +
      value
        .map((item) => {
          if (!isCollection(item)) return `${pad}- ${scalar(item)}`;
          const inner = emit(item, indent + 1).replace(/^\n/, '');
          if (inner === '{}' || inner === '[]') return `${pad}- ${inner}`;
          // The dash sits where the item's first line would have started, and
          // the rest keeps its own indent — which lines up, because the item
          // was emitted one level deeper. This is where a naive emitter breaks.
          const lines = inner.split('\n');
          const head = lines[0].slice('  '.repeat(indent + 1).length);
          const tail = lines.length > 1 ? '\n' + lines.slice(1).join('\n') : '';
          return `${pad}- ${head}${tail}`;
        })
        .join('\n')
    );
  }

  const keys = Object.keys(value);
  if (keys.length === 0) return '{}';
  return (
    '\n' +
    keys
      .map((k) => {
        const v = value[k];
        if (!isCollection(v)) return `${pad}${key(k)}: ${scalar(v)}`;
        const inner = emit(v, indent + 1);
        // An empty collection is written inline; anything else opens a block.
        return inner === '{}' || inner === '[]'
          ? `${pad}${key(k)}: ${inner}`
          : `${pad}${key(k)}:${inner}`;
      })
      .join('\n')
  );
}

/** A whole document, with its trailing newline. */
export function toYaml(value: YamlValue): string {
  const body = emit(value, 0).replace(/^\n/, '');
  return `${body}\n`;
}
