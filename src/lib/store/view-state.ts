/**
 * How each person looks at the roadmaps, kept apart from what is planned
 * (carpeta-roadmaps, D3).
 *
 * The roadmap that was open last and which phases are folded used to travel
 * inside `AppData`, as `activeId` and `Phase.expanded`. In a single browser
 * that made no difference. In a folder shared through git it would: folding a
 * phase would be a line in somebody's pull request. So both now live in
 * preferences, beside the zoom and the column widths, and the data says only
 * what is planned.
 *
 * Pure: the store does the reading and writing of preferences.
 */

import type { AppData } from '../model/types';

export const PREF_ACTIVE = 'active-id';
export const PREF_COLLAPSED = 'collapsed-phases';

/** What older data carried inside it, lifted out. */
export interface LegacyViewState {
  /** `undefined` when the data said nothing, which is not the same as `null`. */
  activeId: string | null | undefined;
  /** Phases the data had folded, or `undefined` when it said nothing. */
  collapsed: string[] | undefined;
}

/**
 * Take the view state out of data written by an earlier version.
 *
 * Mutates `data` in place, deleting `activeId` and every `expanded`, so that
 * the next save writes the data without them. Nothing here forces that save;
 * it happens on the normal flow, like every other load-time normalization.
 * Idempotent: data that carries neither field comes back as `undefined` twice.
 */
export function liftViewState(data: AppData): LegacyViewState {
  const raw = data as AppData & { activeId?: unknown };
  let activeId: string | null | undefined;
  if ('activeId' in raw) {
    activeId = typeof raw.activeId === 'string' ? raw.activeId : null;
    delete raw.activeId;
  }

  let collapsed: string[] | undefined;
  for (const rm of data.roadmaps) {
    for (const phase of rm.rows) {
      const p = phase as typeof phase & { expanded?: unknown };
      if (!('expanded' in p)) continue;
      collapsed ??= [];
      if (p.expanded === false) collapsed.push(phase.id);
      delete p.expanded;
    }
  }
  return { activeId, collapsed };
}

/** `''` is how a `null` active roadmap is stored, since a preference is a string. */
export function parseActive(raw: string | null): string | null | undefined {
  if (raw === null) return undefined;
  return raw === '' ? null : raw;
}

export function serializeActive(id: string | null): string {
  return id ?? '';
}

/** A missing or unreadable preference is `undefined`: nothing was said. */
export function parseCollapsed(raw: string | null): string[] | undefined {
  if (raw === null) return undefined;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;
  } catch {
    return undefined;
  }
}

export function serializeCollapsed(ids: readonly string[]): string {
  return JSON.stringify([...ids].sort());
}
