<script lang="ts">
  /**
   * API Hub's screen.
   *
   * Two states, and the application decides which: its home — the contracts,
   * where they are created, renamed, reordered and deleted — and one contract
   * open. The field tree, the endpoints and the export arrive in the changes
   * that follow; what this one settles is where they will hang from.
   *
   * The three loading states are the ones `local-persistence` asks for and are
   * deliberately distinguishable: still opening, could not open, and open but
   * empty. Showing an empty list over contracts that were not read is the
   * mistake the whole seam exists to prevent.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { apiUi } from '../../api/ui.svelte';
  import { usage } from '../../hub/usage.svelte';
  import { API_ID } from '../../hub/apps';
  import { theme } from '../../theme/theme.svelte';

  let newTitle = $state('');
  let titleEl = $state<HTMLInputElement | null>(null);
  let newEl = $state<HTMLInputElement | null>(null);

  const open = $derived(apiContracts.open);

  function create() {
    const contract = apiContracts.addContract(newTitle);
    newTitle = '';
    apiUi.closeCreate();
    if (contract) {
      usage.touch(API_ID, contract.id);
      // Straight into the contract with the cursor on its title: the name typed
      // in the list was a first guess, and this is a live refinement.
      queueMicrotask(() => titleEl?.select());
    }
  }

  function openContract(id: string) {
    apiContracts.setOpen(id);
    usage.touch(API_ID, id);
  }

  // Focus the new-contract field whenever the form appears, wherever it was
  // opened from — the list's button or the topbar's action.
  $effect(() => {
    if (apiUi.creating) newEl?.focus();
  });
</script>

{#if !apiContracts.ready}
  <!-- Not "there is nothing": "we do not know yet". -->
  <div class="loading">Abriendo los contratos…</div>
{:else if apiContracts.unavailable}
  <div class="unavailable">
    <h2>Los contratos no están disponibles</h2>
    <p class="reason">{apiContracts.unavailable.reason}</p>
    <p class="explain">
      No se muestra una lista vacía a propósito: podría haber contratos guardados que no se han
      podido leer, y escribir encima sería irreversible. El resto del hub sigue funcionando con
      normalidad.
    </p>
  </div>
{:else if open}
  <div class="contract">
    <div class="fields">
      <label class="field wide">
        <span>Título</span>
        <input
          bind:this={titleEl}
          class="in"
          value={open.title}
          oninput={(e) => apiContracts.setTitle(open.id, e.currentTarget.value)}
        />
      </label>
      <label class="field">
        <span>Versión</span>
        <input
          class="in mono"
          value={open.version}
          placeholder="1.0.0"
          oninput={(e) => apiContracts.setVersion(open.id, e.currentTarget.value)}
        />
      </label>
      <label class="field wide">
        <span>Servidor base</span>
        <input
          class="in mono"
          value={open.server}
          placeholder="https://api.ejemplo.com"
          oninput={(e) => apiContracts.setServer(open.id, e.currentTarget.value)}
        />
      </label>
      <label class="field full">
        <span>Descripción</span>
        <textarea
          class="in"
          rows="2"
          value={open.description}
          oninput={(e) => apiContracts.setDescription(open.id, e.currentTarget.value)}
        ></textarea>
      </label>
    </div>

    <div class="pending">
      <p>
        Este contrato todavía no tiene endpoints ni modelos: el editor del árbol de campos y la
        exportación a OpenAPI llegan en los cambios siguientes.
      </p>
    </div>
  </div>
{:else}
  <div class="home">
    <div class="head">
      <h2>Contratos</h2>
      <span class="spacer"></span>
      {#if !apiUi.creating}
        <button class="btn" onclick={() => apiUi.openCreate()}>+ nuevo contrato</button>
      {/if}
    </div>

    {#if apiUi.creating}
      <form
        class="create"
        onsubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <input
          bind:this={newEl}
          bind:value={newTitle}
          class="in"
          placeholder="nombre de la API"
          aria-label="nombre de la API"
        />
        <button class="btn primary" type="submit">crear</button>
        <button
          class="btn"
          type="button"
          onclick={() => {
            newTitle = '';
            apiUi.closeCreate();
          }}>cancelar</button
        >
      </form>
    {/if}

    {#if apiContracts.contracts.length === 0}
      {#if !apiUi.creating}
        <p class="empty">
          Aquí van los contratos de API que se acuerdan en refinamiento. Crea el primero y edítalo
          mientras lo habláis.
        </p>
      {/if}
    {:else}
      <ul class="list">
        {#each apiContracts.contracts as c, i (c.id)}
          <li class="row" class:danger={apiUi.deletingId === c.id}>
            <span class="dot" style:background={theme.slotColor(c.colorSlot)}></span>
            <button class="name" onclick={() => openContract(c.id)}>{c.title}</button>
            <span class="ver">{c.version.trim() === '' ? 'sin versión' : `v${c.version}`}</span>
            <span class="counts">
              {c.endpoints.length} endpoints · {c.models.length} modelos
            </span>
            <div class="acts">
              <button
                class="icon"
                title="subir"
                disabled={i === 0}
                onclick={() => apiContracts.moveContract(c.id, i - 1)}>↑</button
              >
              <button
                class="icon"
                title="bajar"
                disabled={i === apiContracts.contracts.length - 1}
                onclick={() => apiContracts.moveContract(c.id, i + 1)}>↓</button
              >
              <button
                class="icon"
                title="duplicar"
                onclick={() => apiContracts.duplicateContract(c.id)}>⧉</button
              >
              {#if apiUi.deletingId === c.id}
                <!-- Confirmation in place rather than a `confirm()`: it cannot be
                     styled, it steals focus, and it would make the store
                     undrivable from a test. -->
                <button
                  class="icon warn"
                  title="confirmar borrado"
                  onclick={() => {
                    apiContracts.deleteContract(c.id);
                    apiUi.cancelDelete();
                  }}>¿borrar?</button
                >
                <button class="icon" title="cancelar" onclick={() => apiUi.cancelDelete()}>✕</button
                >
              {:else}
                <button class="icon" title="borrar" onclick={() => apiUi.askDelete(c.id)}>🗑</button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  /* Everything below is theme tokens, never a literal: the application follows
     the theme, and only its icon does not (D7). */
  .loading {
    padding: 48px 16px;
    text-align: center;
    color: var(--text-dim);
    font-size: 13.5px;
  }
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
  .unavailable h2 {
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

  .home,
  .contract {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px 24px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }
  .head h2 {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .spacer {
    flex: 1;
  }
  .empty {
    margin: 0;
    max-width: 52ch;
    color: var(--text-dim);
    font-size: 13.5px;
    line-height: 1.5;
  }

  .create {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }
  .create .in {
    max-width: 320px;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;
    border: var(--line-width) solid transparent;
  }
  .row:hover {
    background: var(--hover);
  }
  .row.danger {
    border-color: var(--danger);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
    border: var(--line-width) solid var(--bar-border);
  }
  .name {
    background: none;
    border: none;
    padding: 0;
    color: var(--text);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name:hover {
    color: var(--accent);
  }
  .ver,
  .counts {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .counts {
    flex: 1;
    text-align: right;
  }
  .acts {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .icon {
    background: none;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    height: 26px;
    padding: 0 7px;
    cursor: pointer;
  }
  .icon:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }
  .icon:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .icon.warn {
    color: var(--danger);
    border-color: var(--danger);
  }

  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    max-width: 860px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .field.wide {
    grid-column: span 2;
  }
  .field.full {
    grid-column: 1 / -1;
  }
  .field span {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .in {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    color: var(--text);
    font-family: inherit;
    font-size: 13.5px;
    padding: 7px 9px;
    outline: none;
    resize: vertical;
  }
  .in.mono {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
  }
  .in:focus {
    border-color: var(--accent);
  }
  .btn {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    height: 32px;
    padding: 0 12px;
    cursor: pointer;
  }
  .btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
  }
  .pending {
    margin-top: 22px;
    padding-top: 16px;
    border-top: var(--line-width) solid var(--line-weak);
    max-width: 60ch;
  }
  .pending p {
    margin: 0;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.5;
  }
</style>
