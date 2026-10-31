<script lang="ts" module>
  export interface UnavailableAction {
    label: string;
    primary?: boolean;
    run: () => unknown;
  }
</script>

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
   * `actions` is what the user can do about it, when there is something: retry,
   * grant access to a folder, disconnect it. Data and not markup, like the
   * topbar's actions, so the buttons look the same in every application too.
   */
  interface Props {
    title: string;
    reason: string;
    explain: string;
    actions?: UnavailableAction[];
  }

  let { title, reason, explain, actions = [] }: Props = $props();
  let busy = $state(false);

  async function run(action: UnavailableAction) {
    busy = true;
    try {
      await action.run();
    } finally {
      busy = false;
    }
  }
</script>

<div class="unavailable">
  <h2>{title}</h2>
  <p class="reason">{reason}</p>
  <p class="explain">{explain}</p>
  {#if actions.length > 0}
    <div class="actions">
      {#each actions as action (action.label)}
        <button
          type="button"
          class="btn"
          class:primary={action.primary}
          disabled={busy}
          onclick={() => run(action)}>{action.label}</button
        >
      {/each}
    </div>
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
  .btn {
    height: 32px;
    padding: 0 14px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: none;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    cursor: pointer;
  }
  .btn:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }
  .btn.primary {
    color: var(--accent);
    border-color: var(--accent);
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
