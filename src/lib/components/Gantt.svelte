<script lang="ts">
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import { ROW_H } from '../config';
  import {
    dayIndex,
    dayToX,
    fmtDate,
    todayIso,
    dayOfWeek,
    dateFromDay,
    snapToWorkday,
    snapForward,
  } from '../time/timeline';
  import { getMonthSegments, getSprintSegments } from '../time/segments';
  import { getVisibleRows, effectiveStart, effectiveEnd } from '../model/derive';
  import { getMinStart } from '../model/constraints';
  import { getInitials, findAssignee } from '../util/assignees';
  import { onDrag, clientToDayOffset } from '../interactions/drag';
  import type { IsoDate, Item, Phase } from '../model/types';

  let scrollEl: HTMLDivElement | undefined;

  const rm = $derived(store.activeRoadmap!);
  const dayW = $derived(store.dayW);
  const windowDays = $derived(rm.windowDays);
  const totalWidth = $derived(windowDays * dayW);
  const visible = $derived(getVisibleRows(rm));
  const totalHeight = $derived(Math.max(visible.length * ROW_H, 200));

  const months = $derived(getMonthSegments(rm.startDate, windowDays));
  const sprints = $derived(getSprintSegments(rm.startDate, windowDays));
  const today = $derived(dayIndex(rm.startDate, todayIso()));
  const currentSprint = $derived(sprints.find((s) => today >= s.start && today < s.end));

  const w0 = $derived(dayOfWeek(rm.startDate));
  const weekends = $derived.by(() => {
    const out: number[] = [];
    for (let d = (6 - w0 + 7) % 7; d < windowDays; d += 7) out.push(d);
    return out;
  });
  const weekLines = $derived.by(() => {
    const out: number[] = [];
    for (let d = (1 - w0 + 7) % 7; d < windowDays; d += 7) out.push(d);
    return out;
  });

  // ---- day-offset <-> ISO helpers relative to this roadmap's start ----
  const off = (iso: IsoDate) => dayIndex(rm.startDate, iso);
  const iso = (o: number) => dateFromDay(rm.startDate, o);
  const snapOff = (o: number) => off(snapToWorkday(iso(Math.max(0, o))));
  const snapFwdOff = (o: number) => off(snapForward(iso(Math.max(0, o))));

  function barGeom(startIso: IsoDate, endIso: IsoDate) {
    const s = off(startIso);
    const e = off(endIso);
    return { left: dayToX(s, dayW), width: (e - s) * dayW };
  }
  const milestoneLeft = (i: IsoDate) => off(i) * dayW - 15;

  export function scrollToToday() {
    if (scrollEl) scrollEl.scrollLeft = Math.max(0, today * dayW - 200);
  }

  // ---- drag tooltip ----
  function tip(ev: PointerEvent, lo: number, hi: number) {
    ui.showTooltip(ev.clientX + 16, ev.clientY - 44, `${fmtDate(iso(lo))} → ${fmtDate(iso(hi))}`);
  }

  // ---- create by drag (empty phase track or "add" row) ----
  let createPreview = $state<{ rowIndex: number; left: number; width: number } | null>(null);

  function startCreate(e: PointerEvent, rowIndex: number, phaseId: string, isItem: boolean) {
    const trackEl = e.currentTarget as HTMLElement;
    const rect = trackEl.getBoundingClientRect();
    const startDay = snapOff(clientToDayOffset(e.clientX, rect.left, dayW));
    let curDay = startDay;
    const paint = (ev: PointerEvent) => {
      const lo = Math.min(startDay, curDay);
      const hi = Math.max(startDay, curDay);
      createPreview = { rowIndex, left: dayToX(lo, dayW), width: Math.max((hi - lo) * dayW, dayW) };
      tip(ev, lo, Math.max(hi, lo + 1));
    };
    paint(e);
    onDrag(e, {
      move: (ev) => {
        curDay = snapOff(clientToDayOffset(ev.clientX, rect.left, dayW));
        paint(ev);
      },
      up: () => {
        ui.hideTooltip();
        createPreview = null;
        let lo = Math.min(startDay, curDay);
        let hi = Math.max(startDay, curDay);
        if (hi - lo < 3) hi = lo + 30;
        lo = snapOff(lo);
        hi = snapOff(hi);
        if (hi <= lo) hi = lo + 1;
        if (isItem) store.addItem(phaseId, { startDate: iso(lo), endDate: iso(hi) });
        else store.setPhaseDates(phaseId, iso(lo), iso(hi));
      },
    });
  }

  // ---- move / resize an existing bar (phase with dates, or item) ----
  type DateTarget = {
    get start(): IsoDate;
    set start(v: IsoDate);
    get end(): IsoDate;
    set end(v: IsoDate);
    minStartOff: number;
    isMilestone: boolean;
  };

  function itemTarget(phase: Phase, item: Item): DateTarget {
    const minIso = getMinStart(phase, item);
    return {
      get start() {
        return item.startDate;
      },
      set start(v) {
        item.startDate = v;
      },
      get end() {
        return item.endDate;
      },
      set end(v) {
        item.endDate = v;
      },
      minStartOff: minIso ? off(minIso) : 0,
      isMilestone: item.isMilestone,
    };
  }

  function phaseTarget(phase: Phase): DateTarget {
    return {
      get start() {
        return phase.startDate!;
      },
      set start(v) {
        phase.startDate = v;
      },
      get end() {
        return phase.endDate!;
      },
      set end(v) {
        phase.endDate = v;
      },
      minStartOff: 0,
      isMilestone: false,
    };
  }

  function commit(phaseId: string, itemId: string | null, t: DateTarget) {
    if (itemId) store.setItemDates(phaseId, itemId, t.start, t.end);
    else store.setPhaseDates(phaseId, t.start, t.end);
  }

  function startMove(e: PointerEvent, phaseId: string, itemId: string | null, t: DateTarget) {
    e.stopPropagation();
    const barEl = (e.currentTarget as HTMLElement).closest('.bar, .milestone') as HTMLElement;
    const rect = (barEl.parentElement as HTMLElement).getBoundingClientRect();
    const startOff = off(t.start);
    const duration = off(t.end) - startOff;
    const grab = clientToDayOffset(e.clientX, rect.left, dayW) - startOff;
    tip(e, startOff, startOff + duration);
    onDrag(e, {
      move: (ev) => {
        let ns = clientToDayOffset(ev.clientX, rect.left, dayW) - grab;
        ns = Math.max(t.minStartOff, Math.min(ns, windowDays - duration));
        ns = snapOff(ns);
        if (ns < t.minStartOff) ns = snapFwdOff(t.minStartOff);
        t.start = iso(ns);
        t.end = iso(ns + duration);
        tip(ev, ns, ns + duration);
      },
      up: () => {
        ui.hideTooltip();
        commit(phaseId, itemId, t);
      },
    });
  }

  function startResize(
    e: PointerEvent,
    phaseId: string,
    itemId: string | null,
    t: DateTarget,
    side: 'left' | 'right',
  ) {
    e.stopPropagation();
    const barEl = (e.currentTarget as HTMLElement).closest('.bar') as HTMLElement;
    const rect = (barEl.parentElement as HTMLElement).getBoundingClientRect();
    tip(e, off(t.start), off(t.end));
    onDrag(e, {
      move: (ev) => {
        let day = clientToDayOffset(ev.clientX, rect.left, dayW);
        if (side === 'left') {
          day = Math.max(t.minStartOff, Math.min(day, off(t.end) - 1));
          day = snapOff(day);
          if (day < t.minStartOff) day = snapFwdOff(t.minStartOff);
          if (day >= off(t.end)) day = off(t.end) - 1;
          t.start = iso(day);
          tip(ev, day, off(t.end));
        } else {
          day = Math.max(off(t.start) + 1, Math.min(day, windowDays));
          day = snapOff(day);
          if (day <= off(t.start)) day = off(t.start) + 1;
          t.end = iso(day);
          tip(ev, off(t.start), day);
        }
      },
      up: () => {
        ui.hideTooltip();
        commit(phaseId, itemId, t);
      },
    });
  }

  function startMilestoneMove(e: PointerEvent, phase: Phase, item: Item) {
    e.stopPropagation();
    const t = itemTarget(phase, item);
    const rect = (
      (e.currentTarget as HTMLElement).closest('.milestone')!.parentElement as HTMLElement
    ).getBoundingClientRect();
    tip(e, off(t.start), off(t.start));
    onDrag(e, {
      move: (ev) => {
        let day = snapOff(Math.max(t.minStartOff, clientToDayOffset(ev.clientX, rect.left, dayW)));
        if (day < t.minStartOff) day = snapFwdOff(t.minStartOff);
        item.startDate = iso(day);
        item.endDate = iso(day);
        tip(ev, day, day);
      },
      up: () => {
        ui.hideTooltip();
        store.setItemDates(phase.id, item.id, item.startDate, item.endDate);
      },
    });
  }

  // ---- inline delete (two-step confirm, no browser dialog) ----
  let confirmDel = $state<string | null>(null);
  function delRow(kind: 'phase' | 'item', phaseId: string, itemId?: string) {
    const key = itemId ?? phaseId;
    if (confirmDel !== key) {
      confirmDel = key;
      return;
    }
    confirmDel = null;
    if (kind === 'phase') store.deletePhase(phaseId);
    else store.deleteItem(phaseId, itemId!);
  }

  // ---- dependency arrows ----
  const itemRowIndex = $derived.by(() => {
    const m = new Map<string, number>();
    visible.forEach((v, i) => {
      if (v.kind === 'item') m.set(v.item.id, i);
    });
    return m;
  });

  const arrows = $derived.by(() => {
    const out: { d: string; title: string }[] = [];
    for (const v of visible) {
      if (v.kind !== 'item') continue;
      const to = v.item;
      const toIdx = itemRowIndex.get(to.id);
      if (toIdx === undefined) continue;
      for (const depId of to.dependsOn) {
        const from = v.phase.children.find((c) => c.id === depId);
        const fromIdx = from ? itemRowIndex.get(from.id) : undefined;
        if (!from || fromIdx === undefined) continue;
        const x1 = from.isMilestone ? off(from.startDate) * dayW + 15 : off(from.endDate) * dayW;
        const y1 = fromIdx * ROW_H + ROW_H / 2;
        const x2 = to.isMilestone ? off(to.startDate) * dayW - 15 : off(to.startDate) * dayW;
        const y2 = toIdx * ROW_H + ROW_H / 2;
        const dx = Math.max(16, Math.abs(x2 - x1) / 2);
        out.push({
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
          title: `${from.label} → ${to.label}`,
        });
      }
    }
    return out;
  });
