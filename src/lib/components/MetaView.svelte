<script lang="ts">
  import { onMount } from 'svelte';
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import { ROW_H } from '../config';
  import { theme } from '../theme/theme.svelte';
  import { dayIndex, dayToX, fmtDate, todayIso } from '../time/timeline';
  import { getQuarterSegments } from '../time/segments';
  import { getMetaWindow, getRoadmapExtent } from '../model/derive';
  import type { IsoDate } from '../model/types';

  let scrollEl = $state<HTMLDivElement | undefined>(undefined);

  const roadmaps = $derived(store.data.roadmaps);

  // Common meta timeline, stretched to always contain today — see `getMetaWindow`.
  const meta = $derived(getMetaWindow(roadmaps, todayIso()));
  const metaOrigin = $derived(meta.origin);
  const windowDays = $derived(meta.windowDays);
  const today = $derived(dayIndex(metaOrigin, todayIso()));

  const rows = $derived(
    roadmaps.map((rm, idx) => {
      const extent = getRoadmapExtent(rm);
      return { rm, idx, slot: idx, extent };
    }),
  );

  const totalWidth = $derived(windowDays * store.dayW);
  const totalHeight = $derived(Math.max(roadmaps.length * ROW_H, 200));
  const quarters = $derived(getQuarterSegments(metaOrigin, windowDays));

  function geom(startIso: IsoDate, endIso: IsoDate) {
    const s = dayIndex(metaOrigin, startIso);
    const e = dayIndex(metaOrigin, endIso);
    return { left: dayToX(s, store.dayW), width: (e - s) * store.dayW };
  }

  // Same 200px lead-in as the Gantt: both views put a 250px sticky sidebar over
  // the left edge of the scroll port, so this lands today clear of it.
  export function scrollToToday() {
    if (scrollEl) scrollEl.scrollLeft = Math.max(0, today * store.dayW - 200);
  }

  // "Todos" is the app's landing view, and the question it answers is "how are
  // things going right now" — so entering it looks at today rather than at
  // whatever the calendar origin happens to be. The grid width comes from inline
  // styles, already applied by the time this runs, so the container is scrollable
  // without waiting for a tick.
  onMount(scrollToToday);

  // ---- inline delete (two-step confirm, no browser dialog) ----
  // "Todos" is the only surface that deletes roadmaps, so this lives here and
  // not in the topbar: the row is wide enough to show what is about to go, and
  // the navigation path stays free of destructive controls.
  let confirmDel = $state<string | null>(null);

  function delRoadmap(id: string) {
    if (confirmDel !== id) {
      confirmDel = id;
      return;
    }
    confirmDel = null;
    store.deleteRoadmap(id);
    // The detail drawer points at a phase/item that may belong to the roadmap
    // just removed, so it would stay open over a target that no longer exists.
    if (ui.drawer.kind === 'detail') ui.closeDrawer();
  }

  // Any interaction outside the delete buttons drops a pending confirmation.
  // `pointerdown` rather than `blur`: in WKWebView (Tauri on macOS) buttons
  // don't take focus when clicked, so blur would never fire. Events born
  // inside a delete button are left alone so the second press reaches its
  // own handler instead of just re-arming.
  $effect(() => {
    if (confirmDel === null) return;
    const cancel = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-row-del]')) return;
      confirmDel = null;
    };
    window.addEventListener('pointerdown', cancel, true);
    return () => window.removeEventListener('pointerdown', cancel, true);
  });
</script>

