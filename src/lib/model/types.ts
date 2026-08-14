/**
 * Canonical data model for the roadmaps app.
 *
 * Ported and formalized from `roadmap_tool_6_6_2.html`, with one deliberate
 * change (design decision D2): dates are stored as absolute ISO calendar days
 * (`YYYY-MM-DD`), not as integer offsets from a hardcoded 2026-01-01 origin.
 * Day<->date conversion lives in `../time/timeline.ts` and is always relative
 * to a roadmap's own configurable `startDate`.
 */

/** An absolute calendar day in ISO `YYYY-MM-DD` form (no time, no timezone). */
export type IsoDate = string;

/**
 * A person a phase or item can be assigned to. Assignees are global.
 *
 * `colorSlot` indexes the active theme's bar palette rather than naming a color
 * outright (theming, design decision D4), which is what lets a change of theme
 * recolor everything that already exists.
 */
export interface Assignee {
  id: string;
  name: string;
  /** Position in the active theme's bar palette. */
  colorSlot: number;
}

/**
 * Something outside the roadmap that stops items from being completed, and who
 * to chase about it. Blockers are global: one entry serves every roadmap.
 *
 * Distinct from `Item.dependsOn`, which is an intra-phase predecessor and moves
 * dates. A blocker never moves anything — it describes why work can't finish.
 */
export interface Blocker {
  id: string;
  /** The area or team that owes something, e.g. "Checkout". */
  name: string;
  /**
   * Who to chase. Free text, deliberately *not* an `Assignee` id: whoever
   * blocks you usually sits outside the team that edits the roadmap.
   */
  owner: string;
  /** Optional contact address; empty string when not given. */
  email: string;
}

/**
 * One item's wait on one blocker, naming what it is waiting for.
 *
 * `resolved` lives here rather than on the `Blocker` or on a shared deliverable
 * (design decision D2): each assignment is resolved on its own. Assignments that
 * describe the same real wait are reconciled by offer, never automatically —
 * see `equivalenceKey` in `./blockers.ts`.
 */
export interface ItemBlocker {
  id: string;
  blockerId: string;
  /** The concrete thing expected, e.g. "Creación de formulario de compra". */
  feature: string;
  resolved: boolean;
}

/** A leaf of work inside a phase. A milestone is an item with start === end. */
export interface Item {
  id: string;
  label: string;
  /** Position in the active theme's bar palette. */
  colorSlot: number;
  startDate: IsoDate;
  endDate: IsoDate;
  assigneeId: string | null;
  notes: string;
  /** Ids of items this item depends on (predecessors). */
  dependsOn: string[];
  /** External waits on this item. Never affects its dates. */
  blockers: ItemBlocker[];
  isMilestone: boolean;
  /**
   * The day the work was closed, or `null` when it is not done.
   *
   * There is deliberately no accompanying boolean (design decision D2): a
   * `completed` flag beside a date admits two states that mean nothing —
   * completed with no date, and a date that does not count — and every loader,
   * importer and mutation would have to defend against both. Absence *is* the
   * unfinished state, so those states cannot be written.
   *
   * A completed item is frozen in time: see `../store/app.svelte.ts` and
   * `enforceConstraints` in `./constraints.ts`.
   */
  completedDate: IsoDate | null;
  /**
   * The `endDate` this item carried at the instant it was completed.
   *
   * Snapshotted so later drags cannot rewrite what was measured. On its own it
   * is a weak signal — whoever runs late drags the bar before ticking the box,
   * and the slip against it comes out zero — which is exactly why it is paired
   * with `baselineEnd` (D6).
   */
  endAtCompletion: IsoDate | null;
  /**
   * The planned end captured when the roadmap's plan was fixed, or `null`.
   *
   * `null` is not "unmeasured": it means the item did not exist when the plan
   * was committed, so it is scope added afterwards (D5). Nothing captures this
   * automatically — an item is born at a filler position (`addItem`), and a
   * baseline taken there would measure drift against a made-up number.
   */
  baselineEnd: IsoDate | null;
}

/** A collapsible group of items. May optionally carry its own date extent. */
export interface Phase {
  id: string;
  name: string;
  /** Position in the active theme's bar palette. */
  colorSlot: number;
  expanded: boolean;
  assigneeId: string | null;
  notes: string;
  /** Optional explicit phase span; when absent it is derived from children. */
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  children: Item[];
}

/** A single roadmap with its own configurable timeline window (D2 / timeline-config). */
export interface Roadmap {
  id: string;
  name: string;
  /** First day of the visible timeline window for this roadmap. */
  startDate: IsoDate;
  /** Length of the visible timeline window, in days. */
  windowDays: number;
  rows: Phase[];
  /**
   * The day the plan was fixed, or `null` when it never was.
   *
   * Fixing the plan copies every item's `endDate` into its `baselineEnd` (D5).
   * It is repeatable, and repeating it restarts the accumulated drift.
   */
  baselineDate: IsoDate | null;
}

/** The full persisted application state. */
export interface AppData {
  roadmaps: Roadmap[];
  assignees: Assignee[];
  /** Global blocker catalog, shared by every roadmap. */
  blockers: Blocker[];
  activeId: string | null;
}

/** Defaults applied to roadmaps that don't specify a timeline (timeline-config). */
export const DEFAULT_WINDOW_DAYS = 730;
