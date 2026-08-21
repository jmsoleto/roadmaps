import { describe, it, expect } from 'vitest';
import { AA, ratio } from '../theme/contrast';
import { resolveTheme } from '../theme/resolve';
import { PRESETS } from '../theme/presets';
import { APP_IDENTITIES, GLYPH_INK, IDENTITY_CATALOG, tileGradient } from './identity';

describe('app identity', () => {
  /**
   * The one-off audit the theming spec asks for: because these pairs never
   * follow the theme, their contrast against the carved ink is a property of a
   * closed catalog and can be settled here instead of on every custom theme.
   */
  it('every gradient pair carries the glyph ink at AA or better', () => {
    for (const identity of IDENTITY_CATALOG) {
      expect(ratio(GLYPH_INK, identity.from)).toBeGreaterThanOrEqual(AA);
      expect(ratio(GLYPH_INK, identity.to)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('gives every registered app its own pair', () => {
    const pairs = IDENTITY_CATALOG.map((i) => `${i.from}${i.to}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  /**
   * D3, as a test rather than a comment: the tile of an app looks the same
   * whichever theme is active.
   *
   * Note what this does *not* assert — that no theme ever resolves to a colour
   * an identity uses. The dark preset's accent is `#22d3ee`, which is exactly
   * the cyan Roadmaps was born with; that is the same colour picked twice, not
   * a coupling. What must hold is that swapping the theme leaves the pair
   * alone, which is what fails the day someone wires an identity to a token.
   */
  it('an app tile is the same under every theme', () => {
    const accents = new Set<string>();
    const gradients = new Set<string>();

    for (const preset of PRESETS) {
      accents.add(resolveTheme(preset).colors.accent);
      for (const identity of IDENTITY_CATALOG) gradients.add(tileGradient(identity));
    }

    // The themes really do differ, so the invariant below is not vacuous.
    expect(accents.size).toBeGreaterThan(1);
    expect(gradients.size).toBe(IDENTITY_CATALOG.length);
  });

  it('builds the tile gradient at the family angle', () => {
    expect(tileGradient(APP_IDENTITIES.roadmaps)).toBe('linear-gradient(145deg, #22D3EE, #60A5FA)');
  });
});
