/**
 * The applications Tech Lead Hub hosts, as plain data.
 *
 * Deliberately free of any store import: routing has to resolve an app id
 * before the behaviour in `registry.ts` — which does read stores — is wired up.
 * That split is what keeps `routes.ts` pure and testable.
 */

import { APP_IDENTITIES, type AppIdentity } from './identity';
import type { AppState } from './types';

export interface AppDefinition {
  id: string;
  name: string;
  tagline: string;
  identity: AppIdentity;
  state: AppState;
  /** The hash route. `null` for anything that cannot be entered. */
  route: string | null;
}

export const ROADMAPS_ID = 'roadmaps';

/**
 * The registry.
 *
 * Decisions is `announced` rather than absent because its identity is already
 * decided and naming it is useful information. It is also what makes the grid
 * show all three states at once — which is the only way to tell, while there is
 * still just one live app, whether the card contract actually holds.
 */
export const APPS: readonly AppDefinition[] = [
  {
    id: ROADMAPS_ID,
    name: 'Roadmaps Hub',
    tagline:
      'Planificación tipo Gantt por proyecto: fases, dependencias externas, plan fijado y desviación.',
    identity: APP_IDENTITIES.roadmaps,
    state: 'live',
    route: '#/roadmaps',
  },
  {
    id: 'decisions',
    name: 'Decisions Hub',
    tagline:
      'Las decisiones de proyecto que hay que hablar con negocio, y dónde queda escrita su resolución.',
    identity: APP_IDENTITIES.decisions,
    state: 'announced',
    route: null,
  },
];

/** The short name, for the switcher and the breadcrumb where width is scarce. */
export function shortName(app: AppDefinition): string {
  return app.name.replace(/\s+Hub$/, '');
}

export function findApp(id: string): AppDefinition | undefined {
  return APPS.find((a) => a.id === id);
}

export function isLive(id: string): boolean {
  return findApp(id)?.state === 'live';
}
