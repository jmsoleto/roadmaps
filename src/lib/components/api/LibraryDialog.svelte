<script lang="ts">
  /**
   * The model library: what is in it, and bringing one into this contract.
   *
   * Two states. Normally it is a list and one click brings an entry — the
   * no-collision case, which is the common one. When what arrives shares a name
   * with a model the contract already has, it becomes one line per collision
   * with two ways out (design decision D3).
   *
   * Renaming to `Paginacion2` without asking would produce exactly the
   * divergence the library exists to prevent, and reusing without asking would
   * change what the brought block described. Neither can be chosen on the
   * user's behalf — but only when it actually happens.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { apiLibrary } from '../../api/library.svelte';
  import { apiUi } from '../../api/ui.svelte';
  import { collisionsOf, type Collision, type Resolution } from '../../api/library/bring';
  import { entryDependencies, entryModel } from '../../api/library/types';
  import { exportLibrary, parseLibraryImport, LIBRARY_FILENAME } from '../../api/library/io';
  import { downloadText } from '../../hub/download';

  let panelEl = $state<HTMLDivElement | null>(null);
  let opener: HTMLElement | null = null;
  let error = $state<string | null>(null);

  /** The entry being brought once its collisions have to be resolved. */
  let decidingId = $state<string | null>(null);
  let decisions = $state<Record<string, Resolution>>({});
  let collisions = $state<Collision[]>([]);

  const contract = $derived(apiContracts.open);
  const entries = $derived(apiLibrary.entries);

  function close() {
    apiUi.closeLibrary();
    decidingId = null;
    decisions = {};
    collisions = [];
    error = null;
    opener?.focus();
    opener = null;
  }

  /** Bring an entry, stopping to ask only if something collides. */
  function bring(entryId: string) {
    if (!contract) return;
    const entry = apiLibrary.entry(entryId);
    if (!entry) return;

    const found = collisionsOf(contract, entry);
    if (found.length === 0) {
      commit(entryId, new Map());
      return;
    }
    // Default to reusing what is already here: converging on one name is what
    // the library is for. Visible as a control, never by omission.
    decidingId = entryId;
    collisions = found;
    decisions = Object.fromEntries(found.map((c) => [c.libraryId, 'reutilizar' as Resolution]));
  }

  function commit(entryId: string, chosen: ReadonlyMap<string, Resolution>) {
    if (!contract) return;
    const brought = apiLibrary.bring(contract, entryId, chosen);
    if (!brought) {
      error = 'No se pudo traer esa entrada.';
      return;
    }
    apiContracts.addBroughtModels(brought.models, brought.broughtId);
    close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (decidingId !== null) {
        decidingId = null;
        collisions = [];
        return;
      }
      close();
      return;
    }
    if (e.key !== 'Tab' || !panelEl) return;
    const focusables = [...panelEl.querySelectorAll<HTMLElement>('button:not(:disabled), input')];
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      error = null;
      apiLibrary.append(parseLibraryImport(await file.text()));
    } catch (err) {
      error = err instanceof Error ? err.message : 'No se pudo importar el archivo.';
    }
  }

  $effect(() => {
    if (!apiUi.library) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelEl?.querySelector<HTMLElement>('button')?.focus();
  });

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES');
  };
</script>

