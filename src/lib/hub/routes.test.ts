import { describe, it, expect } from 'vitest';
import { APPS, type AppDefinition } from './apps';
import { APP_IDENTITIES } from './identity';
import { HUB_HASH, hashFor, parseHash, sameLocation } from './routes';

describe('hub routes', () => {
  it('resolves a live application', () => {
    expect(parseHash('#/roadmaps')).toEqual({ kind: 'app', id: 'roadmaps' });
  });

  it('resolves the third live application', () => {
    expect(parseHash('#/api')).toEqual({ kind: 'app', id: 'api' });
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

  /**
   * An announced app has no way in — not by card, not by switcher, not by URL.
   *
   * Tested against a fixture rather than the real registry: every app that ships
   * today is live, so the registry has no example left. The rule outlives the
   * example, and the next announced app must not be the moment it is discovered
   * to have rotted.
   */
  it('falls back to the hub for an application that is not live', () => {
    const announced: AppDefinition = {
      id: 'pendiente',
      name: 'Pendiente Hub',
      tagline: 'todavía no',
      identity: APP_IDENTITIES.future,
      state: 'announced',
      createLabel: '+ nuevo',
      route: null,
    };
    const lookup = (id: string) => (id === announced.id ? announced : undefined);

    expect(parseHash('#/pendiente', lookup)).toEqual({ kind: 'hub' });
  });

  it('falls back to the hub for an application with a state but no route', () => {
    const broken: AppDefinition = {
      id: 'rota',
      name: 'Rota',
      tagline: '',
      identity: APP_IDENTITIES.future,
      state: 'live',
      createLabel: '+ nuevo',
      route: null,
    };
    expect(parseHash('#/rota', () => broken)).toEqual({ kind: 'hub' });
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
