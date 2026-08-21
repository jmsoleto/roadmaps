/**
 * Project suggestions (design decision D6).
 *
 * `project` is free text and stays free text — no catalogue, no second entity,
 * no foreign key to a roadmap. But free text without suggestions fragments into
 * *Checkout*, *checkout v3* and *Chckout* within a fortnight, and grouping stops
 * meaning anything. Suggesting never blocks: a new project is typed in full.
 */

import type { Decision } from './types';

/**
 * Accent- and case-insensitive comparison key.
 *
 * The same shape `RoadmapSwitcher` uses to filter, and deliberately not the
 * `nameKey` from `util/roadmap-name`, which also strips spaces because it
 * decides whether two names collide. Here spaces have to survive so that typing
 * "pagos market" still finds "Pagos marketplace".
 */
const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Every project already in use, in order of how many decisions carry it. */
export function knownProjects(decisions: Decision[]): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const d of decisions) {
    const label = d.project.trim();
    if (label === '') continue;
    const key = norm(label);
    const seen = counts.get(key);
    // First spelling wins as the label, so suggestions stay stable rather than
    // flipping between two capitalisations of the same project.
    if (seen) seen.n += 1;
    else counts.set(key, { label, n: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .map((c) => c.label);
}

/** Known projects matching what has been typed so far. */
export function suggestProjects(decisions: Decision[], query: string): string[] {
  const q = norm(query);
  const all = knownProjects(decisions);
  if (q === '') return all;
  // An exact match is not worth suggesting: it is already written.
  return all.filter((p) => norm(p).includes(q) && norm(p) !== q);
}
