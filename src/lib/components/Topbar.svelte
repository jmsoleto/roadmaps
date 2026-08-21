<script lang="ts">
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import { DECISIONS_ID, ROADMAPS_ID } from '../hub/apps';
  import { decisions } from '../decisions/store.svelte';
  import { decisionsUi } from '../decisions/ui.svelte';
  import { exportDecisions, parseDecisionsImport } from '../decisions/io';
  import { location } from '../hub/location.svelte';
  import AppSwitcher from './AppSwitcher.svelte';
  import RoadmapSwitcher from './RoadmapSwitcher.svelte';

  let fileInput: HTMLInputElement;
  let decisionsFileInput: HTMLInputElement;
  let importError = $state<string | null>(null);

  /**
   * The topbar carries only the open application's actions.
   *
   * Creating, importing and exporting belong to Roadmaps, so they have no
   * business on the hub or inside another app. The theme does belong to the
   * container, so it stays available everywhere.
   */
  const inRoadmaps = $derived(location.appId === ROADMAPS_ID);
  const inDecisions = $derived(location.appId === DECISIONS_ID);

  function exportActive() {
    const json = store.exportActive();
    if (!json) return;
    const name = (store.activeRoadmap?.name ?? 'roadmap').replace(/[^\w.-]+/g, '_');
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportDecisionsFile() {
    const json = exportDecisions($state.snapshot(decisions.all) as typeof decisions.all);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decisiones.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportDecisionsFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      importError = null;
      decisions.append(parseDecisionsImport(await file.text()));
    } catch (err) {
      importError = err instanceof Error ? err.message : 'No se pudo importar el archivo.';
      setTimeout(() => (importError = null), 4000);
    }
  }

  async function onImportFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      importError = null;
      store.importFromText(await file.text());
    } catch (err) {
      importError = err instanceof Error ? err.message : 'No se pudo importar el archivo.';
      setTimeout(() => (importError = null), 4000);
    }
  }
</script>

<div class="topbar">
  <div class="brand">TECH LEAD HUB</div>
  <AppSwitcher />
  {#if inRoadmaps}
    <span class="sep" aria-hidden="true">▸</span>
    <RoadmapSwitcher />
    <button class="add-tab" onclick={() => ui.openNewRoadmap()}>+ nuevo</button>
    <button class="add-tab" onclick={() => fileInput.click()} title="importar JSON"
      >↓ importar</button
    >
    <button
      class="add-tab"
      onclick={exportActive}
      disabled={!store.activeRoadmap}
      title="exportar roadmap activo">↑ exportar</button
    >
  {:else if inDecisions}
    <div class="spacer"></div>
    <!-- With the store down, nothing may be created or changed: offering a
         control that would silently do nothing is worse than not offering it. -->
    <button
      class="add-tab"
      onclick={() => decisionsUi.openCapture()}
      disabled={decisions.unavailable !== null}>+ capturar</button
    >
    <button
      class="add-tab"
      onclick={() => decisionsFileInput.click()}
      disabled={decisions.unavailable !== null}
      title="importar decisiones JSON">↓ importar</button
    >
    <button
      class="add-tab"
      onclick={exportDecisionsFile}
      disabled={decisions.all.length === 0}
      title="exportar decisiones">↑ exportar</button
    >
  {:else}
    <div class="spacer"></div>
  {/if}
  <button class="add-tab" onclick={() => ui.openTheme()} title="tema de colores">◐ tema</button>
  <input
    bind:this={fileInput}
    type="file"
    accept="application/json,.json"
    class="hidden-file"
    onchange={onImportFile}
  />
  <input
    bind:this={decisionsFileInput}
    type="file"
    accept="application/json,.json"
    class="hidden-file"
    onchange={onImportDecisionsFile}
  />
  {#if importError}<span class="import-error">{importError}</span>{/if}
  <!-- Not a user name (D10): there are no accounts, and suggesting a session in
       an app whose data dies with the site's storage is the expensive
       misunderstanding. It says where the data is. -->
  <span class="scope">local</span>
  <span class="save-indicator" class:show={store.justSaved}>guardado ✓</span>
</div>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 16px;
    height: 48px;
    background: var(--surface);
    border-bottom: 1px solid var(--line-weak);
    flex-shrink: 0;
  }
  .brand {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.14em;
    color: var(--accent);
    font-weight: 600;
  }
  .sep {
    flex-shrink: 0;
    color: var(--text-dim);
    opacity: 0.6;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
  /* Stands in for the roadmap switcher's `flex: 1` so the trailing controls
     keep their place when no application is open. */
  .spacer {
    flex: 1;
  }
  .scope {
    flex-shrink: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .add-tab {
    flex-shrink: 0;
    background: none;
    border: 1px dashed var(--line);
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    border-radius: 6px;
    height: 32px;
    padding: 0 12px;
    cursor: pointer;
  }
  .add-tab:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }
  .add-tab:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .hidden-file {
    display: none;
  }
  .import-error {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--danger);
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .save-indicator {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .save-indicator.show {
    opacity: 1;
  }
</style>
