/**
 * Lazy migration of stored colors to palette slots (design decision D4).
 *
 * Before theming, phases, items and assignees stored an absolute hex color —
 * always one of `PALETTE_V1`, since the app never offered a free color picker.
 * They now store a slot index instead.
 *
 * The conversion happens at the load boundary rather than as a schema
 * migration, which is possible because the SQLite columns are already `TEXT`
 * and the transport is JSON. One pass covers all four sources of old data:
 * an existing SQLite file, browser `localStorage`, `roadmaps.v1` exports
 * already in the wild, and legacy `roadmap_tool_6_6_2.html` files. The next
 * autosave writes slots and the conversion never runs again.
 */

import { isHex, nearestIndex } from './color';
import { PALETTE_V1 } from './presets';
import { PALETTE_SLOTS } from './tokens';

/** A record as it may arrive from storage: either already migrated, or not. */
type MaybeLegacy = { colorSlot?: unknown; color?: unknown };

/**
 * Resolve one stored color value to a slot index.
 *
 * Anything unrecognizable lands on slot 0 rather than throwing — a roadmap with
 * an odd color is still a roadmap, and refusing to load it would be worse than
 * showing one bar in the wrong color.
 */
export function toSlot(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return wrap(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (isHex(trimmed)) return nearestIndex(trimmed, PALETTE_V1);
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isInteger(parsed)) return wrap(parsed);
  }
  return 0;
}

/** Keep a slot inside the palette, so a stale index can never blank a bar. */
function wrap(slot: number): number {
  const n = slot % PALETTE_SLOTS;
  return n < 0 ? n + PALETTE_SLOTS : n;
}

/** Read the slot of a record that may still carry a legacy `color` field. */
function slotOf(record: MaybeLegacy): number {
  return toSlot(record.colorSlot ?? record.color);
}

/**
 * Normalize every color in a loaded document to a slot, in place.
 *
 * Accepts a loosely-typed value because it runs before the data has earned its
 * `AppData` type, and it is idempotent so it is safe to run on every load.
 */
export function normalizeColors<T>(data: T): T {
  const doc = data as {
    roadmaps?: { rows?: (MaybeLegacy & { children?: MaybeLegacy[] })[] }[];
    assignees?: MaybeLegacy[];
  } | null;
  if (!doc || typeof doc !== 'object') return data;

  for (const roadmap of doc.roadmaps ?? []) {
    for (const phase of roadmap.rows ?? []) {
      normalizeRecord(phase);
      for (const item of phase.children ?? []) normalizeRecord(item);
    }
  }
  for (const assignee of doc.assignees ?? []) normalizeRecord(assignee);

  return data;
}

/** Normalize a single record: set `colorSlot`, drop the legacy `color`. */
export function normalizeRecord(record: MaybeLegacy): void {
  record.colorSlot = slotOf(record);
  delete record.color;
}
