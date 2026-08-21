/**
 * Usage traces the landing needs and the data model deliberately does not carry
 * (design decision D6).
 *
 * The obvious home for "when was this roadmap last opened" is a field on
 * `Roadmap`. It is the wrong one: `Roadmap` is what gets exported, so local
 * usage would travel inside the JSON of a plan, and `data-portability` would
 * have to decide whether to import it (absurd) or ignore it (a field that
 * exists and means nothing).
 *
 * So it rides the preference seam instead, and the model is not touched.
 *
 * Everything here is pure; the store wiring is in `usage.svelte.ts`.
 */

/** One roadmap opening. `at` is epoch milliseconds. */
export interface RecentEntry {
  id: string;
  at: number;
}

/**
 * How many openings are kept.
 *
 * More than the three the card shows, so that deleting a roadmap or filtering
 * out ids that died still leaves the list full.
 */
export const RECENT_MAX = 12;

/** Record an opening: newest first, no duplicates, pruned to `RECENT_MAX`. */
export function touchRecent(entries: RecentEntry[], id: string, at: number): RecentEntry[] {
  return [{ id, at }, ...entries.filter((e) => e.id !== id)].slice(0, RECENT_MAX);
}

/**
 * Drop entries whose roadmap no longer exists.
 *
 * Done on read rather than on delete, on purpose: nothing has to stay in step
 * with `deleteRoadmap`, and a stale id costs one comparison instead of a
 * synchronisation bug.
 */
export function liveRecent(entries: RecentEntry[], liveIds: Iterable<string>): RecentEntry[] {
  const live = new Set(liveIds);
  return entries.filter((e) => live.has(e.id));
}

/** Parse the stored preference, tolerating anything that is not what we wrote. */
export function parseRecent(raw: string | null): RecentEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is RecentEntry =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as RecentEntry).id === 'string' &&
          typeof (e as RecentEntry).at === 'number',
      )
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export function serializeRecent(entries: RecentEntry[]): string {
  return JSON.stringify(entries);
}

/** Parse the stored last-access stamp, or `null` when there has never been one. */
export function parseStamp(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
