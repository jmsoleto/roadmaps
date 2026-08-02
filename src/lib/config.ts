/** Visual + interaction constants ported from roadmap_tool_6_6_2.html. */

/** Row height in pixels. */
export const ROW_H = 52;

/** Available zoom levels, in pixels per day. */
export const ZOOM_LEVELS = [4, 6, 8, 12, 18, 26] as const;

/** Default zoom level (8 px/day), matching the original. */
export const DEFAULT_DAY_W = 8;

/** Bar/dot color palette. */
export const PALETTE = [
  '#22D3EE',
  '#FB923C',
  '#E879F9',
  '#60A5FA',
  '#F87171',
  '#4ADE80',
  '#FACC15',
  '#A78BFA',
  '#F472B6',
  '#34D399',
] as const;

/** Sprint length in days (bi-weekly). */
export const SPRINT_LEN = 14;

/**
 * Absolute sprint anchor: Sprint 09 starts Monday 2026-06-29.
 * Sprints are always 14 days with no renumbering, so this anchor fixes the
 * numbering for every roadmap regardless of its own start date.
 */
export const SPRINT_ANCHOR_DATE = '2026-06-29';
export const SPRINT_ANCHOR_NUM = 9;
