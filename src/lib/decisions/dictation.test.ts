import { describe, it, expect } from 'vitest';
import {
  LOW_CONFIDENCE,
  STATE_MESSAGE,
  doubtfulCount,
  formatElapsed,
  isDoubtful,
  joinTranscript,
  type Fragment,
} from './dictation';

const f = (text: string, confidence = 0.95): Fragment => ({ text, confidence });

describe('joining what was dictated', () => {
  it('joins fragments in order', () => {
    expect(
      joinTranscript('', [f('Hay que decidir'), f('si los reembolsos los emite el PSP')]),
    ).toBe('Hay que decidir si los reembolsos los emite el PSP');
  });

  /** Dictation is another way in, not a separate mode. */
  it('adds to what was already typed instead of replacing it', () => {
    expect(joinTranscript('Reembolsos:', [f('parciales o totales')])).toBe(
      'Reembolsos: parciales o totales',
    );
  });

  it('normalises the spacing implementations disagree about', () => {
    expect(joinTranscript('', [f('  uno '), f(' dos')])).toBe('uno dos');
  });

  it('drops empty fragments rather than leaving gaps', () => {
    expect(joinTranscript('', [f('uno'), f('   '), f('dos')])).toBe('uno dos');
  });

  it('leaves the typed text alone when nothing was dictated', () => {
    expect(joinTranscript('ya escrito', [])).toBe('ya escrito');
    expect(joinTranscript('ya escrito', [f('  ')])).toBe('ya escrito');
  });

  it('is just the dictation when nothing was typed', () => {
    expect(joinTranscript('   ', [f('solo esto')])).toBe('solo esto');
  });
});

describe('doubtful fragments', () => {
  it('flags what the browser was unsure about', () => {
    expect(isDoubtful(f('settlement del PSP', 0.42))).toBe(true);
    expect(isDoubtful(f('reembolsos parciales', 0.93))).toBe(false);
  });

  it('counts them', () => {
    const all = [f('uno', 0.9), f('dos', 0.4), f('tres', 0.5)];
    expect(doubtfulCount(all)).toBe(2);
  });

  it('flags nothing when everything came through clearly', () => {
    expect(doubtfulCount([f('uno'), f('dos')])).toBe(0);
  });

  it('treats the threshold itself as good enough', () => {
    expect(isDoubtful(f('justo', LOW_CONFIDENCE))).toBe(false);
  });
});

describe('elapsed time', () => {
  it('reads as minutes and seconds', () => {
    expect(formatElapsed(0)).toBe('00:00');
    expect(formatElapsed(42_000)).toBe('00:42');
    expect(formatElapsed(65_000)).toBe('01:05');
    expect(formatElapsed(600_000)).toBe('10:00');
  });

  it('does not go negative on a clock that jumped', () => {
    expect(formatElapsed(-5000)).toBe('00:00');
  });
});

describe('what each state tells the user', () => {
  /** The disclosure that matters, said at the only moment it can change a decision. */
  it('says where the audio goes, while it is going', () => {
    expect(STATE_MESSAGE.escuchando).toMatch(/servicio externo/);
  });

  it('separates "you did not let me" from "something broke"', () => {
    expect(STATE_MESSAGE.denegado).toMatch(/micrófono/);
    expect(STATE_MESSAGE.denegado).toMatch(/escribir/);
    expect(STATE_MESSAGE.error).not.toMatch(/micrófono/);
  });

  it('says nothing when there is nothing to say', () => {
    expect(STATE_MESSAGE.parado).toBe('');
    expect(STATE_MESSAGE['no-disponible']).toBe('');
  });
});
