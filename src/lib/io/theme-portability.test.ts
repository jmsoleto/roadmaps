import { describe, it, expect } from 'vitest';
import { exportTheme, parseThemeImport } from './theme-portability';
import { PRESETS } from '../theme/presets';
import { resolveColors } from '../theme/resolve';
import { BASE_TOKENS, COLOR_TOKENS, PALETTE_SLOTS } from '../theme/tokens';

const custom = {
  ...PRESETS[1],
  id: 'mine',
  name: 'Nocturno cálido',
  builtin: false,
  overrides: { hover: 'rgba(36, 31, 26, 1)' },
};

describe('export / import round trip', () => {
  it('preserves colors, palette, geometry and name', () => {
    const back = parseThemeImport(exportTheme(custom));
    expect(back.name).toBe(custom.name);
    expect(back.base).toEqual(custom.base);
    expect(back.overrides).toEqual(custom.overrides);
    expect(back.geometry).toEqual(custom.geometry);
    expect(back.barPalette).toEqual(custom.barPalette);
  });

  it('gives the imported theme a fresh id and never marks it built-in', () => {
    const back = parseThemeImport(exportTheme(PRESETS[0]));
    expect(back.id).not.toBe(PRESETS[0].id);
    expect(back.builtin).toBe(false);
  });
});

describe('tolerant import', () => {
  it('accepts a document carrying only the base colors', () => {
    const minimal = JSON.stringify({
      format: 'roadmaps.theme.v1',
      name: 'Mínimo',
      base: PRESETS[1].base,
    });
    const back = parseThemeImport(minimal);

    expect(back.base).toEqual(PRESETS[1].base);
    // Everything else still resolves, which is the point of the two-level model.
    const resolved = resolveColors(back.base, back.overrides);
    for (const token of COLOR_TOKENS) expect(resolved[token], token).toBeTruthy();
    expect(back.barPalette.length).toBe(PALETTE_SLOTS);
    expect(back.geometry.lineWidth).toBeGreaterThan(0);
  });

  it('ignores tokens it does not recognize', () => {
    const withJunk = JSON.stringify({
      format: 'roadmaps.theme.v1',
      name: 'Del futuro',
      base: { ...PRESETS[0].base, somethingNew: '#123456' },
      overrides: { hover: '#111111', tokenFromTheFuture: '#abcdef' },
    });
    const back = parseThemeImport(withJunk);

    expect(back.overrides).toEqual({ hover: '#111111' });
    expect(Object.keys(back.base).sort()).toEqual([...BASE_TOKENS].sort());
    expect(JSON.stringify(back)).not.toContain('#123456');
  });

  it('substitutes a fallback for a base color that is missing or malformed', () => {
    const broken = JSON.stringify({
      format: 'roadmaps.theme.v1',
      base: { bg: 'not-a-color', text: '#ffffff' },
    });
    const back = parseThemeImport(broken);

    expect(back.base.text).toBe('#ffffff');
    expect(back.base.bg).toBe(PRESETS[0].base.bg);
    expect(back.base.accent).toBe(PRESETS[0].base.accent);
  });

  it('pads a short palette rather than leaving slots empty', () => {
    const short = JSON.stringify({
      format: 'roadmaps.theme.v1',
      base: PRESETS[0].base,
      barPalette: ['#ff0000', '#00ff00'],
    });
    const back = parseThemeImport(short);

    expect(back.barPalette.length).toBe(PALETTE_SLOTS);
    expect(back.barPalette[0]).toBe('#ff0000');
    expect(back.barPalette[9]).toBe(PRESETS[0].barPalette[9]);
  });
});

describe('rejections', () => {
  it('rejects invalid JSON', () => {
    expect(() => parseThemeImport('{not json')).toThrow();
  });

  it('rejects a file that is not a theme', () => {
    expect(() => parseThemeImport('{"foo":1}')).toThrow('no es un tema');
  });

  it('rejects a roadmap export mistaken for a theme', () => {
    const roadmap = JSON.stringify({ format: 'roadmaps.v1', roadmap: { name: 'X', rows: [] } });
    expect(() => parseThemeImport(roadmap)).toThrow('no es un tema');
  });
});
