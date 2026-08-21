/**
 * Hash routes, at the granularity of an application and no finer (D7).
 *
 * The hash and not the History API because GitHub Pages does not rewrite paths:
 * `/roadmaps/roadmaps` would 404 on reload. A hash survives a reload, the PWA's
 * `start_url`, and the base path changing between dev and Pages.
 *
 * And only down to the application because the next level is expensive and buys
 * little: putting the open roadmap in the URL forces a decision about ids that
 * no longer exist, a reconciliation with `activeId`, and the persistence of a
 * location the store deliberately chose *not* to persist.
 *
 * Pure on purpose — no `window` in here.
 */

import { findApp, type AppDefinition } from './apps';

export type Location = { kind: 'hub' } | { kind: 'app'; id: string };

export const HUB: Location = { kind: 'hub' };

export const HUB_HASH = '#/';

/** How an id is turned into an app. Injectable so the rules can be tested
 * against a fixture registry rather than against whichever apps happen to be
 * live today — the announced case has no example in the real registry now that
 * Decisions ships. */
export type AppLookup = (id: string) => AppDefinition | undefined;

/**
 * Read a location out of a hash.
 *
 * Everything unrecognised falls back to the hub: an unknown app, an app that is
 * only announced, an empty hash, junk. It is the only degradation available
 * that does not invent state.
 */
export function parseHash(hash: string, lookup: AppLookup = findApp): Location {
  const id = hash.replace(/^#\/?/, '').split('/')[0];
  if (!id) return HUB;
  const app = lookup(id);
  if (!app || app.state !== 'live' || app.route === null) return HUB;
  return { kind: 'app', id: app.id };
}

/** The hash a location should be written as. */
export function hashFor(location: Location): string {
  if (location.kind === 'hub') return HUB_HASH;
  return findApp(location.id)?.route ?? HUB_HASH;
}

export function sameLocation(a: Location, b: Location): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'hub' || a.id === (b as { kind: 'app'; id: string }).id;
}
