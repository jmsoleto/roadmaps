<script lang="ts">
  import { store } from '../store/app.svelte';
  import { ROW_H } from '../config';
  import { theme } from '../theme/theme.svelte';
  import { dayIndex, dayToX, fmtDate } from '../time/timeline';
  import { getQuarterSegments } from '../time/segments';
  import { getRoadmapExtent } from '../model/derive';
  import type { IsoDate } from '../model/types';

  const roadmaps = $derived(store.data.roadmaps);

  // Common meta timeline: origin = earliest roadmap start, window covers all extents.
  const metaOrigin = $derived.by<IsoDate>(() =>
    roadmaps
      .map((r) => r.startDate)
      .reduce((a, b) => (a < b ? a : b), roadmaps[0]?.startDate ?? '2026-01-01'),
  );

  const rows = $derived(
    roadmaps.map((rm, idx) => {
      const extent = getRoadmapExtent(rm);
      return { rm, idx, slot: idx, extent };
    }),
  );

  const windowDays = $derived.by(() => {
    let max = 365;
    for (const r of rows) {
      if (r.extent) max = Math.max(max, dayIndex(metaOrigin, r.extent.end) + 30);
    }
    return max;
  });

  const totalWidth = $derived(windowDays * store.dayW);
  const totalHeight = $derived(Math.max(roadmaps.length * ROW_H, 200));
  const quarters = $derived(getQuarterSegments(metaOrigin, windowDays));

  function geom(startIso: IsoDate, endIso: IsoDate) {
    const s = dayIndex(metaOrigin, startIso);
    const e = dayIndex(metaOrigin, endIso);
    return { left: dayToX(s, store.dayW), width: (e - s) * store.dayW };
  }
</script>

<div class="gantt-scroll">
  <div class="sidebar">
    <div class="sidebar-head"></div>
    <div class="sidebar-head-spacer"></div>
    <div class="sidebar-rows">
      {#each rows as r (r.rm.id)}
        <div class="row-label">
          <span class="dot" style:background={theme.slotColor(r.slot)}></span>
          <span class="rl-name">{r.rm.name}</span>
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
      {#each rows as r, i (r.rm.id)}
        <div class="track" style:top="{i * ROW_H}px">
          {#if r.extent}
            {@const g = geom(r.extent.start, r.extent.end)}
            <div
              class="bar"
              style:left="{g.left}px"
              style:width="{g.width}px"
              style:background={theme.slotColor(r.slot)}
              style:--bar-ink={theme.inkFor(r.slot)}
              title="{r.rm.name} · {fmtDate(r.extent.start)} → {fmtDate(r.extent.end)}"
            >
              <span class="barlabel">{r.rm.name}</span>
            </div>
          {:else}
            <div class="track-hint">sin fechas</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
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
  .rl-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13.5px;
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
  .bar {
    position: absolute;
    top: 8px;
    height: 36px;
    border-radius: var(--bar-radius);
    display: flex;
    align-items: center;
    padding: 0 8px;
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
