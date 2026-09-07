import { describe, it, expect } from 'vitest';
import { hubApp, hubApps } from './registry';
import { API_ID, DECISIONS_ID, LINKS_ID, ROADMAPS_ID } from './apps';
import { links } from '../links/store.svelte';
import type { AppAction } from './types';

/**
 * The contract the shell consumes, exercised the way the shell consumes it.
 *
 * This is what stops `App.svelte` and `Topbar.svelte` from growing a branch per
 * application again: if a live app forgets to register a screen or its actions,
 * the shell has nothing to render and no test would otherwise notice — the
 * failure is a blank page, not an error.
 */
describe('what the shell reads out of the registry', () => {
  it('gives every live application a screen', () => {
    for (const app of hubApps()) {
      if (app.state === 'live') expect(app.root).not.toBeNull();
      else expect(app.root).toBeNull();
    }
  });

  it('gives every live application a way in and a way to create', () => {
    for (const app of hubApps().filter((a) => a.state === 'live')) {
      expect(app.open).not.toBeNull();
      expect(app.create).not.toBeNull();
      expect(app.summary).not.toBeNull();
    }
  });

  it('lets an application decline a second breadcrumb level', () => {
    // Decisions has none; the topbar fills the gap itself.
    expect(hubApp(DECISIONS_ID)?.context).toBeNull();
    expect(hubApp(ROADMAPS_ID)?.context).not.toBeNull();
    expect(hubApp(API_ID)?.context).not.toBeNull();
  });

  it('declares actions as data, evaluated on demand', () => {
    for (const app of hubApps().filter((a) => a.state === 'live')) {
      const actions = app.actions?.() ?? [];
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) {
        expect(action.label).not.toBe('');
        expect(['button', 'file']).toContain(action.kind);
        expect(typeof action.run).toBe('function');
      }
    }
  });

  /**
   * The single hidden input in the topbar reads a file and hands its text to
   * whichever action asked for it, so a file action has to say what it accepts.
   */
  it('has every file action declare what it accepts', () => {
    const files = hubApps()
      .flatMap((a) => a.actions?.() ?? [])
      .filter((a): a is Extract<AppAction, { kind: 'file' }> => a.kind === 'file');

    expect(files.length).toBeGreaterThan(0);
    for (const action of files) expect(action.accept).toContain('json');
  });

  /**
   * A bad file has to reach the topbar as a thrown error, which is what it
   * turns into the message beside the actions. Swallowing it would leave the
   * user staring at an import that silently did nothing.
   */
  it('throws out of a file action when the document is not readable', () => {
    const files = hubApps()
      .flatMap((a) => a.actions?.() ?? [])
      .filter((a): a is Extract<AppAction, { kind: 'file' }> => a.kind === 'file');

    for (const action of files) expect(() => action.run('esto no es json')).toThrow();
  });

  it('registers no behaviour for an application that is not there', () => {
    expect(hubApp('incidents')).toBeUndefined();
  });
});

/**
 * Links Hub's three, and the one that has to be able to say "not now".
 *
 * The state is set directly rather than through `addArea`, which would schedule
 * a save into a `localStorage` this environment does not have. What is under
 * test is the actions the bar reads, not the store's writing.
 */
describe('the actions Links Hub declares', () => {
  function linkActions() {
    return hubApp(LINKS_ID)?.actions?.() ?? [];
  }

  function exportAction() {
    return linkActions().find((a) => a.label.includes('exportar'));
  }

  it('offers creating, importing and exporting', () => {
    const labels = linkActions().map((a) => a.label);
    expect(labels.some((l) => l.includes('nuevo enlace'))).toBe(true);
    expect(labels.some((l) => l.includes('importar'))).toBe(true);
    expect(labels.some((l) => l.includes('exportar'))).toBe(true);
  });

  it('cannot export with no area open', () => {
    links.data = { areas: [], links: [] };
    links.setActiveArea(null);
    expect(exportAction()?.disabled).toBe(true);
  });

  it('can export once an area is open', () => {
    links.data = { areas: [{ id: 'a1', name: 'Pagos' }], links: [] };
    links.setActiveArea('a1');
    expect(exportAction()?.disabled).toBe(false);
  });

  /** Importing never depends on there being an area: it brings its own. */
  it('offers importing even with nothing in the catalogue', () => {
    links.data = { areas: [], links: [] };
    links.setActiveArea(null);
    const importAction = linkActions().find((a) => a.label.includes('importar'));
    expect(importAction?.disabled).toBeFalsy();
  });
});
