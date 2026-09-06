import { describe, it, expect } from 'vitest';
import { luminance, ratio, grade, inkOn, inkOnGradient, AA, AAA } from './contrast';
import { mix, parseHex, toHex, distance, nearestIndex, withAlpha } from './color';
import { PALETTE_V1 } from './presets';

const INKS = { inkLight: '#ffffff', inkDark: '#0b0d10' };

describe('luminance', () => {
  it('anchors at the ends of the range', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 5);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('weights green above red above blue', () => {
    expect(luminance('#00ff00')).toBeGreaterThan(luminance('#ff0000'));
    expect(luminance('#ff0000')).toBeGreaterThan(luminance('#0000ff'));
  });
});

describe('ratio', () => {
  it('gives 21:1 for black on white', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('gives 1:1 for a color against itself', () => {
    expect(ratio('#22d3ee', '#22d3ee')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(ratio('#0b0d10', '#e8ecf1')).toBeCloseTo(ratio('#e8ecf1', '#0b0d10'), 10);
  });

  it("rates the app's current text on its current background above AA", () => {
    expect(ratio('#e8ecf1', '#0b0d10')).toBeGreaterThan(AA);
  });
});

describe('grade', () => {
  it('classifies at the AA and AAA thresholds', () => {
    expect(grade(AAA)).toBe('AAA');
    expect(grade(AAA - 0.01)).toBe('AA');
    expect(grade(AA)).toBe('AA');
    expect(grade(AA - 0.01)).toBe('fail');
    expect(grade(1)).toBe('fail');
  });
});

describe('inkOn', () => {
  it('picks dark ink on a light background', () => {
    expect(inkOn('#ffffff', INKS)).toBe(INKS.inkDark);
    expect(inkOn('#22d3ee', INKS)).toBe(INKS.inkDark);
  });

  it('picks light ink on a dark background', () => {
    expect(inkOn('#000000', INKS)).toBe(INKS.inkLight);
    expect(inkOn('#1e3a8a', INKS)).toBe(INKS.inkLight);
  });

  it('always returns the more readable of the two inks', () => {
    for (const bg of ['#ffffff', '#000000', '#22d3ee', '#a78bfa', '#4ade80', '#7f1d1d']) {
      const chosen = inkOn(bg, INKS);
      const other = chosen === INKS.inkDark ? INKS.inkLight : INKS.inkDark;
      expect(ratio(bg, chosen)).toBeGreaterThanOrEqual(ratio(bg, other));
    }
  });

  it('honours a theme whose inks are not black and white', () => {
    const warm = { inkLight: '#fdf6e3', inkDark: '#2b1d0e' };
    expect(inkOn('#f5d76e', warm)).toBe(warm.inkDark);
    expect(inkOn('#3b2f1a', warm)).toBe(warm.inkLight);
  });
});

describe('color primitives', () => {
  it('parses shorthand and full hex alike', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('22d3ee')).toEqual({ r: 34, g: 211, b: 238 });
    expect(parseHex('#22d3eeff')).toEqual({ r: 34, g: 211, b: 238 });
  });

  it('round-trips through hex', () => {
    expect(toHex(parseHex('#22d3ee'))).toBe('#22d3ee');
  });

  it('rejects nonsense', () => {
    expect(() => parseHex('slot-3')).toThrow();
  });

  it('mixes towards each end', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('mixes monotonically in luminance', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map((t) => luminance(mix('#0b0d10', '#e8ecf1', t)));
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    }
  });

  it('measures distance as zero only against itself', () => {
    expect(distance('#22d3ee', '#22d3ee')).toBeCloseTo(0, 10);
    expect(distance('#22d3ee', '#f87171')).toBeGreaterThan(0);
  });

  it('finds the nearest palette entry', () => {
    const palette = ['#22d3ee', '#fb923c', '#4ade80'];
    expect(nearestIndex('#22d3ee', palette)).toBe(0);
    // A slightly-off cyan still snaps to the cyan slot.
    expect(nearestIndex('#20d0ea', palette)).toBe(0);
    expect(nearestIndex('#ff9944', palette)).toBe(1);
  });

  it('keeps channels when adding alpha', () => {
    expect(withAlpha('#22d3ee', 0.25)).toBe('rgba(34, 211, 238, 0.25)');
  });
});

describe('inkOnGradient', () => {
  const inks = { inkLight: '#ffffff', inkDark: '#0b0d10' };

  it('nunca elige peor que cualquiera de las dos tintas fijas', () => {
    // La propiedad, y no un par escogido a mano: sobre cada degradado posible
    // de la paleta, la tinta elegida aguanta el peor de los dos extremos al
    // menos tan bien como la que se hubiera fijado de antemano.
    for (const from of PALETTE_V1) {
      for (const to of PALETTE_V1) {
        const chosen = inkOnGradient(from, to, inks);
        const worst = (ink: string) => Math.min(ratio(from, ink), ratio(to, ink));
        expect(worst(chosen)).toBeGreaterThanOrEqual(worst(inks.inkDark));
        expect(worst(chosen)).toBeGreaterThanOrEqual(worst(inks.inkLight));
      }
    }
  });

  it('atiende al extremo malo y no solo al primero', () => {
    // Un naranja claro, que por su cuenta pediría tinta oscura, degradado hacia
    // un granate del alto contraste claro, que la hunde. Gana el extremo peor:
    // es exactamente el caso que `inkOn` no puede ver, porque solo mira uno.
    const from = '#FB923C';
    const to = '#7c2d12';
    expect(inkOn(from, inks)).toBe(inks.inkDark);
    expect(inkOnGradient(from, to, inks)).toBe(inks.inkLight);
  });

  it('coincide con inkOn cuando el degradado no lo es', () => {
    for (const c of ['#4ADE80', '#0b4a5e', '#FACC15', '#7f1d1d']) {
      expect(inkOnGradient(c, c, inks)).toBe(inkOn(c, inks));
    }
  });

  it('deja el monograma legible sobre el par por defecto de un enlace', () => {
    const ink = inkOnGradient('#4ADE80', '#FACC15', inks);
    expect(Math.min(ratio('#4ADE80', ink), ratio('#FACC15', ink))).toBeGreaterThanOrEqual(AA);
  });
});
