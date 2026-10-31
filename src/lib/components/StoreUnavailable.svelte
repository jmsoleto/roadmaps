<script lang="ts">
  /**
   * What an application shows when its data could not be read.
   *
   * One component and not one copy per application, because
   * `local-persistence` requires it to be recognisably the same everywhere
   * («Un almacén que no se puede abrir se distingue de un almacén vacío»).
   * Decisions and API Hub had each copied the same markup and styles; Roadmaps
   * would have been the third copy.
   *
   * `children` holds what the user can do about it, when there is something:
   * retry, grant access to a folder, disconnect it.
   */
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    reason: string;
    explain: string;
    children?: Snippet;
  }

  let { title, reason, explain, children }: Props = $props();
</script>

<div class="unavailable">
  <h2>{title}</h2>
  <p class="reason">{reason}</p>
  <p class="explain">{explain}</p>
  {#if children}
    <div class="actions">{@render children()}</div>
  {/if}
</div>

<style>
  .unavailable {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    max-width: 560px;
    margin: 48px auto;
    padding: 24px;
    background: var(--tint-danger);
    border: var(--line-width) solid var(--line);
    border-left: 2px solid var(--danger);
    border-radius: 8px;
  }
  h2 {
    margin: 0;
    font-size: 18px;
    color: var(--text);
  }
  .reason {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    color: var(--danger);
  }
  .explain {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--text-dim);
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
</style>
