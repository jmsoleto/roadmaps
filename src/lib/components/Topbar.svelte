<script lang="ts">
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import RoadmapSwitcher from './RoadmapSwitcher.svelte';

  let fileInput: HTMLInputElement;
  let importError = $state<string | null>(null);

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
  <div class="brand">ROADMAPS</div>
  <RoadmapSwitcher />
  <button class="add-tab" onclick={() => store.addRoadmap()}>+ nuevo</button>
  <button class="add-tab" onclick={() => fileInput.click()} title="importar JSON">↓ importar</button
  >
  <button
    class="add-tab"
    onclick={exportActive}
    disabled={!store.activeRoadmap}
    title="exportar roadmap activo">↑ exportar</button
  >
  <button class="add-tab" onclick={() => ui.openTheme()} title="tema de colores">◐ tema</button>
  <input
    bind:this={fileInput}
    type="file"
    accept="application/json,.json"
    class="hidden-file"
    onchange={onImportFile}
  />
  {#if importError}<span class="import-error">{importError}</span>{/if}
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
