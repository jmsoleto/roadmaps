/**
 * Color primitives for the theme engine.
 *
 * Mixing happens in Oklab (design decision D2) so that a step of the same size
 * looks the same whether the theme is light or dark — the property that lets a
 * single set of derivation formulas serve every preset.
 *
 * Everything here is pure and hex-in/hex-out, so `resolveTheme` can emit plain
 * literals instead of `color-mix()` expressions the editor could not inspect.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Oklab {
  L: number;
  a: number;
  b: number;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** True when `value` is a hex color this module can parse. */
export function isHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

/**
 * Parse a hex color. Accepts `#rgb`, `#rrggbb` and `#rrggbbaa` (alpha is
 * dropped — themes carry opacity in the derivation, not in the base colors).
 */
export function parseHex(value: string): Rgb {
  const m = HEX_RE.exec(value.trim());
  if (!m) throw new Error(`invalid hex color: ${value}`);
  let hex = m[1];
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Serialize to `#rrggbb`, lowercase. */
export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** `rgba(...)` string with the given alpha, keeping the color's channels. */
export function withAlpha(color: string, alpha: number): string {
  const { r, g, b } = parseHex(color);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${round(a, 4)})`;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** sRGB (0-255) to Oklab. */
export function rgbToOklab({ r, g, b }: Rgb): Oklab {
  const lr = toLinear(r / 255);
  const lg = toLinear(g / 255);
  const lb = toLinear(b / 255);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Oklab back to sRGB (0-255), clamped to gamut. */
export function oklabToRgb({ L, a, b }: Oklab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: clamp255(toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255),
    g: clamp255(toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255),
    b: clamp255(toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255),
  };
}

/**
 * Blend `to` into `from` by `amount` (0 = `from`, 1 = `to`), in Oklab.
 * Returns an opaque hex color.
 */
export function mix(from: string, to: string, amount: number): string {
  const t = Math.max(0, Math.min(1, amount));
  const A = rgbToOklab(parseHex(from));
  const B = rgbToOklab(parseHex(to));
  return toHex(
    oklabToRgb({
      L: A.L + (B.L - A.L) * t,
      a: A.a + (B.a - A.a) * t,
      b: A.b + (B.b - A.b) * t,
    }),
  );
}

/**
 * Perceptual distance between two colors in Oklab.
 *
 * Used to snap a legacy hex color to the nearest palette slot during the lazy
 * migration (D4), where "nearest" must mean nearest *to the eye*.
 */
export function distance(a: string, b: string): number {
  const A = rgbToOklab(parseHex(a));
  const B = rgbToOklab(parseHex(b));
  return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b);
}

/** Index of the perceptually closest color in `palette`. */
export function nearestIndex(color: string, palette: readonly string[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = distance(color, palette[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
