<script lang="ts">
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import { fmtDate } from '../time/timeline';

  let { onToday }: { onToday: () => void } = $props();

  // Fixing the plan a second time throws away the drift measured against the
  // first one, so refixing takes two clicks and says so. The first fix does
  // not: there is nothing yet to lose (D5).
  let confirmRefix = $state(false);
  function fixPlan() {
    const rm = store.activeRoadmap;
    if (!rm) return;
    if (rm.baselineDate !== null && !confirmRefix) {
      confirmRefix = true;
      return;
    }
    confirmRefix = false;
    store.setBaseline(rm.id);
  }
  $effect(() => {
    void store.activeRoadmap?.id;
    confirmRefix = false;
  });
</script>

<!-- The "Todos" view scales with `store.dayW` too and marks today just like the
     roadmap view, so it keeps the zoom control and "ir a hoy" — zooming out can
     push the marker off screen, and this is what brings it back — and drops only
     what applies inside a roadmap. -->
<div class="toolbar">
  {#if !store.metaView}
    <button class="btn" onclick={() => store.addPhase()}>+ añadir fase</button>
    <button class="btn" onclick={() => ui.openAssignees()}>responsables</button>
  {/if}
  <!-- Unlike "responsables", this one stays put in "Todos": the catalog of
       external dependencies is global, and "Todos" is where you'd register
       something that is about to hit several roadmaps (D8). -->
  <button class="btn" onclick={() => ui.openBlockers()}>dependencias externas</button>
  <!-- Absent from "Todos" on purpose: the baseline belongs to one roadmap (D5). -->
  {#if !store.metaView && store.activeRoadmap}
    {@const fixed = store.activeRoadmap.baselineDate}
    <button
      class="btn"
      class:confirm={confirmRefix}
      onclick={fixPlan}
      title={fixed
        ? `Plan fijado el ${fmtDate(fixed)}. Volver a fijarlo toma como plan las fechas de hoy y reinicia la desviación acumulada.`
        : 'Toma las fechas de hoy como plan comprometido, para medir contra ellas la desviación de lo que se complete.'}
      >{confirmRefix
        ? '¿refijar y reiniciar la desviación?'
        : fixed
          ? `plan · ${fmtDate(fixed)}`
          : 'fijar plan'}</button
    >
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
  <button class="btn today" onclick={onToday}>ir a hoy</button>
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
  .btn.confirm {
    border-color: var(--danger);
    background: var(--danger);
    color: var(--ink-on-danger);
  }
  .btn.confirm:hover {
    border-color: var(--danger);
    color: var(--ink-on-danger);
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
