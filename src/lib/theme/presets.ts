/**
 * The four built-in themes (design decision D5).
 *
 * These live in code, not storage. They cannot be edited — creating a theme of
 * your own is an explicit "new" or "duplicate" — so there is always a known-good
 * theme to fall back to if a custom one turns out to be unreadable.
 *
 * `presets.test.ts` holds them to their promise: AA for light and dark, AAA for
 * the two high-contrast ones, including the ink on every palette slot.
 */

import { DEFAULT_GEOMETRY, type Theme, type ThemeGeometry } from './tokens';

/**
 * The palette the app shipped with, from `config.ts`.
 *
 * Kept under its own name because the lazy migration (D4) needs it to map
 * legacy hex colors back to slots, and keeping it around is also what makes
 * that migration reversible in principle.
 */
export const PALETTE_V1 = [
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

/** Deeper colors, so bars keep their weight against a white background. */
const PALETTE_LIGHT = [
  '#0e7490',
  '#c2410c',
  '#a21caf',
  '#1d4ed8',
  '#b91c1c',
  '#15803d',
  '#a16207',
  '#6d28d9',
  '#be185d',
  '#047857',
];

/** Bright enough that dark ink clears AAA on every slot. */
const PALETTE_HC_DARK = [
  '#7ceaf7',
  '#ffc182',
  '#f3b8ff',
  '#a9caff',
  '#ffb3b3',
  '#9df0b8',
  '#fde68a',
  '#cfc2fd',
  '#fbb6d5',
  '#8ee9c4',
];

/** Dark enough that white ink clears AAA on every slot. */
const PALETTE_HC_LIGHT = [
  '#0b4a5e',
  '#7c2d12',
  '#6b0f6e',
  '#16307d',
  '#7f1d1d',
  '#14532d',
  '#5c3410',
  '#432099',
  '#7a123f',
  '#0a4436',
];

const HC_GEOMETRY: ThemeGeometry = { lineWidth: 2, focusRing: 3, barRadius: 3 };

/**
 * The look the app had before the theme system existed. Its base colors are the
 * literal values from the old `:root` block, and the derivation constants in
 * `resolve.ts` were calibrated so the computed tokens land on the old literals.
 */
const dark: Theme = {
  id: 'dark',
  name: 'Oscuro',
  builtin: true,
  base: {
    bg: '#0b0d10',
    surface: '#13161b',
    text: '#e8ecf1',
    // Was #7a828f. That value reads 4.41:1 against the raised panel, just under
    // AA; this is the smallest nudge that clears 4.5:1, two units per channel.
    textDim: '#7c8491',
    accent: '#22d3ee',
    line: '#2b323b',
    danger: '#f87171',
    inkLight: '#ffffff',
    inkDark: '#0b0d10',
  },
  overrides: {},
  geometry: DEFAULT_GEOMETRY,
  barPalette: [...PALETTE_V1],
};

const light: Theme = {
  id: 'light',
  name: 'Claro',
  builtin: true,
  base: {
    bg: '#ffffff',
    surface: '#f3f5f8',
    text: '#11151a',
    textDim: '#5b6472',
    accent: '#0e7490',
    line: '#ccd3dc',
    danger: '#c2261f',
    inkLight: '#ffffff',
    inkDark: '#0b0d10',
  },
  overrides: {},
  geometry: DEFAULT_GEOMETRY,
  barPalette: PALETTE_LIGHT,
};

/**
 * High contrast is not "the dark theme, louder". The washes that separate rows
 * at 1.2% opacity simply vanish at this level, so they are overridden into
 * something that actually reads, and `lineWeak` collapses onto `line` so every
 * separation is a solid rule (D6).
 */
const darkHighContrast: Theme = {
  id: 'dark-hc',
  name: 'Oscuro alto contraste',
  builtin: true,
  base: {
    bg: '#000000',
    surface: '#0c0e11',
    text: '#ffffff',
    textDim: '#c9cfd8',
    accent: '#5ee7fb',
    line: '#8e97a3',
    danger: '#ff9a9a',
    inkLight: '#ffffff',
    inkDark: '#000000',
  },
  overrides: {
    lineWeak: '#8e97a3',
    hover: 'rgba(255, 255, 255, 0.14)',
    veil: 'rgba(255, 255, 255, 0.07)',
    barBorder: 'rgba(255, 255, 255, 0.45)',
    weekend: 'rgba(201, 207, 216, 0.2)',
    weekendLine: 'rgba(201, 207, 216, 0.35)',
  },
  geometry: HC_GEOMETRY,
  barPalette: PALETTE_HC_DARK,
};

const lightHighContrast: Theme = {
  id: 'light-hc',
  name: 'Claro alto contraste',
  builtin: true,
  base: {
    bg: '#ffffff',
    surface: '#f2f4f7',
    text: '#000000',
    textDim: '#33383f',
    accent: '#00566a',
    line: '#4a5058',
    danger: '#9b1c1c',
    inkLight: '#ffffff',
    inkDark: '#000000',
  },
  overrides: {
    lineWeak: '#4a5058',
    hover: 'rgba(0, 0, 0, 0.12)',
    veil: 'rgba(0, 0, 0, 0.06)',
    barBorder: 'rgba(0, 0, 0, 0.4)',
    weekend: 'rgba(51, 56, 63, 0.16)',
    weekendLine: 'rgba(51, 56, 63, 0.32)',
  },
  geometry: HC_GEOMETRY,
  barPalette: PALETTE_HC_LIGHT,
};

export const PRESETS: readonly Theme[] = [dark, light, darkHighContrast, lightHighContrast];

/** Theme used when nothing has been chosen yet. */
export const DEFAULT_PRESET_ID = 'dark';

export function findPreset(id: string): Theme | undefined {
  return PRESETS.find((t) => t.id === id);
}

/** Bar palettes offered as a starting point in the theme editor. */
export const PALETTE_PRESETS: readonly { id: string; name: string; colors: string[] }[] = [
  { id: 'vivid', name: 'Vivos', colors: [...PALETTE_V1] },
  { id: 'deep', name: 'Profundos', colors: PALETTE_LIGHT },
  { id: 'bright', name: 'Brillantes', colors: PALETTE_HC_DARK },
  { id: 'ink', name: 'Tinta', colors: PALETTE_HC_LIGHT },
];
