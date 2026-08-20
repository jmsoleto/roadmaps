<script lang="ts">
  /**
   * A phase's completion percentage, travelling to its new value instead of
   * jumping to it.
   *
   * Its own component because a `Tween` is per-phase state, and state cannot be
   * declared inside an `{#each}` in the template.
   *
   * There is no "did this just change or is it just appearing?" problem to solve
   * here, unlike the mark in the item drawer: `Tween` seeds both its current and
   * its target with the value handed to it, so a freshly mounted one is already
   * at its destination and stays put. Silence on mount is a consequence of
   * seeding it right, not a programmed exception (D3).
   *
   * The caller is responsible for remounting this when the phase changes
   * identity — see the `{#key}` in `Gantt.svelte`.
   */
  import { Tween, prefersReducedMotion } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  let { value }: { value: number } = $props();

  // Reading the prop non-reactively is the whole point here: this seeds the tween
  // with the value the phase already has, which is what makes a freshly mounted
  // one silent. Later values arrive through the effect below.
  // svelte-ignore state_referenced_locally
  const shown = new Tween(value, { easing: cubicOut });

  $effect(() => {
    // Duration resolved per set rather than once at construction: `Tween` only
    // short-circuits to an instant assignment when it sees a literal 0, so the
    // reduced-motion case has to be decided here to actually be instant.
    shown.set(value, { duration: prefersReducedMotion.current ? 0 : 500 });
  });

  const pct = $derived(Math.round(shown.current));
</script>

<span class="pct" class:full={pct === 100} title="items completados de la fase">{pct}%</span>

<style>
  /* Monospace with tabular figures so the digits keep their width: it stops the
     number from shoving the phase name sideways, and it is the same property
     that keeps a counting number from jittering. */
  .pct {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    color: var(--text-dim);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .pct.full {
    color: var(--accent);
  }
</style>
