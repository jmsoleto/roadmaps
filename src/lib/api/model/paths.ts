/**
 * The `{markers}` in an endpoint's path.
 *
 * OpenAPI requires every path marker to exist as a required `path` parameter,
 * and nobody writing a route in a meeting is going to declare them by hand. The
 * export fills them in — but a behaviour that only shows up in the exported
 * file is a behaviour nobody knows about, so the editor uses this to say on
 * screen which markers already count.
 */

/** The marker names in a path, in order, without duplicates. */
export function pathMarkers(path: string): string[] {
  const found = [...path.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1].trim()).filter((n) => n !== '');
  return [...new Set(found)];
}

/** The markers nobody has declared as a `path` parameter. */
export function undeclaredMarkers(
  path: string,
  params: readonly { in: string; name: string }[],
): string[] {
  const declared = new Set(
    params.filter((p) => p.in === 'path' && p.name.trim() !== '').map((p) => p.name.trim()),
  );
  return pathMarkers(path).filter((name) => !declared.has(name));
}
