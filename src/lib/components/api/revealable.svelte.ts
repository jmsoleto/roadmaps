/**
 * `use:revealable={id}`: the row scrolls into view and lights up when asked.
 *
 * An action rather than an effect inside `TreeNode`, because a parameter row is
 * not a component — it is an `{#each}` in the endpoint editor — and both have to
 * answer the same way (D6). It does not touch the focus: going to look at a
 * field is not going to rewrite it.
 *
 * The highlight is a class with a global rule (`app.css`): it is added by hand,
 * so a scoped style would be pruned as unused.
 */

import { untrack } from 'svelte';
import { apiUi } from '../../api/ui.svelte';

const LIT_MS = 1500;

function quiet(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function revealable(el: HTMLElement, id: string) {
  let current = id;
  let timer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (apiUi.pendingReveal !== current) return;
    untrack(() => apiUi.takeReveal(current));
    el.scrollIntoView({ block: 'center', behavior: quiet() ? 'auto' : 'smooth' });
    // Off and on again, so that revealing the same row twice lights it twice.
    el.classList.remove('revealed');
    void el.offsetWidth;
    el.classList.add('revealed');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('revealed'), LIT_MS);
  });

  return {
    update(next: string) {
      current = next;
    },
    destroy() {
      if (timer) clearTimeout(timer);
    },
  };
}
