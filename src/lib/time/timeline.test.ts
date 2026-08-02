import { describe, it, expect } from 'vitest';
import {
  parseIso,
  formatIso,
  addDays,
  dayIndex,
  dateFromDay,
  fmtDate,
  isIsoDate,
  isWeekend,
  snapToWorkday,
  snapForward,
} from './timeline';

describe('isIsoDate', () => {
  it('accepts only YYYY-MM-DD strings', () => {
    expect(isIsoDate('2026-07-01')).toBe(true);
    expect(isIsoDate('2026-7-1')).toBe(false);
    expect(isIsoDate('2026-07-01T00:00:00Z')).toBe(false);
    expect(isIsoDate('01/07/2026')).toBe(false);
    expect(isIsoDate(182)).toBe(false);
    expect(isIsoDate(null)).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});

describe('parse / format round-trip', () => {
  it('parses and formats back to the same ISO day', () => {
    for (const iso of ['2026-01-01', '2026-12-31', '2024-02-29', '2027-03-08']) {
      expect(formatIso(parseIso(iso))).toBe(iso);
    }
  });

  it('rejects malformed input', () => {
    expect(() => parseIso('2026-1-1')).toThrow();
    expect(() => parseIso('not-a-date')).toThrow();
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('handles leap day correctly', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01'); // non-leap
  });
});

describe('dayIndex / dateFromDay are inverses', () => {
  const origin = '2026-01-01';

  it('origin maps to 0 and next day to 1 (no off-by-one)', () => {
    expect(dayIndex(origin, '2026-01-01')).toBe(0);
    expect(dayIndex(origin, '2026-01-02')).toBe(1);
    expect(dayIndex(origin, '2025-12-31')).toBe(-1);
  });

  it('dateFromDay inverts dayIndex over a wide range', () => {
    for (const n of [0, 1, 30, 59, 365, 729, -5]) {
      const iso = dateFromDay(origin, n);
      expect(dayIndex(origin, iso)).toBe(n);
    }
  });

  it('730-day window spans two years', () => {
    expect(dateFromDay('2026-01-01', 730)).toBe('2028-01-01');
  });
});

describe('weekends and snapping', () => {
  // 2026-01-01 is a Thursday. Sat 2026-01-03, Sun 2026-01-04.
  it('detects weekends', () => {
    expect(isWeekend('2026-01-01')).toBe(false); // Thu
    expect(isWeekend('2026-01-03')).toBe(true); // Sat
    expect(isWeekend('2026-01-04')).toBe(true); // Sun
    expect(isWeekend('2026-01-05')).toBe(false); // Mon
  });

  it('snapToWorkday: Sat -> Fri, Sun -> Mon, workday unchanged', () => {
    expect(snapToWorkday('2026-01-03')).toBe('2026-01-02'); // Sat -> Fri
    expect(snapToWorkday('2026-01-04')).toBe('2026-01-05'); // Sun -> Mon
    expect(snapToWorkday('2026-01-01')).toBe('2026-01-01'); // Thu unchanged
  });

  it('snapForward: Sat -> Mon, Sun -> Mon, workday unchanged', () => {
    expect(snapForward('2026-01-03')).toBe('2026-01-05'); // Sat -> Mon
    expect(snapForward('2026-01-04')).toBe('2026-01-05'); // Sun -> Mon
    expect(snapForward('2026-01-02')).toBe('2026-01-02'); // Fri unchanged
  });
});

describe('fmtDate', () => {
  it('formats day + Spanish month abbreviation', () => {
    expect(fmtDate('2026-01-01')).toBe('1 ene');
    expect(fmtDate('2026-03-08')).toBe('8 mar');
    expect(fmtDate('2026-12-31')).toBe('31 dic');
  });
});
