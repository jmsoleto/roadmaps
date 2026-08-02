/** Generate a reasonably-unique id with a semantic prefix (ported from the original `uid`). */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}
