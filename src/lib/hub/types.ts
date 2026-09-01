/**
 * The contract an application fulfils to appear in the hub (design decision D4).
 *
 * The landing knows nothing about roadmaps, decisions, or whatever comes next:
 * it iterates a registry of these. Adding an application is registering an
 * object, not editing the landing.
 *
 * The restriction is the point. Letting each app ship its own card would give
 * total freedom and guarantee that by the fourth one the grid stops reading as
 * a system.
 */

import type { Component } from 'svelte';
import type { AppIdentity } from './identity';

/**
 * How far along an application is.
 *
 * `live` can be entered and contributes real data. `announced` has a name and
 * an identity but no way in yet. `future` is the anonymous marker that more
 * apps fit — it is not a registry entry, the grid appends it.
 */
export type AppState = 'live' | 'announced' | 'future';

/** How loudly a number or an alert asks to be looked at. */
export type Tone = 'neutral' | 'warn' | 'danger';

/** One of the three figures on a card. */
export interface Stat {
  value: number;
  label: string;
  tone: Tone;
}

/** One row of a card's short list. */
export interface Row {
  /** Identifies the target inside its own app; opaque to the landing. */
  id: string;
  /** The swatch at the left. A palette colour, so it follows the theme. */
  color: string;
  label: string;
  /** The right-aligned detail: a slip, a date, a state. */
  meta: string;
  metaTone: Tone;
}

/**
 * A card's short list.
 *
 * The label belongs to the application, not to the landing: the mock reads
 * `ABIERTOS RECIENTEMENTE` for Roadmaps and `TOCA HABLARLAS` for Decisions. If
 * the landing fixed it, the third app would have to pretend its three rows were
 * "recent".
 */
export interface RowList {
  label: string;
  rows: Row[];
  /** Shown in place of the rows when there are none. */
  emptyLabel: string;
}

/** Something that cannot wait, contributed to the strip below the grid. */
export interface Alert {
  id: string;
  text: string;
  /** Where it came from, e.g. "Roadmaps · plan fijado el 02/06". */
  source: string;
  tone: Tone;
}

/** Everything a live application reports about its current state. */
export interface AppSummary {
  stats: [Stat, Stat, Stat];
  list: RowList;
  alerts: Alert[];
}

export interface HubApp {
  id: string;
  name: string;
  tagline: string;
  identity: AppIdentity;
  state: AppState;
  /** What the card's secondary action says. Belongs to the app, not the landing. */
  createLabel: string;
  /** The hash route, for live apps only. */
  route: string | null;
  /**
   * The app's current state, evaluated when the landing paints.
   *
   * A function and not an object on purpose: it reads reactive state, so an
   * object would have to be kept in step and would become a second source of
   * truth for what the store already derives. `null` for anything not live —
   * a card that is not live shows no figures at all, never zeroes.
   */
  summary: (() => AppSummary) | null;
  /**
   * What the shell paints when this application is entered.
   *
   * `null` for anything not live, which is also what makes the shell free of
   * any application's name: it renders the active app's screen, whatever it is.
   */
  root: AppComponent | null;
  /**
   * The second level of the breadcrumb, which belongs to the application.
   *
   * A component and not a string because it is a control, not a label: Roadmaps
   * puts its roadmap switcher there. `null` for an application that has no
   * second level, and the topbar fills the gap itself.
   */
  context: AppComponent | null;
  /**
   * The application's own topbar actions.
   *
   * A function and not an array for the same reason `summary` is one: `disabled`
   * reads reactive state — whether a roadmap is active, whether the store came
   * up — and a fixed array would have to be kept in step with it, becoming a
   * second source of truth.
   */
  actions: (() => AppAction[]) | null;
  /** Enter the app. */
  open: (() => void) | null;
  /** Enter the app with its creation flow already started. */
  create: (() => void) | null;
  /** Open one row of the short list directly, skipping the app's own home. */
  openRow: ((rowId: string) => void) | null;
}

/**
 * A component an application contributes to the shell (design decision D1).
 *
 * No props on purpose. The shell reads these out of the registry, so typing
 * their props would mean the registry knowing what each application needs —
 * exactly the coupling this contract exists to remove. They read their own
 * stores instead, which is what all three already did inside the shell's
 * branches.
 */
export type AppComponent = Component<Record<string, never>>;

/**
 * One action an application contributes to the topbar (D1, D2).
 *
 * Data and not markup. An application says *what* actions it has and what they
 * do; the topbar decides how they look. Letting each one ship its own fragment
 * of the bar would give total freedom and guarantee that by the third the bar
 * stops reading as one bar — the same argument `hub-landing` already makes
 * about the cards.
 *
 * `file` is its own kind rather than a button that happens to open a picker:
 * the shell keeps a single hidden input and points it at whichever action was
 * activated, instead of one input per application.
 */
export type AppAction =
  | { kind: 'button'; label: string; title?: string; disabled?: boolean; run: () => void }
  | {
      kind: 'file';
      label: string;
      title?: string;
      disabled?: boolean;
      /** The picker's filter, e.g. `application/json,.json`. */
      accept: string;
      /** Called with the file's text. Throwing shows the topbar's error. */
      run: (text: string) => void;
    };

/** Severity order for sorting alerts: loudest first. */
const TONE_RANK: Record<Tone, number> = { danger: 0, warn: 1, neutral: 2 };

export function byToneDescending(a: Alert, b: Alert): number {
  return TONE_RANK[a.tone] - TONE_RANK[b.tone];
}
