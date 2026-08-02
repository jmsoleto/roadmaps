import { describe, it, expect } from 'vitest';
import { resolveColors, deriveDefaults, DERIVATIONS } from './resolve';
import { BASE_TOKENS, DERIVED_TOKENS, COLOR_TOKENS, type ThemeBase } from './tokens';
import { luminance } from './contrast';

const DARK: ThemeBase = {
  bg: '#0b0d10',
  surface: '#13161b',
  text: '#e8ecf1',
  textDim: '#7a828f',
  accent: '#22d3ee',
  line: '#2b323b',
  danger: '#f87171',
  inkLight: '#ffffff',
  inkDark: '#0b0d10',
};

const LIGHT: ThemeBase = {
  bg: '#ffffff',
  surface: '#f4f6f8',
  text: '#11151a',
  textDim: '#5c6470',
  accent: '#0e7490',
  line: '#c8ced6',
  danger: '#b91c1c',
  inkLight: '#ffffff',
  inkDark: '#0b0d10',
};

describe('resolveColors', () => {
  it('resolves every token from base colors alone', () => {
    const resolved = resolveColors(DARK);
    for (const token of COLOR_TOKENS) {
      expect(resolved[token], `token ${token}`).toBeTruthy();
    }
    expect(Object.keys(resolved).length).toBe(COLOR_TOKENS.length);
  });

  it('passes base colors through untouched', () => {
    const resolved = resolveColors(DARK);
    for (const token of BASE_TOKENS) {
      expect(resolved[token]).toBe(DARK[token]);
    }
  });

  it('derives every token that is not a base color', () => {
    const derived = deriveDefaults(DARK);
    expect(Object.keys(derived).sort()).toEqual([...DERIVED_TOKENS].sort());
  });
});

describe('override behaviour', () => {
  it('lets an override win over the computed value', () => {
    const computed = DERIVATIONS.hover(DARK);
    const resolved = resolveColors(DARK, { hover: '#ff00ff' });
    expect(resolved.hover).toBe('#ff00ff');
    expect(resolved.hover).not.toBe(computed);
  });

  it('stops a pinned token from following its base', () => {
    const pinned = { hover: '#ff00ff' };
    const before = resolveColors(DARK, pinned);
    const after = resolveColors({ ...DARK, text: '#00ff00' }, pinned);
    expect(after.hover).toBe(before.hover);
  });

  it('keeps the other tokens of that base following', () => {
    const pinned = { hover: '#ff00ff' };
    const before = resolveColors(DARK, pinned);
    const after = resolveColors({ ...DARK, text: '#00ff00' }, pinned);
    // `veil` and `barBorder` also come from `text` and must have moved.
    expect(after.veil).not.toBe(before.veil);
    expect(after.barBorder).not.toBe(before.barBorder);
  });

  it('returns a token to its computed value when the override is removed', () => {
    const computed = resolveColors(DARK).hover;
    const overridden = resolveColors(DARK, { hover: '#ff00ff' }).hover;
    const restored = resolveColors(DARK, {}).hover;
    expect(overridden).not.toBe(computed);
    expect(restored).toBe(computed);
  });

  it('ignores overrides for tokens that are not derived', () => {
    // `bg` is a base color; an override map cannot reach it.
    const resolved = resolveColors(DARK, { bg: '#ff00ff' } as never);
    expect(resolved.bg).toBe(DARK.bg);
  });
});

describe('derivations flip with the theme', () => {
  it('washes lighten on a dark theme and darken on a light one', () => {
    // Both are `text` at 4% alpha, so the sign of the effect follows `text`.
    expect(luminance(DARK.text)).toBeGreaterThan(luminance(DARK.bg));
    expect(luminance(LIGHT.text)).toBeLessThan(luminance(LIGHT.bg));
    expect(resolveColors(DARK).hover).toContain('232, 236, 241');
    expect(resolveColors(LIGHT).hover).toContain('17, 21, 26');
  });

  it('keeps shadows dark in both directions', () => {
    for (const base of [DARK, LIGHT]) {
      const shadow = resolveColors(base).shadowMedium;
      const [r, g, b] = /rgba\((\d+), (\d+), (\d+)/.exec(shadow)!.slice(1).map(Number);
      expect(Math.max(r, g, b)).toBeLessThan(40);
    }
  });

  it('softens shadow opacity as the theme gets lighter', () => {
    const alphaOf = (s: string) => Number(/, ([\d.]+)\)$/.exec(s)![1]);
    expect(alphaOf(resolveColors(LIGHT).shadowMedium)).toBeLessThan(
      alphaOf(resolveColors(DARK).shadowMedium),
    );
  });

  it('leaves the dark theme shadow effectively unchanged from the current value', () => {
    const alphaOf = (s: string) => Number(/, ([\d.]+)\)$/.exec(s)![1]);
    expect(alphaOf(resolveColors(DARK).shadowMedium)).toBeCloseTo(0.4, 2);
  });
});
