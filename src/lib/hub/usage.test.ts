import { describe, it, expect } from 'vitest';
import { formatLongDate, formatRelative } from './relative-time';
import {
  RECENT_MAX,
  liveRecent,
  parseRecent,
  parseStamp,
  serializeRecent,
  touchRecent,
  type RecentEntry,
} from './usage';

const at = (day: number) => Date.UTC(2026, 7, day);

describe('recent openings', () => {
  it('puts the newest opening first', () => {
    let list: RecentEntry[] = [];
    list = touchRecent(list, 'a', at(1));
    list = touchRecent(list, 'b', at(2));
    expect(list.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('moves an already-listed roadmap to the front instead of duplicating it', () => {
    let list: RecentEntry[] = [];
    list = touchRecent(list, 'a', at(1));
    list = touchRecent(list, 'b', at(2));
    list = touchRecent(list, 'a', at(3));
    expect(list.map((e) => e.id)).toEqual(['a', 'b']);
    expect(list[0].at).toBe(at(3));
  });

  it('prunes to the maximum', () => {
    let list: RecentEntry[] = [];
    for (let i = 0; i < RECENT_MAX + 5; i++) list = touchRecent(list, `r${i}`, at(1) + i);
    expect(list).toHaveLength(RECENT_MAX);
    expect(list[0].id).toBe(`r${RECENT_MAX + 4}`);
  });

  it('drops ids whose roadmap no longer exists, on read', () => {
    const list: RecentEntry[] = [
      { id: 'gone', at: at(3) },
      { id: 'alive', at: at(2) },
    ];
    expect(liveRecent(list, ['alive']).map((e) => e.id)).toEqual(['alive']);
  });

  it('keeps the stored order when filtering', () => {
    const list: RecentEntry[] = [
      { id: 'c', at: at(3) },
      { id: 'gone', at: at(2) },
      { id: 'a', at: at(1) },
    ];
    expect(liveRecent(list, ['a', 'c']).map((e) => e.id)).toEqual(['c', 'a']);
  });

  it('round-trips through the preference', () => {
    const list: RecentEntry[] = [{ id: 'a', at: at(1) }];
    expect(parseRecent(serializeRecent(list))).toEqual(list);
  });

  it('reads nothing out of an absent or malformed preference', () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent('')).toEqual([]);
    expect(parseRecent('not json')).toEqual([]);
    expect(parseRecent('{"id":"a"}')).toEqual([]);
    expect(parseRecent('[{"id":"a"},{"at":1},{"id":"b","at":2}]')).toEqual([{ id: 'b', at: 2 }]);
  });
});

describe('last-access stamp', () => {
  it('reads a stamp', () => {
    expect(parseStamp('1750000000000')).toBe(1750000000000);
  });

  it('has no stamp on a first run', () => {
    expect(parseStamp(null)).toBe(null);
    expect(parseStamp('')).toBe(null);
    expect(parseStamp('nonsense')).toBe(null);
    expect(parseStamp('0')).toBe(null);
  });
});

describe('relative phrasing', () => {
  const now = new Date(2026, 7, 20, 9, 30).getTime();

  it('says the time for today', () => {
    expect(formatRelative(new Date(2026, 7, 20, 8, 5).getTime(), now)).toBe('hoy 08:05');
  });

  it('says yesterday with the time', () => {
    expect(formatRelative(new Date(2026, 7, 19, 18, 42).getTime(), now)).toBe('ayer 18:42');
  });

  /** Calendar days apart, not elapsed hours: at 00:30 last evening is "ayer". */
  it('counts calendar days, not elapsed hours', () => {
    const justAfterMidnight = new Date(2026, 7, 20, 0, 30).getTime();
    const lastEvening = new Date(2026, 7, 19, 22, 0).getTime();
    expect(formatRelative(lastEvening, justAfterMidnight)).toBe('ayer 22:00');
  });

  it('counts days within the week', () => {
    expect(formatRelative(new Date(2026, 7, 17, 10, 0).getTime(), now)).toBe('hace 3 días');
  });

  it('falls back to a date beyond a week', () => {
    expect(formatRelative(new Date(2026, 6, 30, 10, 0).getTime(), now)).toBe('30/07/2026');
  });

  it('writes the long date of the eyebrow', () => {
    expect(formatLongDate(new Date(2026, 7, 20).getTime())).toBe('jueves 20 de agosto');
  });
});
