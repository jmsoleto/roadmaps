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
  /**
   * What the card's secondary action says.
   *
   * The app's, not the landing's — same reason its short list titles itself:
   * "+ nuevo" is the wrong word, and in Spanish the wrong gender, for anything
   * that is not a roadmap.
   */
  createLabel: string;
  /** The hash route. `null` for anything that cannot be entered. */
  route: string | null;
}

export const ROADMAPS_ID = 'roadmaps';
export const DECISIONS_ID = 'decisions';

/**
 * The registry.
 *
 * Both applications are live. The grid still shows a third state — the
 * anonymous marker the landing appends — so "more fit here" stays visible
 * without an app having to pretend to be a placeholder.
 */
export const APPS: readonly AppDefinition[] = [
  {
    id: ROADMAPS_ID,
    name: 'Roadmaps Hub',
    tagline:
      'Planificación tipo Gantt por proyecto: fases, dependencias externas, plan fijado y desviación.',
    identity: APP_IDENTITIES.roadmaps,
    state: 'live',
    createLabel: '+ nuevo roadmap',
    route: '#/roadmaps',
  },
  {
    id: DECISIONS_ID,
    name: 'Decisions Hub',
    tagline:
      'Las decisiones de proyecto que hay que hablar con negocio, y dónde queda escrita su resolución.',
    identity: APP_IDENTITIES.decisions,
    state: 'live',
    createLabel: '+ capturar',
    route: '#/decisions',
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
