<script lang="ts">
  /**
   * Paste a real response and let the tree build itself (R6).
   *
   * A dialog rather than an inline box because what gets pasted here is a whole
   * API response, and it needs the room. Same obligations as
   * `NewRoadmapDialog`: focus trap, Escape, and focus back where it came from.
   *
   * The refusal path is the point (D6). A paste that cannot be read shows its
   * reason **inside the dialog and leaves it open**, so the text is still there
   * to fix — closing on failure would throw away what the user just pasted, on
   * top of telling them it was wrong.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { apiUi } from '../../api/ui.svelte';

  let text = $state('');
  let panelEl = $state<HTMLDivElement | null>(null);
  let areaEl = $state<HTMLTextAreaElement | null>(null);
  let opener: HTMLElement | null = null;

  const open = $derived(apiUi.pasteTargetId !== null);

  function close() {
    apiUi.closePaste();
    text = '';
    opener?.focus();
    opener = null;
  }

  function accept() {
    const target = apiUi.pasteTargetId;
    if (target === null || text.trim() === '') return;
    const error = apiContracts.pasteInto(target, text);
    if (error !== null) {
      apiUi.pasteError = error;
      return;
    }
    close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    // Ctrl/Cmd+Enter accepts: the field is a textarea, so a plain Enter has to
    // stay a newline — a pasted JSON is full of them.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      accept();
      return;
    }
    if (e.key !== 'Tab' || !panelEl) return;
    const focusables = [
      ...panelEl.querySelectorAll<HTMLElement>('textarea, button:not(:disabled)'),
    ];
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

  $effect(() => {
    if (!open) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    areaEl?.focus();
  });
</script>

{#if open}
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pjd-title"
    tabindex="-1"
    onkeydown={onKeydown}
  >
    <button type="button" class="overlay-hit" aria-label="cancelar" tabindex="-1" onclick={close}
    ></button>

    <div class="panel" bind:this={panelEl}>
      <h2 id="pjd-title">Pegar un JSON de ejemplo</h2>
      <p class="hint">
        Pega una respuesta real —de Postman, de un log, del backend— y se construyen los campos con
        sus tipos, su anidamiento y los formatos que se reconozcan. Reemplaza lo que este nodo
        tuviera.
      </p>

      <textarea
        bind:this={areaEl}
        bind:value={text}
        class="area"
        rows="12"
        spellcheck="false"
        placeholder={'{\n  "pagina": 1,\n  "items": [{ "id": "P0001" }]\n}'}
        aria-label="JSON de ejemplo"
        oninput={() => (apiUi.pasteError = null)}
      ></textarea>

      {#if apiUi.pasteError}
        <p class="error" role="alert">{apiUi.pasteError} No se ha tocado nada del árbol.</p>
      {/if}

      <div class="actions">
        <button type="button" class="btn" onclick={close}>cancelar</button>
        <button type="button" class="btn primary" disabled={text.trim() === ''} onclick={accept}
          >construir el árbol</button
        >
      </div>
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
    width: min(640px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
    box-shadow: 0 12px 40px var(--shadow-strong);
  }
  h2 {
    margin: 0;
    font-size: 16px;
    color: var(--text);
  }
  .hint {
    margin: 0;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.5;
  }
  .area {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    line-height: 1.5;
    padding: 10px;
    outline: none;
    resize: vertical;
  }
  .area:focus {
    border-color: var(--accent);
  }
  .error {
    margin: 0;
    color: var(--danger);
    font-size: 12.5px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
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
  .btn.primary:hover:not(:disabled) {
    color: var(--ink-on-accent);
  }
</style>
