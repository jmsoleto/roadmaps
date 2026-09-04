/**
 * Contrast audit of a whole theme.
 *
 * Shared on purpose between the editor's warning panel and `presets.test.ts`:
 * if the two measured different things, a preset could pass its test while the
 * editor called the same colors unreadable.
 */

import { composite } from './color';
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

/**
 * El listón de lo que está bajo el velo del foco de sprint.
 *
 * No es el de un texto que se está leyendo, y no debe serlo: lo atenuado es
 * contexto, y su trabajo es dejarse ver, no competir. 3:1 es el mismo umbral con
 * el que WCAG mide un componente de interfaz o un texto grande, y es el punto
 * por debajo del cual el velo dejaría de atenuar para empezar a borrar (D9).
 */
export const VEILED_FLOOR = 3;

/**
 * El contraste de lo que queda bajo el velo, en el sitio donde importa: la
 * rejilla. El velo se tiende sobre `.rows`, así que lo que atenúa son las barras
 * y su tinta, no la columna de nombres —que vive por encima de él— ni el panel.
 */
export function auditVeiled(theme: Theme, floor = VEILED_FLOOR): ContrastCheck[] {
  const c = resolveColors(theme.base, theme.overrides);
  const alpha = alphaOf(c.sprintVeil);
  const veiled = (color: string) => composite(theme.base.bg, color, alpha);

  return theme.barPalette.map((slot, i) => {
    const fg = veiled(inkOn(slot, theme.base));
    const bg = veiled(slot);
    const value = ratio(fg, bg);
    return {
      label: `Tinta velada sobre barra ${i + 1}`,
      fg,
      bg,
      ratio: value,
      grade: grade(value),
      passes: value >= floor,
    };
  });
}

/** El alfa de un `rgba(...)` resuelto, que es como se guarda un token translúcido. */
function alphaOf(rgba: string): number {
  const m = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(rgba);
  return m ? Number(m[1]) : 1;
}

/** Only the pairs that fall short, which is what the editor warns about. */
export function auditFailures(theme: Theme, floor = floorFor(theme)): ContrastCheck[] {
  return auditTheme(theme, floor).filter((c) => !c.passes);
}
