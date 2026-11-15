<script lang="ts">
  /**
   * Health Hub's screen: which panel, and the states before there is one.
   *
   * No folder is a state of its own and not the unavailable screen: nothing has
   * gone wrong. It is simply where this application starts, and it says what it
   * needs (`folder-persistence`, «Health Hub solo guarda en una carpeta»).
   */
  import { HEALTH_ID } from '../../hub/apps';
  import { unavailableActions } from '../../hub/folders';
  import { healthFolder } from '../../health/folder.svelte';
  import { health } from '../../health/store.svelte';
  import { ui } from '../../store/ui.svelte';
  import StoreUnavailable from '../StoreUnavailable.svelte';
  import AppPanel from './AppPanel.svelte';
  import FuentePanel from './FuentePanel.svelte';
  import GlobalPanel from './GlobalPanel.svelte';
  import HealthDialogs from './HealthDialogs.svelte';
  import InboxPanel from './InboxPanel.svelte';
</script>

<div class="health">
  {#if !health.ready}
    <p class="opening">Abriendo la carpeta de salud…</p>
  {:else if health.unavailable}
    <StoreUnavailable
      title="Health Hub no está disponible"
      reason={health.unavailable.reason}
      explain="No se ha escrito nada. Los datos siguen en la carpeta tal como estaban."
      actions={unavailableActions(HEALTH_ID, health.unavailable.why, health.source)}
    />
  {:else if health.sinCarpeta}
    <div class="empty">
      <h2>Health Hub vive en una carpeta</h2>
      <p>
        Los logs duran 7 días; aquí se guarda lo que dicen, día a día, para ver si los errores de
        cada aplicación se reducen o crecen tras una subida.
      </p>
      <p>
        Son datos internos, así que no se guardan en el navegador ni salen a ningún servicio: viven
        en la carpeta de un repo privado que eliges tú.
      </p>
      {#if healthFolder.supported}
        <button type="button" class="btn primary" onclick={() => ui.openFolder(HEALTH_ID)}>
          conectar una carpeta…
        </button>
      {:else}
        <p class="warning">
          Este navegador no permite acceder a carpetas del dispositivo: hace falta Chrome o Edge.
        </p>
      {/if}
    </div>
  {:else}
    <div class="scroll">
      {#if health.saveError}
        <p class="note error" role="alert">No se pudo guardar: {health.saveError}</p>
      {/if}
      {#if health.aviso}
        <div class="note" role="status">
          <span>{health.aviso}</span>
          <button
            type="button"
            class="cerrar"
            aria-label="cerrar el aviso"
            onclick={() => (health.aviso = null)}>×</button
          >
        </div>
      {/if}
      <InboxPanel />
      {#if health.abiertaVigilada}
        <AppPanel app={health.abiertaVigilada} />
      {:else}
        <FuentePanel />
        <GlobalPanel />
      {/if}
    </div>
  {/if}
  <HealthDialogs />
</div>

<style>
  .health {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    color: var(--text);
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px 24px 40px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .opening {
    margin: 48px auto;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
  .empty {
    max-width: 560px;
    margin: 48px auto;
    padding: 24px;
    border: var(--line-width) solid var(--line);
    border-radius: 8px;
    background: var(--surface);
  }
  .empty h2 {
    margin: 0 0 12px;
    font-size: 18px;
  }
  .empty p {
    margin: 0 0 12px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-mid);
  }
  .empty .warning {
    color: var(--danger);
    margin-bottom: 0;
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
  .btn.primary {
    color: var(--accent);
    border-color: var(--accent);
  }
  .note {
    margin: 0;
    padding: 8px 12px;
    border-left: 2px solid var(--accent);
    background: var(--tint-accent);
    border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-mid);
  }
  div.note {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .cerrar {
    padding: 0 4px;
    border: none;
    background: none;
    color: var(--text-dim);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
  }
  .cerrar:hover {
    color: var(--accent);
  }
  .note.error {
    border-left-color: var(--danger);
    background: var(--tint-danger);
    color: var(--danger);
  }
</style>
