<script lang="ts">
  /**
   * Modal that names a roadmap before it exists (roadmap-editor).
   *
   * Creating used to be one press: the store invented "Roadmap N" and jumped
   * straight into it. Nothing is created here until the name is valid and
   * accepted, so cancelling by any route leaves the app exactly as it was.
   *
   * This is the app's first true modal — everything else that floats is a side
   * drawer or a popover anchored to its trigger — so the dialog obligations are
   * all handled locally: initial focus, focus trap, Escape, click on the
   * overlay, and focus returned to whatever opened it.
   */
  import { store } from '../store/app.svelte';
  import { usage } from '../hub/usage.svelte';
  import { ROADMAPS_ID } from '../hub/apps';
  import { ui } from '../store/ui.svelte';

  let name = $state('');
  let inputEl = $state<HTMLInputElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  /** What had focus before we stole it, so it can be handed back on close. */
  let opener: HTMLElement | null = null;

  // A hint, never a value: a pre-filled name invites accepting it unread, which
  // is the habit this dialog exists to break. It can also be taken already —
  // with [Roadmap 1, Roadmap 3] the counter suggests the one that exists.
  const suggestion = $derived(`Roadmap ${store.data.roadmaps.length + 1}`);

  // Live, so the accept button and the message below the field always agree
  // with what the store would do. Empty input shows no error: the user has not
  // typed anything wrong yet, they just have not finished.
  const error = $derived(store.roadmapNameError(name));
  const showError = $derived(name !== '' && error !== null);
  const canAccept = $derived(error === null);

  function close() {
    ui.closeNewRoadmap();
    name = '';
    opener?.focus();
    opener = null;
  }

  function accept() {
    if (!canAccept) return;
    // The store activates the roadmap and leaves the "Todos" view itself.
    if (!store.addRoadmap(name)) return;
    // Creating one is opening it, so it heads the hub's recent list too.
    if (store.data.activeId) usage.touch(ROADMAPS_ID, store.data.activeId);
    close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab' || !panelEl) return;
    // Focus trap. The dialog holds few enough controls that querying them on
    // each Tab is cheaper than tracking them, and it stays correct when the
    // accept button flips between enabled and disabled as the user types.
    const focusables = [...panelEl.querySelectorAll<HTMLElement>('input, button:not(:disabled)')];
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

  // Opening starts from a clean field and takes focus; remember where focus was
  // so closing can put it back on the button that opened the dialog.
  $effect(() => {
    if (!ui.newRoadmap) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    name = '';
    inputEl?.focus();
  });
</script>

{#if ui.newRoadmap}
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="nrd-title"
    tabindex="-1"
    onkeydown={onKeydown}
  >
    <!-- Clicking the overlay closes; clicks born inside the panel must not
         bubble up into that handler. -->
    <button type="button" class="overlay-hit" aria-label="cancelar" tabindex="-1" onclick={close}
    ></button>

    <div class="panel" bind:this={panelEl}>
      <h2 class="title" id="nrd-title">Nuevo roadmap</h2>

      <label class="field-label" for="nrd-name">nombre</label>
      <input
        bind:this={inputEl}
        bind:value={name}
        class="field"
        class:invalid={showError}
        id="nrd-name"
        type="text"
        placeholder={suggestion}
        autocomplete="off"
        aria-invalid={showError}
        aria-describedby={showError ? 'nrd-error' : undefined}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            accept();
          }
        }}
      />

      <!-- The slot is always there so the panel does not jump as the message
           appears and disappears while typing. -->
      <p class="msg" id="nrd-error" class:show={showError}>
        {#if error?.kind === 'duplicate'}
          Ya existe un roadmap llamado «{error.existing}».
        {:else if error?.kind === 'empty'}
          El nombre no puede estar vacío.
        {:else}
          &nbsp;
        {/if}
      </p>

      <div class="actions">
        <button type="button" class="btn" onclick={close}>cancelar</button>
        <button type="button" class="btn primary" disabled={!canAccept} onclick={accept}>
          crear
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Above the drawer and its backdrop (49/50), which this may cover: asking for
     a name must not require closing whatever panel is open behind it. */
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--overlay-bg);
  }
  /* A real button so closing by clicking outside works with the keyboard's
     own semantics out of the way (it is skipped by Tab). */
  .overlay-hit {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: none;
    cursor: default;
  }
  .panel {
    position: relative;
    width: 340px;
    max-width: calc(100vw - 32px);
    padding: 20px 22px 18px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: 0 16px 48px var(--shadow-strong);
    font-family: 'IBM Plex Mono', monospace;
  }
  .title {
    margin: 0 0 18px;
    font-size: 12px;
    letter-spacing: 0.14em;
    color: var(--accent);
    font-weight: 600;
    text-transform: uppercase;
  }
  .field-label {
    display: block;
    margin-bottom: 6px;
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--text-dim);
  }
  .field {
    width: 100%;
    box-sizing: border-box;
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    outline: none;
  }
  .field:focus {
    border-color: var(--accent);
  }
  .field.invalid,
  .field.invalid:focus {
    border-color: var(--danger);
  }
  .msg {
    min-height: 15px;
    margin: 7px 0 0;
    font-size: 11px;
    line-height: 15px;
    color: var(--danger);
    visibility: hidden;
  }
  .msg.show {
    visibility: visible;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
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
