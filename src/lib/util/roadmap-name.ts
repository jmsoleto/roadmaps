/**
 * Comparison key for roadmap names (roadmap-editor).
 *
 * Two roadmaps may not be *created* with the same name, where "same" ignores
 * case, diacritics and every space — inner ones included. So "Plataforma Q1",
 * "plataforma q1" and "PlataformaQ1" all collapse to one key and only the first
 * of them can exist.
 *
 * This normalizes **only to compare**. The stored name is always the literal
 * text the user typed, accents and capitals intact.
 *
 * `RoadmapSwitcher.svelte` has a near-identical `norm()` for filtering its
 * list. The two are deliberately NOT shared: the filter keeps spaces so that
 * typing "plan q" still finds "Plan Q1". Same shape, different reasons.
 */
export function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}
