<script lang="ts">
  /**
   * Quick capture: one field, Enter, done (design decision D7).
   *
   * Any required field here turns a three-second gesture into a thirty-second
   * one, and what does not get captured in the meeting does not exist. So this
   * asks for one line and stays open for the next.
   */
  import { decisions } from '../../decisions/store.svelte';
  import { decisionsUi } from '../../decisions/ui.svelte';

  let text = $state('');
  let context = $state('');
  let input = $state<HTMLInputElement | null>(null);
  let captured = $state(0);

  const canAccept = $derived(text.trim() !== '');

  function accept() {
    if (!canAccept) return;
    decisions.capture(text, context);
    captured += 1;
    // Cleared and refocused rather than closed: capturing three in a row is the
    // real situation this exists for. The context is kept — a run of doubts
    // usually comes out of the same meeting.
    text = '';
    input?.focus();
  }

  function close() {
    decisionsUi.closeCapture();
    text = '';
    context = '';
    captured = 0;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      accept();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  $effect(() => {
    if (decisionsUi.capturing) input?.focus();
  });
</script>

{#if decisionsUi.capturing}
  <div class="backdrop" onclick={close} role="presentation"></div>

  <div class="dialog" role="dialog" aria-modal="true" aria-label="capturar decisión">
    <div class="head">
      <span class="title">capturar una decisión</span>
      {#if captured > 0}
        <span class="tally">{captured} capturada{captured === 1 ? '' : 's'}</span>
      {/if}
    </div>

    <input
      bind:this={input}
      bind:value={text}
      class="main"
      type="text"
      placeholder="la duda, tal como ha salido…"
      aria-label="la duda"
      onkeydown={onKeydown}
    />

    <input
      bind:value={context}
      class="context"
      type="text"
      placeholder="de dónde sale (opcional) — p. ej. reunión equipo API"
      aria-label="contexto"
      onkeydown={onKeydown}
    />

    <div class="foot">
      <span class="hint">Enter guarda y deja listo el siguiente · Esc cierra</span>
      <button type="button" class="primary" disabled={!canAccept} onclick={accept}>guardar</button>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: var(--scrim);
  }
  .dialog {
    position: fixed;
    z-index: 61;
    top: 18vh;
    left: 50%;
    transform: translateX(-50%);
    width: min(560px, calc(100vw - 32px));
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
    box-shadow: 0 16px 48px var(--shadow-strong);
  }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .title,
  .tally,
  .hint {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }
  .tally {
    letter-spacing: 0.04em;
    color: var(--accent);
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 0 12px;
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    outline: none;
  }
  input:focus {
    border-color: var(--accent);
  }
  .main {
    height: 44px;
    font-size: 15px;
  }
  .context {
    height: 34px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 2px;
  }
  .hint {
    letter-spacing: 0.02em;
    opacity: 0.85;
  }
  .primary {
    background: var(--accent);
    border: var(--line-width) solid var(--accent);
    color: var(--ink-on-accent);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
  }
  .primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