</script>

<div class="gantt-scroll" bind:this={scrollEl}>
  <div class="sidebar">
    <div class="sidebar-head"></div>
    <div class="sidebar-head-spacer"></div>
    <div class="sidebar-rows">
      {#each visible as v, i (i)}
        {#if v.kind === 'phase'}
          <div class="row-label">
            <button
              type="button"
              class="chev"
              class:expanded={v.phase.expanded}
              class:hidden={v.phase.children.length === 0}
              onclick={() => store.togglePhaseExpanded(v.phase.id)}
              aria-label={v.phase.expanded ? 'plegar fase' : 'desplegar fase'}>▸</button
            >
            <span class="dot" style:background={v.phase.color}></span>
            <input
              class="rl-input"
              value={v.phase.name}
              oninput={(e) => store.renamePhase(v.phase.id, e.currentTarget.value)}
            />
            <button
              type="button"
              class="row-del"
              class:confirm={confirmDel === v.phase.id}
              onclick={() => delRow('phase', v.phase.id)}
              title="borrar fase">{confirmDel === v.phase.id ? 'borrar?' : '✕'}</button
            >
          </div>
        {:else if v.kind === 'item'}
          <div class="row-label item">
            <span class="dot small" style:background={v.item.color}></span>
            <input
              class="rl-input"
              value={v.item.label}
              oninput={(e) => store.renameItem(v.phase.id, v.item.id, e.currentTarget.value)}
            />
            <button
              type="button"
              class="row-del"
              class:confirm={confirmDel === v.item.id}
              onclick={() => delRow('item', v.phase.id, v.item.id)}
              title="borrar item">{confirmDel === v.item.id ? 'borrar?' : '✕'}</button
            >
          </div>
        {:else}
          <div class="row-label add-actions">
            <button type="button" class="add-btn" onclick={() => store.addItem(v.phase.id)}
              >+ item</button
            >
            <button type="button" class="add-btn" onclick={() => store.addMilestone(v.phase.id)}
              >+ hito</button
            >
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <div class="grid-area" style:width="{totalWidth}px">
    <div class="month-header" style:width="{totalWidth}px">
      {#each months as m (m.start)}
        <div
          class="month-label"
          class:year-start={m.yearStart}
          style:left="{dayToX(m.start, dayW)}px"
          style:width="{(m.end - m.start) * dayW}px"
        >
          {m.label}
        </div>
      {/each}
    </div>

    <div class="sprint-header" style:width="{totalWidth}px">
      {#each sprints as s, i (s.start)}
        <div
          class="sprint-label {i % 2 === 0 ? 'a' : 'b'}"
          class:current={s === currentSprint}
          style:left="{dayToX(s.start, dayW)}px"
          style:width="{(s.end - s.start) * dayW}px"
        >
          S{String(s.num).padStart(2, '0')}
        </div>
      {/each}
    </div>

    <div class="rows" style:width="{totalWidth}px" style:height="{totalHeight}px">
      {#each weekends as d (d)}
        <div
          class="weekend-bg"
          style:left="{dayToX(d, dayW)}px"
          style:width="{2 * dayW}px"
          style:height="{totalHeight}px"
        ></div>
      {/each}
      {#each months as m (m.start)}
        <div
          class="grid-line"
          class:year={m.yearStart}
          style:left="{dayToX(m.start, dayW)}px"
          style:height="{totalHeight}px"
        ></div>
      {/each}
      {#each weekLines as d (d)}
        <div
          class="grid-line week"
          style:left="{dayToX(d, dayW)}px"
          style:height="{totalHeight}px"
        ></div>
      {/each}
      {#if today >= 0 && today <= windowDays}
        <div class="today-line" style:left="{dayToX(today, dayW)}px" style:height="{totalHeight}px">
          <div class="today-flag">HOY</div>
        </div>
      {/if}

      {#if arrows.length}
        <svg class="deps-svg" width={totalWidth} height={totalHeight}>
          <defs>
            <marker
              id="depArrow"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L6,3.5 L0,7 Z" fill="#22D3EE" />
            </marker>
          </defs>
          {#each arrows as a (a.d)}
            <path class="dep-path" d={a.d} marker-end="url(#depArrow)"
              ><title>{a.title}</title></path
            >
          {/each}
        </svg>
      {/if}

      {#each visible as v, i (i)}
        {@const s = v.kind === 'phase' ? effectiveStart(v.phase) : null}
        {@const e = v.kind === 'phase' ? effectiveEnd(v.phase) : null}
        <div
          class="track"
          class:item-track={v.kind === 'item'}
          class:add-track={v.kind === 'add'}
          style:top="{i * ROW_H}px"
        >
          {#if createPreview && createPreview.rowIndex === i}
            <div
              class="ghost"
              style:left="{createPreview.left}px"
              style:width="{createPreview.width}px"
            ></div>
          {/if}

          {#if v.kind === 'phase' && v.phase.children.length > 0 && s !== null && e !== null}
            {@const g = barGeom(s, e)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="bar rollup"
              style:left="{g.left}px"
              style:width="{g.width}px"
              style:background={v.phase.color}
              title="{fmtDate(s)} → {fmtDate(e)} ({v.phase.children.length} items)"
              ondblclick={() => ui.openDetail(v.phase.id, null)}
            >
              <span class="barlabel">{v.phase.name}</span>
              <span class="bar-meta">{v.phase.children.length} items</span>
            </div>
          {:else if v.kind === 'phase' && s !== null && e !== null}
            {@const g = barGeom(s, e)}
            {@const t = phaseTarget(v.phase)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="bar"
              style:left="{g.left}px"
              style:width="{g.width}px"
              style:background={v.phase.color}
              title="{fmtDate(s)} → {fmtDate(e)}"
              ondblclick={() => ui.openDetail(v.phase.id, null)}
            >
              <button
                type="button"
                class="grip"
                onpointerdown={(ev) => startMove(ev, v.phase.id, null, t)}
                aria-label="mover">⠿</button
              >
              <span
                class="barlabel"
                onpointerdown={(ev) => startMove(ev, v.phase.id, null, t)}
                role="presentation">{v.phase.name}</span
              >
              <button
                type="button"
                class="handle left"
                onpointerdown={(ev) => startResize(ev, v.phase.id, null, t, 'left')}
                aria-label="redimensionar inicio"
              ></button>
              <button
                type="button"
                class="handle right"
                onpointerdown={(ev) => startResize(ev, v.phase.id, null, t, 'right')}
                aria-label="redimensionar fin"
              ></button>
            </div>
          {:else if v.kind === 'phase'}
            <div
              class="track-hint"
              onpointerdown={(ev) => startCreate(ev, i, v.phase.id, false)}
              role="presentation"
            >
              arrastra para crear fase →
            </div>
          {:else if v.kind === 'item' && v.item.isMilestone}
            {@const a = findAssignee(store.data.assignees, v.item.assigneeId)}
            <div
              class="milestone"
              style:left="{milestoneLeft(v.item.startDate)}px"
              ondblclick={() => ui.openDetail(v.phase.id, v.item.id)}
              role="presentation"
            >
              <svg
                viewBox="0 0 24 24"
                onpointerdown={(ev) => startMilestoneMove(ev, v.phase, v.item)}
                role="presentation"
              >
                <polygon
                  points="12,1.5 22.5,12 12,22.5 1.5,12"
                  fill={v.phase.color}
                  stroke="rgba(0,0,0,.3)"
                  stroke-width="1"
                />
                <title>{v.item.label} · {fmtDate(v.item.startDate)}</title>
              </svg>
              <span class="m-label">{v.item.label}</span>
              {#if a}<span class="assignee-badge item" style:background={a.color}
                  >{getInitials(a.name)}</span
                >{/if}
              {#if v.item.notes.trim()}<span class="notes-indicator" title="Con notas">●</span>{/if}
            </div>
          {:else if v.kind === 'item'}
            {@const g = barGeom(v.item.startDate, v.item.endDate)}
            {@const a = findAssignee(store.data.assignees, v.item.assigneeId)}
            {@const t = itemTarget(v.phase, v.item)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="bar item-bar"
              style:left="{g.left}px"
              style:width="{g.width}px"
              style:background={v.phase.color}
              title="{v.item.label}&#10;{fmtDate(v.item.startDate)} → {fmtDate(v.item.endDate)}"
              ondblclick={() => ui.openDetail(v.phase.id, v.item.id)}
            >
              <button
                type="button"
                class="grip"
                onpointerdown={(ev) => startMove(ev, v.phase.id, v.item.id, t)}
                aria-label="mover">⠿</button
              >
              <span
                class="barlabel"
                onpointerdown={(ev) => startMove(ev, v.phase.id, v.item.id, t)}
                role="presentation">{v.item.label}</span
              >
              {#if a}<span class="assignee-badge item" style:background={a.color}
                  >{getInitials(a.name)}</span
                >{/if}
              {#if v.item.notes.trim()}<span class="notes-indicator" title="Con notas">●</span>{/if}
              <button
                type="button"
                class="handle left"
                onpointerdown={(ev) => startResize(ev, v.phase.id, v.item.id, t, 'left')}
                aria-label="redimensionar inicio"
              ></button>
              <button
                type="button"
                class="handle right"
                onpointerdown={(ev) => startResize(ev, v.phase.id, v.item.id, t, 'right')}
                aria-label="redimensionar fin"
              ></button>
            </div>
          {:else}
            <div
              class="track-hint"
              onpointerdown={(ev) => startCreate(ev, i, v.phase.id, true)}
              role="presentation"
            >
              arrastra para crear item →
            </div>
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
    background: var(--panel);
    border-right: 1px solid var(--line-strong);
  }
  .sidebar-head {
    height: 38px;
    border-bottom: 1px solid var(--line-strong);
  }
  .sidebar-head-spacer {
    height: 20px;
    background: var(--panel);
    border-bottom: 1px solid var(--line-strong);
  }
  .row-label {
    display: flex;
    align-items: center;
    gap: 6px;
    height: var(--row-h);
    padding: 0 10px;
    border-bottom: 1px solid var(--line);
  }
  .row-label.item {
    padding-left: 28px;
    background: rgba(255, 255, 255, 0.012);
  }
  .row-label.add-actions {
    padding-left: 28px;
    gap: 6px;
  }
  .add-btn {
    background: transparent;
    border: 1px dashed var(--line-strong);
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
  }
  .add-btn:hover {
    color: var(--cyan);
    border-color: var(--cyan);
  }
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
  .row-label.item .rl-input {
    font-size: 13px;
    color: #cfd3da;
  }
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
    color: var(--muted);
    cursor: pointer;
    padding: 0 4px;
  }
  .row-label:hover .row-del {
    opacity: 1;
  }
  .row-del:hover {
    background: var(--danger);
    color: #fff;
  }
  .row-del.confirm {
    opacity: 1;
    background: var(--danger);
    color: #fff;
    font-size: 9px;
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 600;
  }
  .chev {
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    cursor: pointer;
    font-size: 9px;
    flex-shrink: 0;
    user-select: none;
    transition: transform 0.15s;
    background: none;
    border: none;
    padding: 0;
  }
  .chev.expanded {
    transform: rotate(90deg);
  }
  .chev.hidden {
    visibility: hidden;
  }
  .chev:hover {
    color: var(--cyan);
  }
  .dot {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
  .dot.small {
    width: 8px;
    height: 8px;
    border-radius: 2px;
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
    background: var(--panel);
    border-bottom: 1px solid var(--line-strong);
  }
  .month-label {
    position: absolute;
    top: 0;
    height: 38px;
    display: flex;
    align-items: center;
    padding-left: 8px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    color: #c5cbd4;
    border-left: 1px solid var(--line-strong);
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  .month-label.year-start {
    color: var(--cyan);
    font-weight: 700;
    border-left: 2px solid var(--cyan);
    font-size: 13px;
    letter-spacing: 0.05em;
  }
  .sprint-header {
    position: sticky;
    top: 38px;
    z-index: 4;
    height: 20px;
    background: var(--panel);
    border-bottom: 1px solid var(--line-strong);
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
    color: var(--muted);
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    box-sizing: border-box;
    border-right: 1px solid var(--line);
  }
  .sprint-label.a {
    background: rgba(34, 211, 238, 0.09);
  }
  .sprint-label.b {
    background: rgba(255, 255, 255, 0.04);
  }
  .sprint-label.current {
    color: var(--cyan);
    font-weight: 700;
    box-shadow: inset 0 0 0 1px var(--cyan);
  }

  .rows {
    position: relative;
  }
  .weekend-bg {
    position: absolute;
    top: 0;
    background: rgba(120, 140, 175, 0.14);
    border-left: 1px solid rgba(120, 140, 175, 0.08);
    border-right: 1px solid rgba(120, 140, 175, 0.08);
    z-index: 1;
    pointer-events: none;
  }
  .grid-line {
    position: absolute;
    top: 0;
    width: 1px;
    background: var(--line-strong);
  }
  .grid-line.week {
    background: var(--line);
    opacity: 0.55;
  }
  .grid-line.year {
    background: var(--cyan);
    opacity: 0.35;
    width: 2px;
  }
  .today-line {
    position: absolute;
    top: 0;
    width: 2px;
    background: var(--cyan);
    z-index: 3;
    box-shadow: 0 0 8px var(--cyan);
    pointer-events: none;
  }
  .today-flag {
    position: absolute;
    top: -34px;
    left: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--cyan);
    white-space: nowrap;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .deps-svg {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    overflow: visible;
    z-index: 2;
  }
  .dep-path {
    fill: none;
    stroke: #22d3ee;
    stroke-width: 1.6;
  }
  .track {
    position: absolute;
    left: 0;
    right: 0;
    height: var(--row-h);
    border-bottom: 1px solid var(--line);
  }
  .track.item-track {
    background: rgba(255, 255, 255, 0.012);
  }
  .track.add-track {
    background: rgba(77, 208, 200, 0.02);
  }
  .track-hint {
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 0;
    right: 0;
    display: flex;
    align-items: center;
    font-size: 12px;
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
    opacity: 0.55;
    cursor: crosshair;
  }
  .ghost {
    position: absolute;
    top: 8px;
    height: 36px;
    border-radius: 6px;
    background: rgba(34, 211, 238, 0.25);
    border: 1px dashed var(--cyan);
    z-index: 5;
    pointer-events: none;
  }
  .bar {
    position: absolute;
    top: 8px;
    height: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4) inset;
    padding: 0 8px;
    gap: 6px;
    cursor: default;
  }
  .bar.item-bar {
    opacity: 0.92;
  }
  .bar.rollup {
    cursor: default;
  }
  .grip {
    width: 14px;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(0, 0, 0, 0.4);
    font-size: 11px;
    flex-shrink: 0;
    cursor: grab;
    background: none;
    border: none;
    padding: 0;
  }
  .grip:active {
    cursor: grabbing;
  }
  .barlabel {
    flex: 1;
    font-size: 13px;
    color: #0b0d10;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: grab;
  }
  .bar-meta {
    font-size: 11px;
    color: rgba(0, 0, 0, 0.55);
    font-family: 'IBM Plex Mono', monospace;
    flex-shrink: 0;
  }
  .handle {
    position: absolute;
    top: 0;
    width: 8px;
    height: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: ew-resize;
  }
  .handle.left {
    left: 0;
  }
  .handle.right {
    right: 0;
  }
  .milestone {
    position: absolute;
    top: 11px;
    height: 30px;
    display: flex;
    align-items: center;
  }
  .milestone svg {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
    cursor: grab;
  }
  .milestone svg:active {
    cursor: grabbing;
  }
  .milestone .m-label {
    margin-left: 6px;
    font-size: 12px;
    color: var(--text);
    font-weight: 600;
    white-space: nowrap;
    background: rgba(11, 13, 16, 0.65);
    padding: 2px 6px;
    border-radius: 3px;
  }
  .assignee-badge {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 600;
    color: #0b0d10;
    flex-shrink: 0;
  }
  .assignee-badge.item {
    width: 18px;
    height: 18px;
    font-size: 9px;
    margin-left: 4px;
  }
  .notes-indicator {
    font-size: 10px;
    color: var(--muted);
    margin-left: 4px;
  }
</style>
