/**
 * Visual identity of an application (design decisions D2 and D3).
 *
 * Two colour identities live in this app and they must not be confused:
 *
 *  - The **theme accent** (`--accent`), which the user picks and which governs
 *    primary buttons, focus, the container's wordmark and the grid's markers.
 *  - The **application identity** below: a fixed gradient pair per app, which
 *    governs only its icon and its dot, wherever the app shows up.
 *
 * The pair is deliberately *not* a theme token. An app's colour is how it is
 * recognised, not an aesthetic preference, so theming the app red must leave
 * the Roadmaps tile cyan. That is also what makes the contrast of these pairs
 * checkable once, over a closed catalog, instead of on every custom theme.
 *
 * These values are literals rather than `var(--…)` for the same reason: there
 * is no theme they should follow.
 */

/** Which mark is carved into the tile. The shapes live in `AppIcon.svelte`. */
export type AppGlyph = 'roadmaps' | 'decisions' | 'api' | 'future';

export interface AppIdentity {
  glyph: AppGlyph;
  /** Gradient start, top-left under `linear-gradient(145deg, …)`. */
  from: string;
  /** Gradient end, bottom-right. */
  to: string;
}

/**
 * The ink of the carved glyph. A fixed dark literal, never `var(--bg)` (D2).
 *
 * The temptation is to read the mock's `#0b0d10` as "the ink is the theme's
 * background", because in the dark preset it happens to be exactly that. It is
 * not: under a light theme `--bg` is light, and a light glyph over a saturated
 * cyan gradient loses its contrast at precisely the size where the icon has to
 * work — 18px, in the app switcher.
 *
 * Every pair in `APP_IDENTITIES` is verified against this ink in
 * `identity.test.ts`.
 */
export const GLYPH_INK = '#0b0d10';

/**
 * The closed catalog of identities.
 *
 * `future` is the anonymous placeholder for "more apps fit here". It carries a
 * pair so the marker is drawn from the same system, but it names no app.
 */
export const APP_IDENTITIES = {
  roadmaps: { glyph: 'roadmaps', from: '#22D3EE', to: '#60A5FA' },
  decisions: { glyph: 'decisions', from: '#A78BFA', to: '#E879F9' },
  api: { glyph: 'api', from: '#FBBF24', to: '#FB7185' },
  future: { glyph: 'future', from: '#4ADE80', to: '#FACC15' },
} as const satisfies Record<string, AppIdentity>;

/** Every registered pair, for the one-off contrast check. */
export const IDENTITY_CATALOG: readonly AppIdentity[] = Object.values(APP_IDENTITIES);

/** The tile's gradient, as a CSS value. */
export function tileGradient(identity: AppIdentity): string {
  return `linear-gradient(145deg, ${identity.from}, ${identity.to})`;
}
