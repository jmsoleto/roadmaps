<script lang="ts">
  /**
   * The contract's own column: what the API is, and what it has.
   *
   * The API's data moved here from the middle of the screen (D9). It stopped
   * being the screen and became what it is — the document's header, consultable
   * while you work but not the work itself.
   */
  import { apiContracts } from '../../api/store.svelte';
  import type { Contract } from '../../api/model/types';

  interface Props {
    contract: Contract;
  }

  let { contract }: Props = $props();

  const openEndpointId = $derived(contract.view?.kind === 'endpoint' ? contract.view.id : null);
  const openModelId = $derived(contract.view?.kind === 'model' ? contract.view.id : null);
</script>

<aside class="rail">
  <div class="section" oninput={() => apiContracts.touch()}>
    <h3>API</h3>
    <label class="field">
      <span>Título</span>
      <input bind:value={contract.title} />
    </label>
    <label class="field">
      <span>Versión</span>
      <input class="mono" bind:value={contract.version} placeholder="1.0.0" />
    </label>
    <label class="field">
      <span>Servidor base</span>
      <input class="mono" bind:value={contract.server} placeholder="https://api.ejemplo.com" />
    </label>
    <label class="field">
      <span>Descripción</span>
      <textarea rows="2" bind:value={contract.description}></textarea>
    </label>
  </div>

  <div class="section">
    <h3>
      Endpoints
      <span class="spacer"></span>
      <button class="icon" title="añadir endpoint" onclick={() => apiContracts.addEndpoint()}
        >+</button
      >
    </h3>

    {#if contract.endpoints.length === 0}
      <p class="empty">Ninguno todavía. Empieza por el que estéis hablando.</p>
    {:else}
      <ul class="list">
        {#each contract.endpoints as endpoint (endpoint.id)}
          <li>
            <button
              class="ep"
              class:current={endpoint.id === openEndpointId}
              onclick={() => apiContracts.setView({ kind: 'endpoint', id: endpoint.id })}
            >
              <span class="method">{endpoint.method}</span>
              <span class="path">{endpoint.path}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="section">
    <h3>
      Modelos
      <span class="spacer"></span>
      <button class="icon" title="añadir modelo" onclick={() => apiContracts.addModel()}>+</button>
    </h3>

    {#if contract.models.length === 0}
      <p class="empty">
        Ninguno. Extrae un bloque que ya esté escrito, o crea uno para dejar de repetirlo.
      </p>
    {:else}
      <ul class="list">
        {#each contract.models as model (model.id)}
          <li>
            <button
              class="ep"
              class:current={model.id === openModelId}
              onclick={() => apiContracts.setView({ kind: 'model', id: model.id })}
            >
              <span class="path">{model.name}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</aside>

<style>
  .rail {
    width: 260px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 16px 14px 40px;
    border-right: var(--line-width) solid var(--line-weak);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  h3 {
    display: flex;
    align-items: center;
    gap: 6px;
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
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field span {
    font-size: 11px;
    color: var(--text-dim);
  }
  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text);
    font-family: inherit;
    font-size: 13px;
    padding: 6px 8px;
    outline: none;
    resize: vertical;
  }
  .mono {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }
  input:focus,
  textarea:focus {
    border-color: var(--accent);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .ep {
    display: flex;
    align-items: baseline;
    gap: 7px;
    width: 100%;
    padding: 5px 7px;
    background: none;
    border: none;
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }
  .ep:hover {
    background: var(--hover);
  }
  .ep.current {
    background: var(--tint-selected);
    color: var(--accent);
  }
  .method {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    opacity: 0.8;
  }
  .path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .icon {
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
  .icon:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .empty {
    margin: 0;
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.8;
  }
</style>
