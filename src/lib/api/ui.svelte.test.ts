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
