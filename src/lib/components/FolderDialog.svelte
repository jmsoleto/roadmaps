<script lang="ts">
  /**
   * Connect Roadmaps to a folder, or disconnect it (carpeta-roadmaps, D7).
   *
   * Nothing happens on choosing a folder: the dialog first says what
   * connecting would do (copy the browser's roadmaps into an empty folder, or
   * switch to the roadmaps a folder already has), and only «conectar» does it.
   * The spec asks for that warning before what the user sees changes.
   *
   * The dialog obligations are the ones `NewRoadmapDialog` handles: initial
   * focus, focus trap, Escape, click on the overlay, focus handed back.
   */
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import { roadmapsFolder, type ConnectPlan } from '../store/roadmaps-folder.svelte';

  let plan = $state<ConnectPlan | null>(null);
  let failure = $state<string | null>(null);
  let busy = $state(false);
  let panelEl = $state<HTMLDivElement | null>(null);
  let opener: HTMLElement | null = null;

  const connected = $derived(roadmapsFolder.folderName !== null);
  const count = $derived(store.source === 'browser' ? store.data.roadmaps.length : 0);

  function reset() {
    plan = null;
    failure = null;
    busy = false;
  }

  function close() {
    if (busy) return;
    ui.closeFolder();
    reset();
    opener?.focus();
    opener = null;
  }

  async function choose() {
    failure = null;
    busy = true;
    try {
      const next = await roadmapsFolder.choose();
      plan = next.kind === 'cancelled' ? null : next;
    } catch (e) {
      failure = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  async function connect() {
    if (!plan) return;
    busy = true;
    const out = await roadmapsFolder.confirm(plan);
    busy = false;
    if (out.ok) close();
    else {
      failure = out.message;
      plan = null;
    }
  }

  async function disconnect() {
    busy = true;
    await roadmapsFolder.disconnect();
    busy = false;
    close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab' || !panelEl) return;
    const focusables = [...panelEl.querySelectorAll<HTMLElement>('button:not(:disabled)')];
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
    if (!ui.folder) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    reset();
    queueMicrotask(() => panelEl?.querySelector<HTMLElement>('button.primary')?.focus());
  });
</script>

{#if ui.folder}
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="fd-title"
    tabindex="-1"
    onkeydown={onKeydown}
  >
    <button type="button" class="overlay-hit" aria-label="cerrar" tabindex="-1" onclick={close}
    ></button>

    <div class="panel" bind:this={panelEl}>
      <h2 class="title" id="fd-title">Carpeta de Roadmaps</h2>

      {#if connected}
        <p class="text">
          Conectado a <strong>{roadmapsFolder.folderName}</strong>. Los roadmaps se guardan ahí;
          para compartirlos, haz commit y abre una PR con git.
        </p>
        <p class="text dim">
          Al desconectar vuelves a los roadmaps de este navegador, tal como estaban. Lo que hayas
          hecho con la carpeta conectada se queda en la carpeta.
        </p>
        <div class="actions">
          <button type="button" class="btn" onclick={close} disabled={busy}>cerrar</button>
          <button type="button" class="btn primary" onclick={disconnect} disabled={busy}>
            desconectar
          </button>
        </div>
      {:else if !roadmapsFolder.supported}
        <p class="text">
          Guardar los roadmaps en una carpeta necesita Chrome o Edge: este navegador no deja a una
          web escribir en las carpetas del dispositivo. Aquí siguen guardándose en el navegador.
        </p>
        <div class="actions">
          <button type="button" class="btn primary" onclick={close}>cerrar</button>
        </div>
      {:else if plan?.kind === 'dump'}
        <p class="text">
          <strong>{plan.folder}</strong> no tiene roadmaps. Se creará dentro la carpeta
          <code>roadmaps</code> y se copiará en ella {count === 1
            ? 'el roadmap de este navegador, que también se queda aquí'
            : `los ${count} roadmaps de este navegador, que también se quedan aquí`}.
        </p>
        <div class="actions">
          <button type="button" class="btn" onclick={reset} disabled={busy}>otra carpeta</button>
          <button type="button" class="btn primary" onclick={connect} disabled={busy}>
            {busy ? 'copiando…' : 'conectar'}
          </button>
        </div>
      {:else if plan?.kind === 'adopt'}
        <p class="text">
          <strong>{plan.folder}</strong> ya tiene roadmaps. Pasarás a ver los de la carpeta; nada se mezcla.
        </p>
        {#if count > 0}
          <p class="text dim">
            {count === 1
              ? 'El roadmap de este navegador se queda guardado aquí y vuelve al desconectar.'
              : `Los ${count} roadmaps de este navegador se quedan guardados aquí y vuelven al desconectar.`}
            Para llevar alguno al repo, expórtalo ahora e impórtalo después de conectar.
          </p>
        {/if}
        <div class="actions">
          <button type="button" class="btn" onclick={reset} disabled={busy}>otra carpeta</button>
          <button type="button" class="btn primary" onclick={connect} disabled={busy}
            >conectar</button
          >
        </div>
      {:else}
        {#if plan?.kind === 'rejected'}
          <p class="text error">{plan.message}</p>
        {/if}
        {#if failure}
          <p class="text error">{failure}</p>
        {/if}
        <p class="text">
          Elige la carpeta de un repo de git. Roadmaps guardará ahí sus datos, en su propia carpeta
          <code>roadmaps</code>, y podrás compartirlos con quien tenga acceso al repo.
        </p>
        <p class="text dim">
          Tu vista (el roadmap abierto, las fases plegadas, el zoom) sigue siendo tuya y no va a la
          carpeta.
        </p>
        <div class="actions">
          <button type="button" class="btn" onclick={close} disabled={busy}>cancelar</button>
          <button type="button" class="btn primary" onclick={choose} disabled={busy}>
            elegir carpeta…
          </button>
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
    background: var(--overlay-bg);
  }
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
    width: 440px;
    max-width: calc(100vw - 32px);
    padding: 20px 22px 18px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    box-shadow: 0 16px 48px var(--shadow-strong);
  }
  .title {
    margin: 0 0 14px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.14em;
    color: var(--accent);
    font-weight: 600;
    text-transform: uppercase;
  }
  .text {
    margin: 0 0 10px;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--text);
  }
  .text.dim {
    color: var(--text-dim);
  }
  .text.error {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--danger);
  }
  code {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
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
