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
  import { Dictation } from '../../decisions/dictation.svelte';
  import {
    doubtfulCount,
    formatElapsed,
    isDoubtful,
    joinTranscript,
  } from '../../decisions/dictation';

  let text = $state('');
  let context = $state('');
  let input = $state<HTMLInputElement | null>(null);
  let captured = $state(0);
  /** Set once anything in this capture came in by voice. */
  let dictated = $state(false);
  let now = $state(Date.now());

  const dictation = new Dictation();
  const listening = $derived(dictation.state === 'escuchando');
  const doubtful = $derived(doubtfulCount(dictation.fragments));
  const elapsed = $derived(
    dictation.startedAt === null ? '00:00' : formatElapsed(now - dictation.startedAt),
  );

  const canAccept = $derived(text.trim() !== '');

  // Ticks only while listening, so nothing runs when the dialog is idle.
  $effect(() => {
    if (!listening) return;
    const id = setInterval(() => (now = Date.now()), 500);
    return () => clearInterval(id);
  });

  // What the browser settles on joins whatever was typed: dictation is another
  // way in, not a separate mode (D4).
  $effect(() => {
    const fragments = dictation.fragments;
    if (fragments.length === 0) return;
    text = joinTranscript(textBeforeDictation, fragments);
    dictated = true;
  });

  let textBeforeDictation = $state('');

  function startDictation() {
    textBeforeDictation = text;
    dictation.start();
  }

  function accept() {
    if (!canAccept) return;
    if (listening) dictation.stop();
    decisions.capture(text, context, dictated ? 'dictado' : 'tecleado');
    captured += 1;
    // Cleared and refocused rather than closed: capturing three in a row is the
    // real situation this exists for. The context is kept — a run of doubts
    // usually comes out of the same meeting.
    text = '';
    textBeforeDictation = '';
    dictated = false;
    dictation.reset();
    input?.focus();
  }

  function close() {
    dictation.cancel();
    decisionsUi.closeCapture();
    text = '';
    textBeforeDictation = '';
    context = '';
    captured = 0;
    dictated = false;
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

    <!-- No control at all where the browser cannot transcribe: a button that
         cannot work is noise on the one screen that admits none (D3). -->
    {#if dictation.available}
      <div class="dictation" class:listening>
        {#if listening}
          <button type="button" class="rec stop" onclick={() => dictation.stop()}>
            <span class="dot" aria-hidden="true"></span> parar · {elapsed}
          </button>
        {:else}
          <button type="button" class="rec" onclick={startDictation}>◉ dictar la duda</button>
        {/if}

        {#if dictation.interim}
          <span class="interim">{dictation.interim}</span>
        {/if}

        {#if doubtful > 0 && !listening}
          <!-- Fragments, not words: the browser reports confidence per stretch
               of speech, and splitting it across words would fabricate a
               measurement (D2). -->
          <span class="doubtful">
            {doubtful}
            {doubtful === 1 ? 'fragmento dudoso' : 'fragmentos dudosos'} · revísalo antes de guardar
          </span>
        {/if}
      </div>

      {#if dictation.message}
        <p class="disclosure" class:warn={dictation.state === 'denegado'}>{dictation.message}</p>
      {/if}

      {#if doubtful > 0 && !listening}
        <div class="fragments">
          {#each dictation.fragments as f, i (i)}<span class="frag" class:low={isDoubtful(f)}
              >{f.text}</span
            >{/each}
        </div>
      {/if}
    {/if}

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
  .dictation {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .rec {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    padding: 7px 12px;
    cursor: pointer;
  }
  .rec:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .rec.stop {
    border-color: var(--danger);
    color: var(--danger);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--danger);
  }
  .interim {
    flex: 1;
    min-width: 0;
    font-size: 12.5px;
    color: var(--text-dim);
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .doubtful {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .disclosure {
    margin: 0;
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--text-dim);
  }
  .disclosure.warn {
    color: var(--danger);
  }
  .fragments {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .frag {
    font-size: 12px;
    color: var(--text-dim);
  }
  .frag.low {
    color: var(--text);
    border-bottom: 1px dashed var(--danger);
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
