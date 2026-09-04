/**
 * Theme resolution: base colors -> every token, as plain literals.
 *
 * This is the two-level model from design decision D1. The user picks the nine
 * base colors; everything else is computed here. A derived token follows its
 * base until the user pins it in `overrides`, and follows again when the
 * override is removed.
 *
 * Deliberately computed in TypeScript rather than with CSS `color-mix()` (D2):
 * the editor has to *show* each derived swatch and the contrast validator has
 * to measure it, and neither can be done with an unresolved CSS expression.
 */

import { mix, withAlpha } from './color';
import { inkOn, luminance } from './contrast';
import {
  DERIVED_TOKENS,
  type DerivedToken,
  type ResolvedColors,
  type ResolvedTheme,
  type Theme,
  type ThemeBase,
  type ThemeOverrides,
} from './tokens';

/**
 * Shadows read as dark in light and dark themes alike, so they are not derived
 * from `text` the way overlays are — they come from whichever of the two poles
 * is already dark, pushed the rest of the way to black.
 */
function shadowBase(base: ThemeBase): string {
  const darker = luminance(base.bg) <= luminance(base.text) ? base.bg : base.text;
  return mix(darker, '#000000', 0.6);
}

/**
 * A 40% black shadow that looks right on a near-black background is a smudge on
 * a white one, so shadow opacity eases off as the theme gets lighter. On the
 * dark preset the factor is ~0.998, which leaves the current values intact.
 */
function shadow(base: ThemeBase, alpha: number): string {
  const scale = 1 - 0.5 * luminance(base.bg);
  return withAlpha(shadowBase(base), Math.round(alpha * scale * 1000) / 1000);
}

/**
 * How each derived token is computed from the base colors.
 *
 * Translucent tokens stay translucent on purpose: `hover` has to work over a
 * row, a bar or a panel alike, which a flattened opaque color could not do.
 * Deriving them from `text` is what makes them flip automatically between light
 * and dark themes — on a dark theme `text` is pale and the wash lightens, on a
 * light theme it is near-black and the wash darkens.
 *
 * The three mix amounts below are not round numbers by accident: they are the
 * values that reproduce the current `--panel-2`, `--line` and row-label colors
 * from the dark preset's base, so switching to the token system leaves the
 * existing look untouched (task 2.2).
 */
export const DERIVATIONS: Record<DerivedToken, (base: ThemeBase) => string> = {
  surface2: (b) => mix(b.surface, b.text, 0.038),
  lineWeak: (b) => mix(b.line, b.bg, 0.321),
  textMid: (b) => mix(b.text, b.textDim, 0.26),

  hover: (b) => withAlpha(b.text, 0.04),
  veil: (b) => withAlpha(b.text, 0.012),
  barBorder: (b) => withAlpha(b.text, 0.15),

  washAccent: (b) => withAlpha(b.accent, 0.02),
  tintAccent: (b) => withAlpha(b.accent, 0.09),
  tintAccentSoft: (b) => withAlpha(b.accent, 0.15),
  tintSelected: (b) => withAlpha(b.accent, 0.25),
  tintDanger: (b) => withAlpha(b.danger, 0.12),

  weekend: (b) => withAlpha(b.textDim, 0.14),
  weekendLine: (b) => withAlpha(b.textDim, 0.08),

  shadowSoft: (b) => shadow(b, 0.3),
  shadowMedium: (b) => shadow(b, 0.4),
  shadowStrong: (b) => shadow(b, 0.6),
  scrim: (b) => shadow(b, 0.4),
  overlayBg: (b) => withAlpha(b.bg, 0.65),

  /*
   * El velo del foco de sprint. Del `bg` del tema, como `overlayBg`, así que se
   * inclina hacia el fondo en un tema oscuro y hacia el papel en uno claro sin
   * necesidad de dos fórmulas.
   *
   * El alfa no está elegido a ojo, y sale más bajo de lo que la intuición pide:
   * el contraste se desploma deprisa bajo un velo. En el tema claro, la peor
   * pareja tinta/barra (`#a16207`) parte de 4.92:1, y a 0.26 ya está en 3.07 —
   * el límite que `auditVeiled` fija—. 0.25 es el último valor redondo por
   * debajo de ese techo, y deja algo de margen para que retocar una paleta no
   * rompa el listón de golpe.
   *
   * Subirlo borra el contexto, que es lo que hace útil el foco: el resto del
   * roadmap tiene que seguir leyéndose más bajo, no desaparecer (D9). Y el velo
   * no está solo diciéndolo: la banda del sprint queda sin velar, las demás
   * etiquetas de la cabecera bajan de tono y las filas que no participan se
   * apagan en la columna de nombres.
   */
  sprintVeil: (b) => withAlpha(b.bg, 0.25),

  inkOnAccent: (b) => inkOn(b.accent, b),
  inkOnDanger: (b) => inkOn(b.danger, b),
};

/**
 * Every derived token at its computed value, ignoring overrides.
 *
 * The editor uses this to show what a pinned token *would* be, so "reset" can
 * preview its effect before committing.
 */
export function deriveDefaults(base: ThemeBase): Record<DerivedToken, string> {
  const out = {} as Record<DerivedToken, string>;
  for (const token of DERIVED_TOKENS) out[token] = DERIVATIONS[token](base);
  return out;
}

/** Base colors plus derived tokens, with overrides winning. */
export function resolveColors(base: ThemeBase, overrides: ThemeOverrides = {}): ResolvedColors {
  const derived = deriveDefaults(base);
  for (const token of DERIVED_TOKENS) {
    const pinned = overrides[token];
    if (pinned) derived[token] = pinned;
  }
  return { ...base, ...derived };
}

/** Resolve a whole theme, ready to be written to `:root`. */
export function resolveTheme(theme: Theme): ResolvedTheme {
  return {
    colors: resolveColors(theme.base, theme.overrides),
    geometry: theme.geometry,
    barPalette: theme.barPalette,
  };
}
