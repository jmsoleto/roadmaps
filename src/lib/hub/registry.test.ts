import { describe, it, expect } from 'vitest';
import { hubApp, hubApps } from './registry';
import { API_ID, DECISIONS_ID, ROADMAPS_ID } from './apps';
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