{#if roadmaps.length === 0}
  <!-- "Todos" is where the app starts, so a first-time user lands here. A grid
       of quarters with no rows would explain nothing and offer no way out. -->
  <div class="empty">
    <p class="empty-title">Todavía no hay ningún roadmap</p>
    <p class="empty-hint">Esta vista reúne todos tus roadmaps y es desde donde se gestionan.</p>
    <button type="button" class="empty-cta" onclick={() => store.addRoadmap()}
      >+ crear el primero</button
    >
  </div>
{:else}
  <div class="gantt-scroll" bind:this={scrollEl}>
    <div class="sidebar">
      <div class="sidebar-head"></div>
      <div class="sidebar-head-spacer"></div>
      <div class="sidebar-rows">
        {#each rows as r (r.rm.id)}
          <div class="row-label">
            <span class="dot" style:background={theme.slotColor(r.slot)}></span>
            <input
              class="rl-input"
              value={r.rm.name}
              oninput={(e) => store.renameRoadmap(r.rm.id, e.currentTarget.value)}
            />
            <!-- The bar in the grid opens the roadmap too, but a roadmap without
               dates has no bar; this button is what keeps it reachable. -->
            <button
              type="button"
              class="row-open"
              onclick={() => store.setActive(r.rm.id)}
              title="abrir roadmap"
              aria-label="abrir {r.rm.name}">▸</button
            >
            <button
              type="button"
              class="row-del"
              class:confirm={confirmDel === r.rm.id}
              data-row-del
              onclick={() => delRoadmap(r.rm.id)}
              title={confirmDel === r.rm.id ? 'confirmar borrado' : 'borrar roadmap'}
              >{confirmDel === r.rm.id ? 'borrar?' : '✕'}</button
            >
          </div>
        {/each}
      </div>
    </div>

    <div class="grid-area" style:width="{totalWidth}px">
      <div class="month-header"></div>
      <div class="sprint-header" style:width="{totalWidth}px">
        {#each quarters as q (q.year + '-' + q.q)}
          <div
            class="sprint-label {q.q % 2 === 1 ? 'a' : 'b'}"
            style:left="{dayToX(q.start, store.dayW)}px"
            style:width="{(q.end - q.start) * store.dayW}px"
          >
            Q{q.q} '{String(q.year).slice(2)}
          </div>
        {/each}
      </div>

      <div class="rows" style:width="{totalWidth}px" style:height="{totalHeight}px">
        {#each quarters as q (q.year + '-' + q.q)}
          <div
            class="grid-line"
            style:left="{dayToX(q.start, store.dayW)}px"
            style:height="{totalHeight}px"
          ></div>
        {/each}
        <!-- No visibility guard, unlike the Gantt: `metaOrigin` and `windowDays`
             are built to contain today, so the condition would always hold and
             would only invite the question of when it doesn't. -->
        <div
          class="today-line"
          style:left="{dayToX(today, store.dayW)}px"
          style:height="{totalHeight}px"
        >
          <div class="today-flag">HOY</div>
        </div>
        {#each rows as r, i (r.rm.id)}
          <div class="track" style:top="{i * ROW_H}px">
            {#if r.extent}
              {@const g = geom(r.extent.start, r.extent.end)}
              <button
                type="button"
                class="bar"
                style:left="{g.left}px"
                style:width="{g.width}px"
                style:background={theme.slotColor(r.slot)}
                style:--bar-ink={theme.inkFor(r.slot)}
                onclick={() => store.setActive(r.rm.id)}
                title="{r.rm.name} · {fmtDate(r.extent.start)} → {fmtDate(r.extent.end)}"
              >
                <span class="barlabel">{r.rm.name}</span>
              </button>
            {:else}
              <div class="track-hint">sin fechas</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .empty {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-family: 'IBM Plex Mono', monospace;
    color: var(--text-dim);
  }
  .empty-title {
    margin: 0;
    font-size: 14px;
    color: var(--text);
  }
  .empty-hint {
    margin: 0;
    font-size: 12px;
    max-width: 380px;
    text-align: center;
  }
  .empty-cta {
    margin-top: 6px;
    background: none;
    border: 1px dashed var(--line);
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    border-radius: 6px;
    height: 32px;
    padding: 0 14px;
    cursor: pointer;
  }
  .empty-cta:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .gantt-scroll {
    display: flex;
    overflow: auto;
    height: 100%;
  }
  .sidebar {
    position: sticky;
    left: 0;
    z-index: 6;
    width: 250px;
    flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--line);
  }
  .sidebar-head {
    height: 38px;
    border-bottom: 1px solid var(--line);
  }
  .sidebar-head-spacer {
    height: 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .row-label {
    display: flex;
    align-items: center;
    gap: 6px;
    height: var(--row-h);
    padding: 0 10px;
    border-bottom: 1px solid var(--line-weak);
  }
  /* Same vocabulary as the phase rows in Gantt.svelte: the name is a live
     input, the row reveals its controls on hover. */
  .rl-input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    outline: none;
  }
  .row-open,
  .row-del {
    opacity: 0;
    flex-shrink: 0;
    min-width: 16px;
    height: 16px;
    border: none;
    background: none;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0 4px;
  }
  .row-label:hover .row-open,
  .row-label:hover .row-del,
  .row-open:focus-visible,
  .row-del:focus-visible {
    opacity: 1;
  }
  .row-open:hover {
    color: var(--accent);
  }
  .row-del:hover {
    background: var(--danger);
    color: var(--ink-on-danger);
  }
  .row-del.confirm {
    opacity: 1;
    background: var(--danger);
    color: var(--ink-on-danger);
    font-size: 9px;
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 600;
  }
  .dot {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    flex-shrink: 0;
    border: var(--line-width) solid var(--bar-border);
  }
  .grid-area {
    position: relative;
    flex-shrink: 0;
  }
  .month-header {
    position: sticky;
    top: 0;
    z-index: 4;
    height: 38px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .sprint-header {
    position: sticky;
    top: 38px;
    z-index: 4;
    height: 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .sprint-label {
    position: absolute;
    top: 0;
    height: 20px;
    display: flex;
    align-items: center;
    padding-left: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    box-sizing: border-box;
    border-right: 1px solid var(--line-weak);
  }
  .sprint-label.a {
    background: var(--tint-accent);
  }
  .sprint-label.b {
    background: var(--hover);
  }
  .rows {
    position: relative;
  }
  .grid-line {
    position: absolute;
    top: 0;
    width: 1px;
    background: var(--line);
  }
  /* Same marker as the roadmap view, down to the z-index: the two views should
     read as one app. Above the sticky headers (4), so `.today-flag` — which hangs
     above this element — isn't painted over by the opaque quarter header, and
     below the sticky sidebar (6), which has to keep covering the timeline. */
  .today-line {
    position: absolute;
    top: 0;
    width: 2px;
    background: var(--accent);
    z-index: 5;
    box-shadow: 0 0 8px var(--accent);
    pointer-events: none;
  }
  .today-flag {
    position: absolute;
    top: -34px;
    left: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--accent);
    white-space: nowrap;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .track {
    position: absolute;
    left: 0;
    right: 0;
    height: var(--row-h);
    border-bottom: 1px solid var(--line-weak);
  }
  .track-hint {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    opacity: 0.55;
  }
  /* A button, not a div: the bar is the obvious target for opening a roadmap,
     so it has to be reachable by keyboard too. Hence the reset. */
  .bar {
    position: absolute;
    top: 8px;
    height: 36px;
    border: none;
    border-radius: var(--bar-radius);
    display: flex;
    align-items: center;
    padding: 0 8px;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 1px 0 var(--shadow-medium) inset;
  }
  .barlabel {
    flex: 1;
    font-size: 13px;
    color: var(--bar-ink);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
