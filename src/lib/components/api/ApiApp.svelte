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
  import ContractRail from './ContractRail.svelte';
  import EndpointEditor from './EndpointEditor.svelte';
  import ExamplePanel from './ExamplePanel.svelte';
  import PasteJsonDialog from './PasteJsonDialog.svelte';
  import ExportDialog from './ExportDialog.svelte';

  let newTitle = $state('');
  let newEl = $state<HTMLInputElement | null>(null);

  const open = $derived(apiContracts.open);
  const endpoint = $derived(apiContracts.openEndpoint);

  function create() {
    const contract = apiContracts.addContract(newTitle);
    newTitle = '';
    apiUi.closeCreate();
    if (contract) usage.touch(API_ID, contract.id);
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
    <ContractRail contract={open} />

    <div class="work">
      {#if endpoint}
        <EndpointEditor {endpoint} />
      {:else if open.endpoints.length === 0}
        <p class="nothing">
          Este contrato no tiene endpoints todavía. Crea el primero desde el raíl y descríbelo
          mientras lo habláis.
        </p>
      {:else}
        <p class="nothing">Elige un endpoint en el raíl para describirlo.</p>
      {/if}
    </div>

    {#if endpoint}
      <ExamplePanel {endpoint} />
    {/if}
  </div>

  <PasteJsonDialog />
  <ExportDialog />
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

  .home {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px 24px;
  }
  /* Rail, work, example: three columns that each scroll on their own, so the
     endpoint list stays put while a long body is being described. */
  .contract {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: stretch;
  }
  .work {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }
  .nothing {
    margin: 0;
    padding: 28px 24px;
    max-width: 52ch;
    color: var(--text-dim);
    font-size: 13.5px;
    line-height: 1.5;
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
    color: var(--ink-on-accent);
  }
</style>
