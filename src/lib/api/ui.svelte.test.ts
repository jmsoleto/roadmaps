import { describe, it, expect } from 'vitest';
import { apiUi } from './ui.svelte';

describe('the pending focus', () => {
  it('belongs to whoever was named, and to nobody else', () => {
    apiUi.wantFocus('nod-1');

    expect(apiUi.takeFocus('nod-2')).toBe(false);
    expect(apiUi.takeFocus('nod-1')).toBe(true);
  });

  /** Or a row would steal the focus back on every repaint. */
  it('is spent once', () => {
    apiUi.wantFocus('par-1');

    expect(apiUi.takeFocus('par-1')).toBe(true);
    expect(apiUi.takeFocus('par-1')).toBe(false);
  });

  it('belongs to nobody until it is asked for', () => {
    expect(apiUi.takeFocus('nod-ninguno')).toBe(false);
  });
});

describe('what the panel is showing', () => {
  it('starts on the example, which is what the switch is for', () => {
    expect(apiUi.panelMode).toBe('example');
  });

  it('remembers the mode until it is changed back', () => {
    apiUi.setPanelMode('mock');
    expect(apiUi.panelMode).toBe('mock');
    apiUi.setPanelMode('example');
    expect(apiUi.panelMode).toBe('example');
  });
});

describe('stepping through pages and variants', () => {
  it('starts every block at the first', () => {
    expect(apiUi.step('sin-tocar')).toBe(0);
  });

  /** Stepping a response must not move the request body back to the first. */
  it('keeps each block where it was', () => {
    apiUi.setStep('e1:r1', 2, 3);
    apiUi.setStep('e1:req', 1, 3);
    expect(apiUi.step('e1:r1')).toBe(2);
    expect(apiUi.step('e1:req')).toBe(1);
  });

  it('clamps to what there is: no page before the first, none after the last', () => {
    apiUi.setStep('e2:r1', -1, 3);
    expect(apiUi.step('e2:r1')).toBe(0);
    apiUi.setStep('e2:r1', 9, 3);
    expect(apiUi.step('e2:r1')).toBe(2);
  });

  it('survives a block whose count shrank', () => {
    apiUi.setStep('e3:r1', 5, 6);
    apiUi.setStep('e3:r1', apiUi.step('e3:r1'), 2);
    expect(apiUi.step('e3:r1')).toBe(1);
  });
});

describe('the field to light up', () => {
  it('is spent once, by whoever was named', () => {
    apiUi.wantReveal('nod-1');
    expect(apiUi.takeReveal('nod-2')).toBe(false);
    expect(apiUi.takeReveal('nod-1')).toBe(true);
    expect(apiUi.takeReveal('nod-1')).toBe(false);
  });

  /** Going to look is not going to rewrite: the focus request stays untouched. */
  it('does not ask for the focus', () => {
    apiUi.wantReveal('nod-3');
    expect(apiUi.takeFocus('nod-3')).toBe(false);
    apiUi.takeReveal('nod-3');
  });
});

describe('the field search', () => {
  it('belongs to the contract it was typed in', () => {
    apiUi.setQuery('api-1', 'email');
    expect(apiUi.queryFor('api-1')).toBe('email');
    expect(apiUi.queryFor('api-2')).toBe('');
  });

  it('empties when another contract is searched', () => {
    apiUi.setQuery('api-1', 'email');
    apiUi.setQuery('api-2', 'id');
    expect(apiUi.queryFor('api-1')).toBe('');
    apiUi.setQuery('api-2', '');
  });

  it('forgets the chosen result when the search changes', () => {
    apiUi.setQuery('api-1', 'email');
    apiUi.chosen = 'x';
    apiUi.setQuery('api-1', 'emai');
    expect(apiUi.chosen).toBeNull();
    apiUi.setQuery('api-1', '');
  });
});

describe('whether a dialog is up', () => {
  it('is no while none is', () => {
    expect(apiUi.anyDialogOpen()).toBe(false);
  });

  it('covers every dialog', () => {
    const toggles: [() => void, () => void][] = [
      [() => apiUi.openCreate(), () => apiUi.closeCreate()],
      [() => apiUi.askDelete('api-1'), () => apiUi.cancelDelete()],
      [() => apiUi.openPaste('nod-1'), () => apiUi.closePaste()],
      [() => apiUi.openSources(), () => apiUi.closeSources()],
      [() => apiUi.openLibrary(), () => apiUi.closeLibrary()],
      [() => apiUi.openExport(), () => apiUi.closeExport()],
    ];
    for (const [open, close] of toggles) {
      open();
      expect(apiUi.anyDialogOpen()).toBe(true);
      close();
      expect(apiUi.anyDialogOpen()).toBe(false);
    }
  });
});
