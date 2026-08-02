/**
 * Theme token contract (design decision D1).
 *
 * Three layers:
 *  - BASE tokens are the ~9 colors a user actually picks.
 *  - DERIVED tokens are computed from the base ones by `resolveTheme`, so a
 *    theme stays coherent no matter which base colors are chosen. They are the
 *    home of everything that used to be a hardcoded literal (hovers, veils,
 *    accent tints, shadows).
 *  - Geometry tokens are the non-color part of a theme; high contrast needs
 *    solid lines and a visible focus ring, not just different colors (D6).
 *
 * A derived token stops following its base the moment the user overrides it,
 * and follows again when the override is removed.
 */

/** Colors the user picks directly. */
export const BASE_TOKENS = [
  'bg',
  'surface',
  'text',
  'textDim',
  'accent',
  'line',
  'danger',
  'inkLight',
  'inkDark',
] as const;

export type BaseToken = (typeof BASE_TOKENS)[number];

/** Colors computed from the base ones (or pinned by an override). */
export const DERIVED_TOKENS = [
  /** Raised panel, one step away from `surface`. */
  'surface2',
  /** Subtle separator, between `surface` and `line`. */
  'lineWeak',
  /** Translucent hover wash; works over any background. */
  'hover',
  /** Barely-there wash used for alternating rows. */
  'veil',
  /** Lightening edge drawn on top of a bar's own color. */
  'barBorder',
  /** Mid-strength text, between `text` and `textDim`. */
  'textMid',
  /** Accent tints, from faintest to strongest. */
  'washAccent',
  'tintAccent',
  'tintAccentSoft',
  'tintSelected',
  /** Danger tint for destructive affordances. */
  'tintDanger',
  /** Weekend shading and its edges. */
  'weekend',
  'weekendLine',
  /** Shadows, always dark regardless of light/dark theme. */
  'shadowSoft',
  'shadowMedium',
  'shadowStrong',
  /** Full-surface scrim behind the drawer. */
  'scrim',
  /** Translucent background for elements floating over the grid. */
  'overlayBg',
  /**
   * Ink for text sitting on a solid themed color. Same problem as the ink on
   * bars (D3), but the background is a theme token rather than data, so it can
   * be resolved once instead of per element.
   */
  'inkOnAccent',
  'inkOnDanger',
] as const;

/*
 * Text drawn on a *bar* has no token here on purpose: the background is a
 * palette slot the data chose, so the ink is computed per element with
 * `inkOn()` and set inline as `--bar-ink`. See `theme.svelte.ts`.
 */

export type DerivedToken = (typeof DERIVED_TOKENS)[number];

export type ColorToken = BaseToken | DerivedToken;

export const COLOR_TOKENS: readonly ColorToken[] = [...BASE_TOKENS, ...DERIVED_TOKENS];

/** Non-color part of a theme (D6). */
export interface ThemeGeometry {
  /** Border width in px for separators. High contrast raises this to 2. */
  lineWidth: number;
  /** Focus ring width in px. */
  focusRing: number;
  /** Bar corner radius in px. */
  barRadius: number;
}

export const DEFAULT_GEOMETRY: ThemeGeometry = {
  lineWidth: 1,
  focusRing: 2,
  barRadius: 5,
};

/** Number of slots in a theme's bar palette. Fixed across all themes. */
export const PALETTE_SLOTS = 10;

/** The colors a user picks. */
export type ThemeBase = Record<BaseToken, string>;

/** Sparse map of derived tokens the user has pinned by hand. */
export type ThemeOverrides = Partial<Record<DerivedToken, string>>;

/** A theme as stored and exported. */
export interface Theme {
  id: string;
  name: string;
  /** Built-in themes are immutable: they can be selected and duplicated, not edited (D5). */
  builtin: boolean;
  base: ThemeBase;
  overrides: ThemeOverrides;
  geometry: ThemeGeometry;
  /** Exactly `PALETTE_SLOTS` colors, indexed by `colorSlot` on phases/items/assignees. */
  barPalette: string[];
}

/** Every color token with a concrete literal value, ready to write to `:root`. */
export type ResolvedColors = Record<ColorToken, string>;

export interface ResolvedTheme {
  colors: ResolvedColors;
  geometry: ThemeGeometry;
  barPalette: string[];
}

/**
 * CSS custom property name for each token.
 *
 * Kept explicit rather than derived from the key so renaming a token is a
 * deliberate, greppable act.
 */
export const CSS_VAR: Record<ColorToken, string> = {
  bg: '--bg',
  surface: '--surface',
  text: '--text',
  textDim: '--text-dim',
  accent: '--accent',
  line: '--line',
  danger: '--danger',
  inkLight: '--ink-light',
  inkDark: '--ink-dark',
  surface2: '--surface-2',
  lineWeak: '--line-weak',
  hover: '--hover',
  veil: '--veil',
  barBorder: '--bar-border',
  textMid: '--text-mid',
  washAccent: '--wash-accent',
  tintAccent: '--tint-accent',
  tintAccentSoft: '--tint-accent-soft',
  tintSelected: '--tint-selected',
  tintDanger: '--tint-danger',
  weekend: '--weekend',
  weekendLine: '--weekend-line',
  shadowSoft: '--shadow-soft',
  shadowMedium: '--shadow-medium',
  shadowStrong: '--shadow-strong',
  scrim: '--scrim',
  overlayBg: '--overlay-bg',
  inkOnAccent: '--ink-on-accent',
  inkOnDanger: '--ink-on-danger',
};

/** CSS custom property name for each geometry token. */
export const CSS_VAR_GEOMETRY: Record<keyof ThemeGeometry, string> = {
  lineWidth: '--line-width',
  focusRing: '--focus-ring',
  barRadius: '--bar-radius',
};

/** Human-readable labels for the theme editor. */
export const BASE_LABELS: Record<BaseToken, string> = {
  bg: 'Fondo',
  surface: 'Paneles',
  text: 'Texto',
  textDim: 'Texto atenuado',
  accent: 'Acento',
  line: 'Líneas',
  danger: 'Peligro',
  inkLight: 'Tinta clara (sobre barras)',
  inkDark: 'Tinta oscura (sobre barras)',
};
