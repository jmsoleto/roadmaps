import { describe, it, expect } from 'vitest';
import { PRESETS, PALETTE_V1, PALETTE_PRESETS } from './presets';
import { resolveColors } from './resolve';
import { ratio } from './contrast';
import { auditFailures, auditVeiled, floorFor, VEILED_FLOOR } from './audit';
import { PALETTE_SLOTS, BASE_TOKENS } from './tokens';
import { isHex } from './color';

describe('preset shape', () => {
  it('has the four themes the spec requires', () => {
    expect(PRESETS.map((t) => t.id)).toEqual(['dark', 'light', 'dark-hc', 'light-hc']);
  });

  it('marks them all as built-in', () => {
    expect(PRESETS.every((t) => t.builtin)).toBe(true);
  });

  it('gives every preset a full palette of valid colors', () => {
    for (const theme of PRESETS) {
      expect(theme.barPalette.length, theme.id).toBe(PALETTE_SLOTS);
      expect(theme.barPalette.every(isHex), theme.id).toBe(true);
    }
  });

  it('gives every preset every base color', () => {
    for (const theme of PRESETS) {
      for (const token of BASE_TOKENS) {
        expect(isHex(theme.base[token]), `${theme.id}.${token}`).toBe(true);
      }
    }
  });

  it('reinforces lines in the high-contrast presets', () => {
    for (const theme of PRESETS) {
      const expected = theme.id.endsWith('-hc') ? 2 : 1;
      expect(theme.geometry.lineWidth, theme.id).toBe(expected);
    }
  });
});

describe('preset contrast', () => {
  it.each(PRESETS.map((t) => [t.id, t] as const))(
    '%s clears its contrast floor on every audited pair',
    (id, theme) => {
      // Audited through the same code path the editor warns with, so a preset
      // can never pass here while the editor calls it unreadable.
      const failures = auditFailures(theme).map((c) => `${c.label} (${c.ratio.toFixed(2)}:1)`);
      expect(failures, `${id} needs ${floorFor(theme)}:1`).toEqual([]);
    },
  );

  it.each(PRESETS.map((t) => [t.id, t] as const))(
    '%s deja legible lo que queda bajo el velo del foco de sprint',
    (id, theme) => {
      // El velo atenúa, no borra: por eso su tono se mide y no se elige mirando
      // (D9). Mismo camino que el resto del audit, para que no pueda pasar aquí
      // lo que el editor llamaría ilegible.
      const failures = auditVeiled(theme)
        .filter((c) => !c.passes)
        .map((c) => `${c.label} (${c.ratio.toFixed(2)}:1)`);
      expect(failures, `${id} necesita ${VEILED_FLOOR}:1 bajo el velo`).toEqual([]);
    },
  );

  it('keeps separators visible against their background', () => {
    for (const theme of PRESETS) {
      const c = resolveColors(theme.base, theme.overrides);
      // Not a text ratio — lines only need to be perceptible, not legible.
      expect(ratio(c.line, c.bg), `${theme.id}: line on bg`).toBeGreaterThan(1.4);
    }
  });
});

describe('palette presets offered by the editor', () => {
  it('each has a full set of valid colors', () => {
    for (const p of PALETTE_PRESETS) {
      expect(p.colors.length, p.id).toBe(PALETTE_SLOTS);
      expect(p.colors.every(isHex), p.id).toBe(true);
    }
  });

  it('includes the palette the app shipped with', () => {
    const vivid = PALETTE_PRESETS.find((p) => p.id === 'vivid');
    expect(vivid?.colors).toEqual([...PALETTE_V1]);
  });
});
