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
