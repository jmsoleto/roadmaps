import { describe, it, expect } from 'vitest';
import { APPS } from './apps';
import { HUB_HASH, hashFor, parseHash, sameLocation } from './routes';

describe('hub routes', () => {
  it('resolves a live application', () => {
    expect(parseHash('#/roadmaps')).toEqual({ kind: 'app', id: 'roadmaps' });
  });

  it('tolerates the hash with and without its slash', () => {
    expect(parseHash('#roadmaps')).toEqual({ kind: 'app', id: 'roadmaps' });
  });

  it('ignores anything below the application level', () => {
    // The segment after the app is not a route; it must not create a location.
    expect(parseHash('#/roadmaps/r-17')).toEqual({ kind: 'app', id: 'roadmaps' });
  });

  it('falls back to the hub for an unknown route', () => {
    expect(parseHash('#/nope')).toEqual({ kind: 'hub' });
  });

  it('falls back to the hub for an empty or absent hash', () => {
    expect(parseHash('')).toEqual({ kind: 'hub' });
    expect(parseHash('#')).toEqual({ kind: 'hub' });
    expect(parseHash('#/')).toEqual({ kind: 'hub' });
  });

  /** An announced app has no way in — not by card, not by switcher, not by URL. */
  it('falls back to the hub for an application that is not live', () => {
    const announced = APPS.find((a) => a.state === 'announced');
    expect(announced).toBeDefined();
    expect(parseHash(`#/${announced!.id}`)).toEqual({ kind: 'hub' });
  });

  it('writes the hash a location came from', () => {
    expect(hashFor({ kind: 'hub' })).toBe(HUB_HASH);
    expect(hashFor({ kind: 'app', id: 'roadmaps' })).toBe('#/roadmaps');
  });

  it('writes the hub hash for a location no app claims', () => {
    expect(hashFor({ kind: 'app', id: 'ghost' })).toBe(HUB_HASH);
  });

  it('round-trips every live application', () => {
    for (const app of APPS.filter((a) => a.state === 'live')) {
      expect(parseHash(hashFor({ kind: 'app', id: app.id }))).toEqual({
        kind: 'app',
        id: app.id,
      });
    }
  });

  it('compares locations by kind and id', () => {
    expect(sameLocation({ kind: 'hub' }, { kind: 'hub' })).toBe(true);
    expect(sameLocation({ kind: 'hub' }, { kind: 'app', id: 'roadmaps' })).toBe(false);
    expect(sameLocation({ kind: 'app', id: 'roadmaps' }, { kind: 'app', id: 'roadmaps' })).toBe(
      true,
    );
    expect(sameLocation({ kind: 'app', id: 'roadmaps' }, { kind: 'app', id: 'other' })).toBe(false);
  });
});
