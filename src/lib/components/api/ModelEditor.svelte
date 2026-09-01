<script lang="ts">
  /**
   * One reusable block: what it is, its shape, and who depends on it.
   *
   * The shape is the same `TreeBlock` a response body uses — a model is a body
   * with a name. What is its own is the header and the **used in**, which is
   * what has to be looked at before touching it: changing a field here changes
   * every contract that points at this.
   */
  import { apiContracts } from '../../api/store.svelte';
  import TreeBlock from './TreeBlock.svelte';
  import type { ApiModel } from '../../api/model/types';

  interface Props {
    model: ApiModel;
  }

  let { model }: Props = $props();

  let confirmDelete = $state(false);

  const uses = $derived(apiContracts.usesOf(model.id));

  // Leaving the model must not leave a delete half-confirmed behind.
  $effect(() => {
    void model.id;
    confirmDelete = false;
  });
</script>

<div class="editor">
  <div class="bar" oninput={() => apiContracts.touch()}>
    <span class="kind">modelo</span>
    <input class="name" bind:value={model.name} spellcheck="false" aria-label="nombre del modelo" />
    <button class="btn" onclick={() => apiContracts.duplicateModel(model.id)}>duplicar</button>
    {#if confirmDelete}
      <button
        class="btn danger"
        onclick={() => {
          apiContracts.deleteModel(model.id);
          confirmDelete = false;
        }}
        >{uses.length === 0
          ? '¿borrar?'
          : uses.length === 1
            ? '¿borrar y romper 1 referencia?'
            : `¿borrar y romper ${uses.length} referencias?`}</button
      >
      <button class="btn" onclick={() => (confirmDelete = false)}>✕</button>
    {:else}
      <button class="btn" onclick={() => (confirmDelete = true)}>borrar</button>
    {/if}
  </div>

  <section class="meta" oninput={() => apiContracts.touch()}>
    <label class="field">
      <span>Para qué sirve este modelo</span>
      <textarea bind:value={model.description} rows="2"></textarea>
    </label>
  </section>

  <section>
    <header>
      <h3>Estructura</h3>
      <span class="hint">se exporta como un schema con nombre dentro del documento</span>
    </header>
    <TreeBlock label="modelo" root={model.node} />
  </section>

  <section>
    <header><h3>Usado en</h3></header>
    {#if uses.length === 0}
      <p class="empty">
        Todavía no lo usa ningún campo. Apunta un campo a él con el tipo «ref», o extráelo desde un
        bloque que ya esté escrito.
      </p>
    {:else}
      <ul class="uses">
        {#each uses as where (where)}
          <li>{where}</li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 16px 20px 40px;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .kind {
    flex-shrink: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  h3 {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .hint,
  .empty {
    color: var(--text-dim);
    font-size: 12.5px;
    line-height: 1.5;
  }
  .empty {
    margin: 0;
    max-width: 60ch;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-width: 620px;
  }
  .field span {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  input,
  textarea {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    padding: 7px;
    outline: none;
    min-width: 0;
  }
  textarea {
    font-family: inherit;
    font-size: 13.5px;
    resize: vertical;
  }
  input:focus,
  textarea:focus {
    border-color: var(--accent);
  }
  .uses {
    margin: 0;
    padding-left: 18px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    line-height: 1.7;
  }
  .btn {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    height: 28px;
    padding: 0 9px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .btn.danger {
    color: var(--danger);
    border-color: var(--danger);
  }
</style>
