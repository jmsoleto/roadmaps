<script lang="ts">
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';

  let { onToday }: { onToday: () => void } = $props();
</script>

<!-- The "Todos" view scales with `store.dayW` too, so it keeps the zoom control
     and drops what only applies inside a roadmap. -->
<div class="toolbar">
  {#if !store.metaView}
    <button class="btn" onclick={() => store.addPhase()}>+ añadir fase</button>
    <button class="btn" onclick={() => ui.openAssignees()}>responsables</button>
  {/if}
  {#if !store.metaView && store.activeRoadmap}
    <div class="timeline-cfg" title="ventana temporal de este roadmap">
      <span class="cfg-label">inicio</span>
      <input
        type="date"
        class="cfg-date"
        value={store.activeRoadmap.startDate}
        onchange={(e) => e.currentTarget.value && store.setRoadmapStart(e.currentTarget.value)}
      />
      <span class="cfg-label">ventana</span>
      <input
        type="number"
        class="cfg-num"
        min="90"
        step="30"
        value={store.activeRoadmap.windowDays}
        onchange={(e) => store.setRoadmapWindow(Number(e.currentTarget.value))}
      />
      <span class="cfg-label">días</span>
    </div>
  {/if}
  <div class="zoom">
    <button class="btn sq" title="alejar" onclick={() => store.zoomOut()}>−</button>
    <div class="zoom-label">{store.dayW}px/d</div>
    <button class="btn sq" title="acercar" onclick={() => store.zoomIn()}>+</button>
  </div>
  {#if !store.metaView}
    <button class="btn today" onclick={onToday}>ir a hoy</button>
  {/if}
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 16px;
    border-bottom: 1px solid var(--line-weak);
    flex-shrink: 0;
  }
  .btn {
    background: var(--surface-2);
    border: 1px solid var(--line);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    padding: 7px 12px;
    border-radius: 6px;
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
  .btn.sq {
    padding: 6px 10px;
    font-size: 14px;
    line-height: 1;
  }
  .timeline-cfg {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cfg-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .cfg-date,
  .cfg-num {
    background: var(--surface-2);
    border: 1px solid var(--line);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    padding: 5px 7px;
    border-radius: 5px;
    outline: none;
    color-scheme: dark;
  }
  .cfg-num {
    width: 66px;
  }
  .cfg-date:focus,
  .cfg-num:focus {
    border-color: var(--accent);
  }
  .zoom {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }
  .zoom-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
    min-width: 44px;
    text-align: center;
  }
  .today {
    margin-left: 0;
  }
</style>
