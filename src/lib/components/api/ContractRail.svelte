<script lang="ts">
  /**
   * The contract's own column: what the API is, and what it has.
   *
   * The API's data moved here from the middle of the screen (D9). It stopped
   * being the screen and became what it is — the document's header, consultable
   * while you work but not the work itself.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { apiUi } from '../../api/ui.svelte';
  import { goTo } from '../../api/navigate';
  import { searchContract, type SearchHit } from '../../api/model/search';
  import { isMacLike, searchShortcutLabel } from '../../api/keyboard';
  import type { Contract } from '../../api/model/types';

  interface Props {
    contract: Contract;
  }

  let { contract }: Props = $props();

  const view = $derived(apiContracts.viewOf(contract));
  const openEndpointId = $derived(view?.kind === 'endpoint' ? view.id : null);
  const openModelId = $derived(view?.kind === 'model' ? view.id : null);

  // ---- the field search ----
  //
  // Recomputed on every keystroke and on every edit of the contract (D4): a few
  // hundred fields and an `includes` cost less than a frame, and an index would
  // age against a tree that is edited constantly.

  const query = $derived(apiUi.queryFor(contract.id));
  const hits = $derived(searchContract(contract, query));
  const searching = $derived(query !== '');

  /** One heading per place, the fields under it: `GET /x` is not repeated per line. */
  const groups = $derived.by(() => {
    const out: { where: string; items: { hit: SearchHit; index: number }[] }[] = [];
    hits.forEach((hit, index) => {
      const last = out[out.length - 1];
      if (last?.where === hit.where) last.items.push({ hit, index });
      else out.push({ where: hit.where, items: [{ hit, index }] });
    });
    return out;
  });

  const shortcut = searchShortcutLabel(isMacLike(navigator.platform));

  let hi = $state(0);
  let listEl = $state<HTMLDivElement | null>(null);

  const keyOf = (hit: SearchHit) => `${hit.where}|${hit.itemId ?? hit.path}`;

  $effect(() => {
    if (hi >= hits.length) hi = 0;
  });

  $effect(() => {
    const idx = hi;
    listEl?.querySelector<HTMLElement>(`#fs-opt-${idx}`)?.scrollIntoView({ block: 'nearest' });
  });

  function choose(index: number) {
    const hit = hits[index];
    if (!hit) return;
    hi = index;
    apiUi.chosen = keyOf(hit);
    goTo(hit.target, hit.itemId);
  }

  function onSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      apiUi.setQuery(contract.id, '');
      const back = apiUi.searchReturn;
      apiUi.searchReturn = null;
      if (back?.isConnected) back.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hits.length) hi = (hi + 1) % hits.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hits.length) hi = (hi - 1 + hits.length) % hits.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(hi);
    }
  }

  const REASONS: Record<SearchHit['reason'], string> = {
    key: 'clave',
    param: 'parámetro',
    description: 'descripción',
  };
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

  <!-- Entre la ficha de la API y las listas: al sustituirlas, la caja no salta. -->
  <div class="search">
    <input
      id="api-field-search"
      class="mono"
      type="text"
      value={query}
      oninput={(e) => apiUi.setQuery(contract.id, e.currentTarget.value)}
      onkeydown={onSearchKeydown}
      placeholder="buscar campo…"
      aria-label="buscar campo en el contrato"
      aria-controls="fs-list"
      aria-activedescendant={searching && hits.length ? `fs-opt-${hi}` : undefined}
      spellcheck="false"
      autocomplete="off"
    />
    <kbd class="hint" aria-hidden="true">{shortcut}</kbd>
  </div>

  {#if searching}
    <div class="section">
      <h3>
        {hits.length === 0
          ? 'Sin coincidencias'
          : hits.length === 1
            ? '1 coincidencia'
            : `${hits.length} coincidencias`}
      </h3>
      {#if hits.length === 0}
        <p class="empty">Ninguna clave, parámetro ni descripción de este contrato lo contiene.</p>
      {:else}
        <div class="results" id="fs-list" role="listbox" bind:this={listEl}>
          {#each groups as group (group.where)}
            <div class="group" role="group" aria-label={group.where}>
              <div class="where">{group.where}</div>
              {#each group.items as { hit, index } (keyOf(hit))}
                <button
                  type="button"
                  class="hit"
                  class:hl={index === hi}
                  class:current={apiUi.chosen === keyOf(hit)}
                  id="fs-opt-{index}"
                  role="option"
                  aria-selected={index === hi}
                  aria-current={apiUi.chosen === keyOf(hit) ? 'true' : undefined}
                  title="coincide por la {REASONS[hit.reason]}"
                  onmousemove={() => (hi = index)}
                  onclick={() => choose(index)}
                >
                  <span class="line">
                    <span class="hpath">{hit.path}</span>
                    <span class="htype">{hit.type}</span>
                  </span>
                  {#if hit.snippet}
                    <span class="snip"
                      >«{hit.snippet.before}<mark>{hit.snippet.match}</mark>{hit.snippet
                        .after}»</span
                    >
                  {/if}
                </button>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
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
        <button class="icon" title="traer de la biblioteca" onclick={() => apiUi.openLibrary()}
          >↓</button
        >
        <button class="icon" title="añadir modelo" onclick={() => apiContracts.addModel()}>+</button
        >
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
  {/if}
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
  .search {
    position: relative;
  }
  .search input {
    padding-right: 52px;
  }
  .hint {
    position: absolute;
    right: 7px;
    top: 50%;
    transform: translateY(-50%);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: var(--text-dim);
    opacity: 0.6;
    pointer-events: none;
  }
  .results {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .where {
    padding: 0 7px 2px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-mid);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hit {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 4px 7px 4px 14px;
    background: none;
    border: none;
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
  }
  .hit.hl {
    background: var(--hover);
  }
  .hit.current {
    background: var(--tint-selected);
    color: var(--accent);
  }
  .line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  /* Wraps instead of truncating: the end of a path is the field that was
     found, so an ellipsis would cut exactly the part being looked for. */
  .hpath {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--text);
  }
  .hit.current .hpath {
    color: var(--accent);
  }
  .htype {
    flex-shrink: 0;
    font-size: 10.5px;
    opacity: 0.8;
  }
  .snip {
    font-family: 'Inter', sans-serif;
    font-size: 11.5px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .snip mark {
    background: var(--tint-accent-soft);
    color: var(--accent);
    border-radius: 2px;
  }
  .empty {
    margin: 0;
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.8;
  }
</style>
