import { describe, it, expect } from 'vitest';
import { APPS, ROADMAPS_ID, findApp, isLive, shortName, type AppDefinition } from './apps';
import { IDENTITY_CATALOG } from './identity';
import { parseHash } from './routes';
import { byToneDescending, type Alert, type HubApp } from './types';

describe('the app registry', () => {
  it('registers Roadmaps as the live application', () => {
    expect(isLive(ROADMAPS_ID)).toBe(true);
    expect(findApp(ROADMAPS_ID)?.route).toBe('#/roadmaps');
  });

  it('registers Decisions as the second live application', () => {
    const decisions = findApp('decisions');
    expect(decisions?.state).toBe('live');
    expect(decisions?.route).toBe('#/decisions');
    expect(IDENTITY_CATALOG).toContain(decisions?.identity);
  });

  it('registers API Hub as the third live application', () => {
    const api = findApp('api');
    expect(api?.state).toBe('live');
    expect(api?.route).toBe('#/api');
    expect(IDENTITY_CATALOG).toContain(api?.identity);
  });

  it('gives each live application its own route', () => {
    const routes = APPS.filter((a) => a.state === 'live').map((a) => a.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('gives every registered app a distinct id', () => {
    const ids = APPS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shortens the name for the places where width is scarce', () => {
    expect(shortName(findApp(ROADMAPS_ID)!)).toBe('Roadmaps');
    expect(shortName(findApp('decisions')!)).toBe('Decisions');
    expect(shortName(findApp('api')!)).toBe('API');
  });

  it('gives a route to every live app and none to the rest', () => {
    for (const app of APPS) {
      if (app.state === 'live') expect(app.route).not.toBe(null);
      else expect(app.route).toBe(null);
    }
  });
});

/**
 * The contract's whole purpose: a third application is a definition, not an
 * edit to the landing. This exercises the same shape the grid consumes.
 */
describe('registering another application', () => {
  const extra: AppDefinition = {
    id: 'incidents',
    name: 'Incidents Hub',
    tagline: 'Lo que se rompió y qué se hizo.',
    identity: { glyph: 'future', from: '#4ADE80', to: '#FACC15' },
    state: 'live',
    createLabel: '+ incidencia',
    route: '#/incidents',
  };

  it('takes its place after the ones already there', () => {
    const registry = [...APPS, extra];
    const live = registry.filter((a) => a.state === 'live').map((a) => a.id);
    expect(live).toContain(ROADMAPS_ID);
    expect(live[live.length - 1]).toBe('incidents');
  });

  it('titles its own short list rather than borrowing one', () => {
    // The landing never supplies this string; the app does.
    const mine: HubApp['summary'] = () => ({
      stats: [
        { value: 1, label: 'abiertas', tone: 'neutral' },
        { value: 0, label: 'críticas', tone: 'neutral' },
        { value: 2, label: 'esta semana', tone: 'neutral' },
      ],
      list: { label: 'SIN CERRAR', rows: [], emptyLabel: 'nada roto' },
      alerts: [],
    });
    expect(mine!().list.label).toBe('SIN CERRAR');
  });

  it('routes on its own id once registered', () => {
    // `parseHash` reads the module registry, so an unregistered id is the hub.
    expect(parseHash('#/incidents')).toEqual({ kind: 'hub' });
  });
});

describe('alert ordering', () => {
  const alert = (id: string, tone: Alert['tone']): Alert => ({
    id,
    text: id,
    source: 'x',
    tone,
  });

  it('sorts danger before warn before neutral', () => {
    const sorted = [alert('n', 'neutral'), alert('d', 'danger'), alert('w', 'warn')].sort(
      byToneDescending,
    );
    expect(sorted.map((a) => a.id)).toEqual(['d', 'w', 'n']);
  });
});