{#if apiUi.library}
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="lib-title"
    tabindex="-1"
    onkeydown={onKeydown}
  >
    <button type="button" class="overlay-hit" aria-label="cerrar" tabindex="-1" onclick={close}
    ></button>

    <div class="panel" bind:this={panelEl}>
      <header>
        <h2 id="lib-title">Biblioteca de modelos</h2>
        <span class="spacer"></span>
        <button type="button" class="btn" onclick={close}>cerrar</button>
      </header>

      {#if decidingId !== null}
        <p class="hint">
          Ya tienes modelos con estos nombres. Reutilizar el tuyo es lo que hace que los dos
          contratos hablen del mismo bloque; traerlo aparte conserva el de la biblioteca tal cual.
        </p>

        <div class="collisions">
          {#each collisions as c (c.libraryId)}
            <div class="collision">
              <div class="cname">{c.name}</div>
              <label>
                <input
                  type="radio"
                  checked={decisions[c.libraryId] === 'reutilizar'}
                  onchange={() => (decisions = { ...decisions, [c.libraryId]: 'reutilizar' })}
                />
                el tuyo — {c.mineFields}
                {c.mineFields === 1 ? 'campo' : 'campos'}
              </label>
              <label>
                <input
                  type="radio"
                  checked={decisions[c.libraryId] === 'traer'}
                  onchange={() => (decisions = { ...decisions, [c.libraryId]: 'traer' })}
                />
                el de la biblioteca — {c.theirsFields}
                {c.theirsFields === 1 ? 'campo' : 'campos'}, aparte
              </label>
            </div>
          {/each}
        </div>

        <div class="actions">
          <span class="spacer"></span>
          <button
            type="button"
            class="btn"
            onclick={() => {
              decidingId = null;
              collisions = [];
            }}>volver</button
          >
          <button
            type="button"
            class="btn primary"
            onclick={() => commit(decidingId!, new Map(Object.entries(decisions)))}>traer</button
          >
        </div>
      {:else}
        {#if !apiLibrary.ready}
          <p class="hint">Abriendo la biblioteca…</p>
        {:else if apiLibrary.unavailable}
          <p class="error">
            La biblioteca no está disponible: {apiLibrary.unavailable.reason}
          </p>
        {:else if entries.length === 0}
          <p class="hint">
            Está vacía. Se llena guardando un modelo desde su editor, y lo que se guarde aquí sirve
            en cualquier otro contrato.
          </p>
        {:else}
          <ul class="list">
            {#each entries as entry (entry.id)}
              {@const deps = entryDependencies(entry)}
              <li>
                <div class="row">
                  <span class="name">{entry.name}</span>
                  <span class="meta">
                    {entryModel(entry)?.node?.children?.length ?? 0} campos
                    {#if deps.length > 0}
                      · trae {deps.map((d) => d.name).join(', ')}
                    {/if}
                  </span>
                  <span class="spacer"></span>
                  <span class="meta">{fmt(entry.updated)}</span>
                  <button
                    type="button"
                    class="btn"
                    disabled={contract === null}
                    title={contract === null ? 'abre un contrato para traerlo' : 'traer'}
                    onclick={() => bring(entry.id)}>traer</button
                  >
                  <button
                    type="button"
                    class="btn"
                    title="quitar de la biblioteca"
                    onclick={() => apiLibrary.remove(entry.id)}>✕</button
                  >
                </div>
                {#if entry.description}<p class="desc">{entry.description}</p>{/if}
              </li>
            {/each}
          </ul>
        {/if}

        {#if error}<p class="error" role="alert">{error}</p>{/if}

        <div class="actions">
          <!-- Here, and not in the topbar: this is where the library is being
               looked at, and moving it between machines is the only way what is
               in it reaches anybody else. -->
          <label class="btn file">
            ↓ importar
            <input type="file" accept="application/json,.json" onchange={onImport} />
          </label>
          <button
            type="button"
            class="btn"
            disabled={entries.length === 0}
            onclick={() => downloadText(LIBRARY_FILENAME, exportLibrary(entries))}
            >↑ exportar</button
          >
          <span class="spacer"></span>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--shadow-strong);
  }
  .overlay-hit {
    position: absolute;
    inset: 0;
    border: none;
    background: none;
    cursor: default;
  }
  .panel {
    position: relative;
    width: min(680px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
    box-shadow: 0 12px 40px var(--shadow-strong);
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    color: var(--text);
  }
  .spacer {
    flex: 1;
  }
  .hint,
  .desc {
    margin: 0;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.5;
  }
  .error {
    margin: 0;
    color: var(--danger);
    font-size: 12.5px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--text);
  }
  .meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .desc {
    padding-left: 2px;
    font-size: 12.5px;
  }
  .collisions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .collision {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding: 9px 11px;
    background: var(--surface-2);
    border-left: 2px solid var(--accent);
    border-radius: 5px;
  }
  .cname {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    color: var(--text);
    min-width: 120px;
  }
  .collision label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-dim);
    font-size: 12.5px;
    cursor: pointer;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    height: 30px;
    padding: 0 11px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--ink-on-accent);
  }
  .btn.primary:hover {
    color: var(--ink-on-accent);
  }
  .btn.file {
    display: inline-flex;
    align-items: center;
  }
  .btn.file input {
    display: none;
  }
</style>
