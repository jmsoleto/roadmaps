/**
 * Theme import/export (design decision D7).
 *
 * A theme travels as its own document, never inside a roadmap export: the
 * roadmap is content, the theme is an application preference.
 *
 * Import is deliberately forgiving — unknown keys are ignored, missing keys are
 * derived. That is what makes the two-level model pay off over time: a file
 * carrying only the base colors still produces a complete interface, so tokens
 * added in future versions cannot invalidate themes exported today.
 */

import { isHex } from '../theme/color';
import { PRESETS } from '../theme/presets';
import {
  BASE_TOKENS,
  DERIVED_TOKENS,
  DEFAULT_GEOMETRY,
  PALETTE_SLOTS,
  type Theme,
  type ThemeBase,
  type ThemeOverrides,
} from '../theme/tokens';
import { uid } from '../util/id';

const FORMAT = 'roadmaps.theme.v1';

export interface ThemeExport {
  format: typeof FORMAT;
  exportedAt: string;
  name: string;
  base: ThemeBase;
  overrides: ThemeOverrides;
  geometry: Theme['geometry'];
  barPalette: string[];
}

/** Serialize a theme to a JSON string. */
export function exportTheme(theme: Theme): string {
  const doc: ThemeExport = {
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    name: theme.name,
    base: { ...theme.base },
    overrides: { ...theme.overrides },
    geometry: { ...theme.geometry },
    barPalette: [...theme.barPalette],
  };
  return JSON.stringify(doc, null, 2);
}

/** Fall back to the dark preset for anything the document does not supply. */
const FALLBACK = PRESETS[0];

/** Parse a theme document, filling in whatever it leaves out. */
export function parseThemeImport(text: string): Theme {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es JSON válido.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Formato no reconocido.');

  const doc = parsed as Record<string, unknown>;
  if (doc.format !== FORMAT) throw new Error('El archivo no es un tema de Roadmaps.');

  return {
    id: uid('th'),
    name: typeof doc.name === 'string' && doc.name.trim() ? doc.name : 'Tema importado',
    builtin: false,
    base: readBase(doc.base),
    overrides: readOverrides(doc.overrides),
    geometry: readGeometry(doc.geometry),
    barPalette: readPalette(doc.barPalette),
  };
}

function readBase(v: unknown): ThemeBase {
  const src = (v ?? {}) as Record<string, unknown>;
  const out = {} as ThemeBase;
  for (const token of BASE_TOKENS) {
    const value = src[token];
    out[token] = typeof value === 'string' && isHex(value) ? value : FALLBACK.base[token];
  }
  return out;
}

/** Only known derived tokens survive; anything else is dropped on the floor. */
function readOverrides(v: unknown): ThemeOverrides {
  const src = (v ?? {}) as Record<string, unknown>;
  const out: ThemeOverrides = {};
  for (const token of DERIVED_TOKENS) {
    const value = src[token];
    if (typeof value === 'string' && value.trim()) out[token] = value;
  }
  return out;
}

function readGeometry(v: unknown): Theme['geometry'] {
  const src = (v ?? {}) as Record<string, unknown>;
  const num = (key: keyof typeof DEFAULT_GEOMETRY) => {
    const value = src[key];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? value
      : DEFAULT_GEOMETRY[key];
  };
  return { lineWidth: num('lineWidth'), focusRing: num('focusRing'), barRadius: num('barRadius') };
}

/** A palette is always `PALETTE_SLOTS` long; short ones borrow from the fallback. */
function readPalette(v: unknown): string[] {
  const src = Array.isArray(v) ? v : [];
  const out: string[] = [];
  for (let i = 0; i < PALETTE_SLOTS; i++) {
    const value = src[i];
    out.push(typeof value === 'string' && isHex(value) ? value : FALLBACK.barPalette[i]);
  }
  return out;
}
