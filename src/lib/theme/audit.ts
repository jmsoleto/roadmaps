/**
 * Contrast audit of a whole theme.
 *
 * Shared on purpose between the editor's warning panel and `presets.test.ts`:
 * if the two measured different things, a preset could pass its test while the
 * editor called the same colors unreadable.
 */

import { AA, AAA, grade, inkOn, ratio, type Grade } from './contrast';
import { resolveColors } from './resolve';
import type { Theme } from './tokens';

export interface ContrastCheck {
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  grade: Grade;
  /** Whether this pair clears the floor asked for. */
  passes: boolean;
}

/** The floor a theme promises: high contrast themes promise AAA. */
export function floorFor(theme: Theme): number {
  return theme.id.endsWith('-hc') ? AAA : AA;
}

/**
 * Every text/background pair worth checking, including the computed ink over
 * each palette slot — the case a token-only audit would miss entirely.
 */
export function auditTheme(theme: Theme, floor = floorFor(theme)): ContrastCheck[] {
  const c = resolveColors(theme.base, theme.overrides);

  const pairs: [string, string, string][] = [
    ['Texto sobre fondo', c.text, c.bg],
    ['Texto sobre panel', c.text, c.surface],
    ['Texto sobre panel elevado', c.text, c.surface2],
    ['Texto atenuado sobre fondo', c.textDim, c.bg],
    ['Texto atenuado sobre panel', c.textDim, c.surface],
    ['Texto atenuado sobre panel elevado', c.textDim, c.surface2],
    ['Texto medio sobre fondo', c.textMid, c.bg],
    ['Acento sobre fondo', c.accent, c.bg],
    ['Acento sobre panel', c.accent, c.surface],
    ['Peligro sobre fondo', c.danger, c.bg],
    ['Peligro sobre panel', c.danger, c.surface],
    ['Tinta sobre acento', c.inkOnAccent, c.accent],
    ['Tinta sobre peligro', c.inkOnDanger, c.danger],
  ];

  theme.barPalette.forEach((color, slot) => {
    pairs.push([`Tinta sobre barra ${slot + 1}`, inkOn(color, theme.base), color]);
  });

  return pairs.map(([label, fg, bg]) => {
    const value = ratio(fg, bg);
    return { label, fg, bg, ratio: value, grade: grade(value), passes: value >= floor };
  });
}

/** Only the pairs that fall short, which is what the editor warns about. */
export function auditFailures(theme: Theme, floor = floorFor(theme)): ContrastCheck[] {
  return auditTheme(theme, floor).filter((c) => !c.passes);
}
