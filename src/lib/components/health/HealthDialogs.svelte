<script lang="ts">
  /**
   * Every dialog of Health Hub, one at a time.
   *
   * Which one is `healthUi.dialogo`. The dialog obligations are those of
   * `FolderDialog`: initial focus, focus trap, Escape, click on the overlay, and
   * the focus handed back to whatever opened it.
   */
  import { health } from '../../health/store.svelte';
  import { healthUi } from '../../health/ui.svelte';
  import { idParaNombre } from '../../health/model';
  import { isIsoDate } from '../../time/timeline';

  const dialogo = $derived(healthUi.dialogo);

  let nombre = $state('');
  let version = $state('');
  let dia = $state('');
  let nota = $state('');
  let consulta = $state('');
  let confirmaBorrado = $state(false);
  let panelEl = $state<HTMLDivElement | null>(null);
  let opener: HTMLElement | null = null;

  const vigilada = $derived.by(() => {
    const d = dialogo;
    if (d === null || d.kind === 'crear') return null;
    return health.vigilada(d.kind === 'version' || d.kind === 'consulta' ? d.appId : d.id);
  });
  const metrica = $derived.by(() => {
    const d = dialogo;
    return d?.kind === 'consulta' ? health.metricas.find((m) => m.id === d.metrica) : undefined;
  });
  const datos = $derived(vigilada ? health.observacionesDe(vigilada.id).length : 0);
  const nuevoId = $derived(
    idParaNombre(
      nombre,
      health.data.aplicaciones.map((a) => a.id),
    ),
  );
  const versionValida = $derived(version.trim() !== '' && isIsoDate(dia));

  const titulo = $derived.by(() => {
    switch (dialogo?.kind) {
      case 'crear':
        return 'Nueva aplicación';
      case 'renombrar':
        return 'Renombrar aplicación';
      case 'eliminar':
        return 'Eliminar aplicación';
      case 'version':
        return dialogo.versionId ? 'Editar subida de versión' : 'Marcar subida de versión';
      case 'consulta':
        return `Consulta de ${metrica?.nombre ?? ''}`;
      default:
        return '';
    }
  });

  // Fill the form on opening, and put the focus where the first thing to do is.
  $effect(() => {
    const d = dialogo;
    if (!d) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    nombre = '';
    version = '';
    dia = health.hoy;
    nota = '';
    consulta = '';
    confirmaBorrado = false;
    if (d.kind === 'renombrar') nombre = health.vigilada(d.id)?.nombre ?? '';
    if (d.kind === 'consulta') consulta = health.vigilada(d.appId)?.consultas[d.metrica] ?? '';
    if (d.kind === 'version' && d.versionId) {
      const v = health.vigilada(d.appId)?.versiones.find((x) => x.id === d.versionId);
      if (v) {
        version = v.version;
        dia = v.dia;
        nota = v.nota ?? '';
      }
    }
    queueMicrotask(() =>
      panelEl?.querySelector<HTMLElement>('input, textarea, button.primary')?.focus(),
    );
  });

  function cerrar() {
    healthUi.cerrar();
    opener?.focus();
    opener = null;
  }

  function enviar(e: SubmitEvent) {
    e.preventDefault();
    const d = dialogo;
    if (!d) return;
    switch (d.kind) {
      case 'crear':
        if (!health.crear(nombre)) return;
        break;
      case 'renombrar':
        if (nombre.trim() === '') return;
        health.renombrar(d.id, nombre);
        break;
      case 'eliminar':
        health.eliminar(d.id);
        break;
      case 'version':
        if (!versionValida) return;
        if (d.versionId) health.updateVersion(d.appId, d.versionId, version, dia, nota);
        else health.addVersion(d.appId, version, dia, nota);
        break;
      case 'consulta':
        health.setConsulta(d.appId, d.metrica, consulta);
        break;
    }
    cerrar();
  }

  function borrarVersion() {
    const d = dialogo;
    if (d?.kind !== 'version' || !d.versionId) return;
    if (!confirmaBorrado) {
      confirmaBorrado = true;
      return;
    }
    health.deleteVersion(d.appId, d.versionId);
    if (healthUi.versionSel === d.versionId) healthUi.versionSel = null;
    cerrar();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrar();
      return;
    }
    if (e.key !== 'Tab' || !panelEl) return;
    const focusables = [
      ...panelEl.querySelectorAll<HTMLElement>('input, textarea, button:not(:disabled)'),
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
</script>

{#if dialogo}
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="hd-title"
    tabindex="-1"
    onkeydown={onKeydown}
  >
    <button type="button" class="overlay-hit" aria-label="cerrar" tabindex="-1" onclick={cerrar}
    ></button>

    <div class="panel" bind:this={panelEl}>
      <h2 class="title" id="hd-title">{titulo}</h2>

      <form onsubmit={enviar}>
        {#if dialogo.kind === 'crear' || dialogo.kind === 'renombrar'}
          <label>
            Nombre
            <input type="text" bind:value={nombre} autocomplete="off" />
          </label>
          {#if dialogo.kind === 'crear' && nombre.trim() !== ''}
            <p class="text dim">
              Su identificador será <code>{nuevoId}</code>, y no cambiará: es el que usará el agente
              en sus capturas.
            </p>
          {:else if dialogo.kind === 'renombrar'}
            <p class="text dim">
              Su identificador sigue siendo <code>{vigilada?.id}</code>, y su histórico no cambia.
            </p>
          {/if}
        {:else if dialogo.kind === 'eliminar'}
          <p class="text">
            Se eliminará <strong>{vigilada?.nombre}</strong> con sus {datos}
            {datos === 1 ? 'dato consolidado' : 'datos consolidados'}, sus consultas y sus
            versiones.
          </p>
          <p class="text dim">
            Solo se podrá recuperar desde el historial de git, si ya hay commit.
          </p>
        {:else if dialogo.kind === 'version'}
          <label>
            Versión
            <input type="text" bind:value={version} placeholder="4.2.0" autocomplete="off" />
          </label>
          <label>
            Día
            <input type="date" bind:value={dia} />
          </label>
          <label>
            Nota <span class="opcional">(opcional)</span>
            <input type="text" bind:value={nota} autocomplete="off" />
          </label>
        {:else if dialogo.kind === 'consulta'}
          <label>
            La consulta en la fuente de los logs
            <textarea bind:value={consulta} rows="4" spellcheck="false"></textarea>
          </label>
          <p class="text dim">
            Solo se guarda como referencia: Health Hub no la interpreta ni la ejecuta. Vacía, se
            quita.
          </p>
        {/if}

        <div class="actions">
          {#if dialogo.kind === 'version' && dialogo.versionId}
            <button type="button" class="btn borrar" onclick={borrarVersion}>
              {confirmaBorrado ? '¿seguro? borrar' : 'borrar'}
            </button>
          {/if}
          <button type="button" class="btn" onclick={cerrar}>cancelar</button>
          <button
            type="submit"
            class="btn primary"
            class:peligro={dialogo.kind === 'eliminar'}
            disabled={(dialogo.kind === 'crear' || dialogo.kind === 'renombrar') &&
            nombre.trim() === ''
              ? true
              : dialogo.kind === 'version' && !versionValida}
          >
            {#if dialogo.kind === 'eliminar'}
              eliminar
            {:else if dialogo.kind === 'crear'}
              crear
            {:else}
              guardar
            {/if}
          </button>
        </div>
      </form>
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
  label {
    display: block;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--text-mid);
  }
  .opcional {
    color: var(--text-dim);
  }
  input,
  textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin-top: 4px;
    padding: 6px 8px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--surface-2);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    outline: none;
    color-scheme: inherit;
  }
  input:focus,
  textarea:focus {
    border-color: var(--accent);
  }
  .text {
    margin: 0 0 10px;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--text);
  }
  .text.dim {
    color: var(--text-dim);
    font-size: 12.5px;
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
  .btn.peligro,
  .btn.peligro:hover:not(:disabled),
  .btn.borrar:hover:not(:disabled) {
    color: var(--danger);
    border-color: var(--danger);
  }
  .btn.borrar {
    margin-right: auto;
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
