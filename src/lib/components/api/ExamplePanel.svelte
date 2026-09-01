<script lang="ts">
  /**
   * The JSON the contract describes, kept up to date while it is edited (D4).
   *
   * The prototype hid this behind a per-tree toggle. It is open by default here
   * because of what the tool is for: with the screen projected, the other person
   * watches the shape of the response appear while you type the field names, and
   * a control nobody presses turns that into nothing.
   *
   * It folds because the tree needs the width too.
   */
  import { apiUi } from '../../api/ui.svelte';
  import { exampleOf } from '../../api/example';
  import type { ApiEndpoint, ApiModel } from '../../api/model/types';

  interface Props {
    /** The endpoint being edited, when it is one. */
    endpoint: ApiEndpoint | null;
    /** The model being edited, when it is one instead. */
    model: ApiModel | null;
    /** The contract's models, so a reference shows the shape it points at. */
    models: readonly ApiModel[];
  }

  let { endpoint, model, models }: Props = $props();

  /** Every body on screen, each under the heading it answers to. */
  const blocks = $derived(
    model !== null
      ? [{ id: model.id, label: `modelo ${model.name}`, body: model.node }]
      : endpoint === null
        ? []
        : [
            ...(endpoint.body
              ? [
                  {
                    id: 'req',
                    label: `${endpoint.method} ${endpoint.path} · petición`,
                    body: endpoint.body,
                  },
                ]
              : []),
            ...endpoint.responses
              .filter((r) => r.body !== null)
              .map((r) => ({ id: r.id, label: `respuesta ${r.code}`, body: r.body! })),
          ],
  );
</script>

{#if apiUi.exampleOpen}
  <aside class="panel">
    <header>
      <h3>Ejemplo</h3>
      <span class="spacer"></span>
      <button class="icon" title="ocultar el ejemplo" onclick={() => apiUi.toggleExample()}
        >▸</button
      >
    </header>

    {#if blocks.length === 0}
      <p class="empty">No hay ningún cuerpo que enseñar todavía.</p>
    {:else}
      {#each blocks as block (block.id)}
        <div class="block">
          <div class="label">{block.label}</div>
          <pre>{JSON.stringify(exampleOf(block.body, models), null, 2)}</pre>
        </div>
      {/each}
    {/if}
  </aside>
{:else}
  <button class="reveal" title="ver el ejemplo" onclick={() => apiUi.toggleExample()}>◂</button>
{/if}

<style>
  .panel {
    width: 320px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 16px 14px 40px;
    border-left: var(--line-width) solid var(--line-weak);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  h3 {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .spacer {
    flex: 1;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
    opacity: 0.8;
  }
  pre {
    margin: 0;
    padding: 10px;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line-weak);
    border-radius: 6px;
    color: var(--text-mid);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    line-height: 1.55;
    overflow-x: auto;
    white-space: pre;
  }
  .empty {
    margin: 0;
    color: var(--text-dim);
    font-size: 12.5px;
    line-height: 1.5;
  }
  .icon,
  .reveal {
    background: none;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    height: 22px;
    padding: 0 7px;
    cursor: pointer;
  }
  .icon:hover,
  .reveal:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  /* Folded, it leaves a hairline the width of one control, so the way back is
     visible without costing the tree anything worth having. */
  .reveal {
    flex-shrink: 0;
    align-self: flex-start;
    margin: 16px 8px 0 0;
  }
</style>
