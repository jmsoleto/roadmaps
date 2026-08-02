/**
 * WCAG contrast math.
 *
 * Two jobs. `ratio`/`grade` power the theme editor's warnings and the test that
 * keeps the four presets honest. `inkOn` solves the problem no token can (D3):
 * the text drawn on top of a bar sits over a color the *data* chose, not the
 * theme, so its ink has to be computed rather than declared.
 */

import { parseHex } from './color';

/** Minimum contrast ratio for WCAG AA on normal text. */
export const AA = 4.5;
/** Minimum contrast ratio for WCAG AAA on normal text. */
export const AAA = 7;

export type Grade = 'AAA' | 'AA' | 'fail';

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(color: string): number {
  const { r, g, b } = parseHex(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colors, from 1:1 to 21:1. */
export function ratio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Grade a contrast ratio for normal-size text. */
export function grade(value: number): Grade {
  if (value >= AAA) return 'AAA';
  if (value >= AA) return 'AA';
  return 'fail';
}

export interface Inks {
  inkLight: string;
  inkDark: string;
}

/**
 * Pick the theme ink that reads best on `bg`.
 *
 * Chooses by actual contrast ratio rather than a fixed luminance threshold, so
 * it stays correct for themes whose inks are not near-black and near-white.
 */
export function inkOn(bg: string, inks: Inks): string {
  return ratio(bg, inks.inkDark) >= ratio(bg, inks.inkLight) ? inks.inkDark : inks.inkLight;
}
