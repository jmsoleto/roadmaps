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
  import {
    getVisibleRows,
    effectiveStart,
    effectiveEnd,
    getPhaseBlocks,
    dropIndex,
    dropBlockIndex,
    previewRows,
    rowKey,
    type RowDrag,
    type VisibleRow,
  } from '../model/derive';
  import { getMinStart } from '../model/constraints';
  import {
    countBlockedChildren,
    findBlocker,
    isItemBlocked,
    isPhaseBlocked,
    pendingBlockers,
  } from '../model/blockers';
  import { isCompleted, phaseProgress } from '../model/completion';
  import PhaseProgress from './PhaseProgress.svelte';
  import { getInitials, findAssignee } from '../util/assignees';
  import { theme } from '../theme/theme.svelte';
  import { onDrag, clientToDayOffset } from '../interactions/drag';
  import { RowReorder } from '../interactions/reorder.svelte';
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

  // Opening a roadmap looks at its first day — the start the user configured —
  // whether or not anything is scheduled there.
  //
  // `App.svelte` doesn't key the branch that mounts this component, so switching
  // roadmaps from the topbar picker (or creating/importing one from inside
  // another) reuses this instance and would otherwise carry over a scroll offset
  // that means nothing in the new roadmap. An effect covers that and the plain
  // mount in one piece, since it runs on mount too.
  //
  // Comparing against the last roadmap scrolled for, rather than just resetting,
  // is what keeps this to once per roadmap: `rm` is derived from the store, so
  // the effect must never be able to yank the view back to day 0 in the middle
  // of editing — dragging a bar has to leave the viewport where it is.
  //
  // Horizontal only: the browser already clamps `scrollTop` on its own when the
  // new roadmap has fewer rows.
  let scrolledFor: string | undefined;
  $effect(() => {
    if (scrolledFor === rm.id) return;
    scrolledFor = rm.id;
    if (scrollEl) scrollEl.scrollLeft = 0;
  });

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

  // ---- vertical reordering ----

  /**
   * The gesture itself lives in `RowReorder` (D6). What stays here is what only
   * this view can say: how a phase block differs from an item row, and the
   * preview list that positions everything.
   */
  const reorder = new RowReorder<RowDrag>();

  function startReorder(e: PointerEvent, phase: Phase, item: Item | null) {
    // Snapshotted at pointerdown on purpose: the drop index is read against the
    // layout the gesture started from, never against the preview it produces,
    // or the two would feed each other and the held row would judder at every
    // boundary (see `dropBlockIndex`).
    const blocks = getPhaseBlocks(rm);
    const phaseIdx = rm.rows.findIndex((p) => p.id === phase.id);
    if (phaseIdx === -1) return;

    const from = item ? phase.children.findIndex((c) => c.id === item.id) : phaseIdx;
    if (from === -1) return;

    const payload: RowDrag = item
      ? { kind: 'item', phaseId: phase.id, itemId: item.id, from, to: from }
      : { kind: 'phase', phaseId: phase.id, from, to: from };

    const block = blocks[phaseIdx];
    const totalRows = blocks.reduce((n, b) => n + b.len, 0);

    reorder.start(e, {
      key: item ? `i:${item.id}` : `p:${phase.id}`,
      payload,
      from,
      // The held row's resting position: an item sits after its phase header, a
      // phase header at the top of its own block.
      originY: (item ? block.start + 1 + from : block.start) * ROW_H,
      // An item may only be drawn among the item rows of its own phase; a phase
      // header anywhere a block of its height could start.
      minY: item ? (block.start + 1) * ROW_H : 0,
      maxY: item ? (block.start + phase.children.length) * ROW_H : (totalRows - block.len) * ROW_H,
      target: (dy) =>
        item ? dropIndex(from, dy, phase.children.length) : dropBlockIndex(blocks, from, dy),
      drop: (to) => {
        if (item) store.moveItem(phase.id, item.id, to);
        else store.movePhase(phase.id, to);
      },
    });
  }

  /**
   * Every row's vertical position, for both halves of the Gantt (D5).
   *
   * Rows are rendered from `visible` but placed by their index in `preview` —
   * the list that would exist if the pending reorder were already applied — so
   * what you see mid-gesture is the outcome. The held row is the one exception:
   * it follows the pointer in pixels instead of snapping to the grid, which for
   * a phase means its children have already gone on ahead to the destination
   * while its header is still in your hand (D6).
   */
  const pending = $derived(
    reorder.gesture === null ? null : { ...reorder.gesture.payload, to: reorder.gesture.to },
  );
  const preview = $derived(previewRows(rm, pending));
  const previewIndex = $derived.by(() => {
    const m = new Map<string, number>();
    preview.forEach((v, i) => m.set(rowKey(v), i));
    return m;
  });

  const isHeld = (v: VisibleRow) => reorder.held(rowKey(v));

  function rowY(v: VisibleRow, i: number): number {
    const key = rowKey(v);
    return reorder.y(key, previewIndex.get(key) ?? i);
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

  // ---- external dependencies ----

  /**
   * Both tallies, each shown on its own badge.
   *
   * Pending and resolved are reported side by side rather than one replacing the
   * other: an item waiting on one thing and already served another is a
   * different situation from either alone, and the bar should say so without
   * being opened. A count of zero simply renders no badge (D4).
   */
  function blockerCounts(item: Item): { pending: number; resolved: number; title: string } | null {
    if (item.blockers.length === 0) return null;
    const lines = item.blockers.map((a) => {
      const b = findBlocker(store.data.blockers, a.blockerId);
      const who = b?.owner ? ` (${b.owner})` : '';
      return `${a.resolved ? '✓' : '⚠'} ${b?.name ?? '—'}${who}: ${a.feature || 'sin detallar'}`;
    });
    const pending = pendingBlockers(item).length;
    return {
      pending,
      resolved: item.blockers.length - pending,
      title: `Dependencias externas\n${lines.join('\n')}`,
    };
  }

  // ---- dependency arrows ----
  const itemRowIndex = $derived.by(() => {
    const m = new Map<string, number>();
    visible.forEach((v, i) => {
      // Fractional while a row is held, so the curves stay pinned to the bars
      // they connect instead of snapping to where the rows used to be.
      if (v.kind === 'item') m.set(v.item.id, rowY(v, i) / ROW_H);
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

<!--
  The two tallies of external dependencies, side by side.

  The glyphs are drawn rather than typed: ⚠ and ✓ from the mono face are thin
  outlines that dissolve at badge size, which is what made the first version
  unreadable. As paths they carry their own weight and stay crisp at any zoom.

  One snippet because this renders in four places — pending and resolved, on a
  bar and on a milestone — and the two contexts differ only in where the plate
  gets its color from.
-->
<!-- The completion mark. Same stroked path as the resolved-blocker badge —
     drawn rather than typed, because a monospace ✓ is a thin outline that comes
     apart at this size — and inheriting `--bar-ink`, the per-bar ink already
     computed from the slot color, so it contrasts on any palette in any theme
     without a new theme token (D7). Not a button: marking and unmarking live in
     the item drawer, where the cascade can be confirmed. -->
{#snippet checkMark()}
  <span class="done-mark" title="completado">
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 8.6 6.4 12.5 13.5 4.2" />
    </svg>
  </span>
{/snippet}

{#snippet depBadges(
  dep: { pending: number; resolved: number; title: string } | null,
  onBar: boolean,
)}
  {#if dep && dep.pending > 0}
    <span class="dep-badge pending" class:on-bar={onBar} title={dep.title}>
      <svg class="dep-icon" viewBox="0 0 16 16" fill-rule="evenodd" aria-hidden="true">
        <path
          d="M8 1 15.5 14.5H.5L8 1Zm0 4.1a.9.9 0 0 0-.9.98l.27 2.9a.63.63 0 0 0 1.26 0l.27-2.9A.9.9 0 0 0 8 5.1Zm0 5.3a.95.95 0 1 0 0 1.9.95.95 0 0 0 0-1.9Z"
        />
      </svg>
      <span class="dep-n">{dep.pending}</span>
    </span>
  {/if}
  {#if dep && dep.resolved > 0}
    <span class="dep-badge done" class:on-bar={onBar} title={dep.title}>
      <svg class="dep-icon stroked" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2.5 8.6 6.4 12.5 13.5 4.2" />
      </svg>
      <span class="dep-n">{dep.resolved}</span>
    </span>
  {/if}
{/snippet}

<div class="gantt-scroll" class:reordering={reorder.active} bind:this={scrollEl}>
  <div class="sidebar">
    <div class="sidebar-head"></div>
    <div class="sidebar-head-spacer"></div>
    <div class="sidebar-rows" class:reordering={reorder.active}>
      {#each visible as v, i (i)}
        {#if v.kind === 'phase'}
          {@const pct = phaseProgress(v.phase)}
          <div
            class="row-label"
            class:held={isHeld(v)}
            style:transform="translateY({rowY(v, i) - i * ROW_H}px)"
          >
            <button
              type="button"
              class="row-grip"
              onpointerdown={(ev) => startReorder(ev, v.phase, null)}
              title="reordenar fase"
              aria-label="reordenar fase">⠿</button
            >
            <button
              type="button"
              class="chev"
              class:expanded={v.phase.expanded}
              class:hidden={v.phase.children.length === 0}
              onclick={() => store.togglePhaseExpanded(v.phase.id)}
              aria-label={v.phase.expanded ? 'plegar fase' : 'desplegar fase'}>▸</button
            >
            <span class="dot" style:background={theme.slotColor(v.phase.colorSlot)}></span>
            <input
              class="rl-input"
              value={v.phase.name}
              oninput={(e) => store.renamePhase(v.phase.id, e.currentTarget.value)}
            />
            <!-- Beside the name, not on the rollup bar, which already carries the
                 blocked hatching. This is where the sense of progress lives, so
                 it is the number that gets to be read (D8).

                 The `{#key}` is load-bearing and looks redundant: rows are keyed
                 by index, so on switching roadmaps this same node would be handed
                 another phase and its tween would count *between two unrelated
                 phases* — worse than a jump. Keying on the phase id remounts it
                 and reseeds the tween at the right value (D4). -->
            {#if pct !== null}
              {#key v.phase.id}
                <PhaseProgress value={pct} />
              {/key}
            {/if}
            <button
              type="button"
              class="row-del"
              class:confirm={confirmDel === v.phase.id}
              onclick={() => delRow('phase', v.phase.id)}
              title="borrar fase">{confirmDel === v.phase.id ? 'borrar?' : '✕'}</button
            >
          </div>
        {:else if v.kind === 'item'}
          <!-- The grip stays on a completed item. Completion freezes the time
               axis, and a position in a list is not a date, so this row keeps
               its handle in the gutter while its bar gives up the one that
               moves dates (D9). -->
          <div
            class="row-label item"
            class:held={isHeld(v)}
            style:transform="translateY({rowY(v, i) - i * ROW_H}px)"
          >
            <button
              type="button"
              class="row-grip"
              onpointerdown={(ev) => startReorder(ev, v.phase, v.item)}
              title="reordenar item"
              aria-label="reordenar item">⠿</button
            >
            <span class="dot small" style:background={theme.slotColor(v.item.colorSlot)}></span>
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
          <div
            class="row-label add-actions"
            style:transform="translateY({rowY(v, i) - i * ROW_H}px)"
          >
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

    <div
      class="rows"
      class:reordering={reorder.active}
      style:width="{totalWidth}px"
      style:height="{totalHeight}px"
    >
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

      <!-- Hatch pattern for blocked milestones. It lives in its own zero-size svg
           rather than in the arrows one below, which only renders when there are
           arrows to draw — a blocked diamond must not depend on that. `color` is
           set per use to the bar ink of the slot, so `currentColor` picks up the
           right contrast on any palette and any theme (D6). -->
      <svg class="defs-only" width="0" height="0" aria-hidden="true">
        <defs>
          <pattern
            id="blockHatch"
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="2" height="4" fill="currentColor" opacity="0.34" />
          </pattern>
        </defs>
      </svg>

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
              <path d="M0,0 L6,3.5 L0,7 Z" fill="var(--accent)" />
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
          class:held={isHeld(v)}
          style:top="{rowY(v, i)}px"
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
            {@const blockedKids = countBlockedChildren(v.phase)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="bar rollup"
              class:blocked-soft={isPhaseBlocked(v.phase)}
              style:left="{g.left}px"
              style:width="{g.width}px"
              style:background={theme.slotColor(v.phase.colorSlot)}
              style:--bar-ink={theme.inkFor(v.phase.colorSlot)}
              title="{fmtDate(s)} → {fmtDate(e)} ({v.phase.children.length} items){blockedKids
                ? `\n⚠ ${blockedKids} item${blockedKids === 1 ? '' : 's'} con dependencias externas pendientes`
                : ''}"
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
              style:background={theme.slotColor(v.phase.colorSlot)}
              style:--bar-ink={theme.inkFor(v.phase.colorSlot)}
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
            {@const dep = blockerCounts(v.item)}
            <div
              class="milestone"
              style:left="{milestoneLeft(v.item.startDate)}px"
              ondblclick={() => ui.openDetail(v.phase.id, v.item.id)}
              role="presentation"
            >
              <svg
                class="m-diamond"
                class:frozen={isCompleted(v.item)}
                viewBox="0 0 24 24"
                onpointerdown={(ev) => {
                  if (!isCompleted(v.item)) startMilestoneMove(ev, v.phase, v.item);
                }}
                role="presentation"
              >
                <polygon
                  points="12,1.5 22.5,12 12,22.5 1.5,12"
                  fill={theme.slotColor(v.phase.colorSlot)}
                  stroke={theme.inkFor(v.phase.colorSlot)}
                  stroke-opacity="0.35"
                  stroke-width="1"
                />
                <!-- A diamond is SVG, not a div, so the striping is a pattern fill
                     laid over the slot color rather than the bars' CSS gradient.
                     Same ink, same look. -->
                {#if isItemBlocked(v.item)}
                  <polygon
                    points="12,1.5 22.5,12 12,22.5 1.5,12"
                    fill="url(#blockHatch)"
                    style:color={theme.inkFor(v.phase.colorSlot)}
                  />
                {/if}
                <!-- A diamond has no grip to give up, so the mark goes inside it.
                     Same path as the bars', scaled to the smaller box (D7). -->
                {#if isCompleted(v.item)}
                  <path
                    class="m-check"
                    d="M7.2 12.4 10.5 15.6 16.6 8.4"
                    stroke={theme.inkFor(v.phase.colorSlot)}
                  />
                {/if}
                <title
                  >{v.item.label} · {fmtDate(v.item.startDate)}{dep ? `\n${dep.title}` : ''}</title
                >
              </svg>
              <span class="m-label">{v.item.label}</span>
              {#if a}<span
                  class="assignee-badge item"
                  style:background={theme.slotColor(a.colorSlot)}
                  style:--bar-ink={theme.inkFor(a.colorSlot)}>{getInitials(a.name)}</span
                >{/if}
              {@render depBadges(dep, false)}
              {#if v.item.notes.trim()}<span class="notes-indicator" title="Con notas">●</span>{/if}
            </div>
          {:else if v.kind === 'item'}
            {@const g = barGeom(v.item.startDate, v.item.endDate)}
            {@const a = findAssignee(store.data.assignees, v.item.assigneeId)}
            {@const t = itemTarget(v.phase, v.item)}
            {@const dep = blockerCounts(v.item)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="bar item-bar"
              class:blocked={isItemBlocked(v.item)}
              style:left="{g.left}px"
              style:width="{g.width}px"
              style:background={theme.slotColor(v.phase.colorSlot)}
              style:--bar-ink={theme.inkFor(v.phase.colorSlot)}
              title="{v.item.label}&#10;{fmtDate(v.item.startDate)} → {fmtDate(v.item.endDate)}{dep
                ? `\n${dep.title}`
                : ''}"
              ondblclick={() => ui.openDetail(v.phase.id, v.item.id)}
            >
              <!-- The grip is what a completed item has no use for, so the check
                   takes its place rather than adding to a bar that already carries
                   label, badge, counters and two handles. Losing the grip is how
                   the freeze reads before you try to drag it (D7). -->
              {#if isCompleted(v.item)}
                {@render checkMark()}
                <span class="barlabel frozen">{v.item.label}</span>
              {:else}
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
              {/if}
              {#if a}<span
                  class="assignee-badge item"
                  style:background={theme.slotColor(a.colorSlot)}
                  style:--bar-ink={theme.inkFor(a.colorSlot)}>{getInitials(a.name)}</span
                >{/if}
              {@render depBadges(dep, true)}
              {#if v.item.notes.trim()}<span class="notes-indicator" title="Con notas">●</span>{/if}
              {#if !isCompleted(v.item)}
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
              {/if}
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
  /* The 18px of left padding beyond the old 10 is the gutter the grip sits in,
     positioned rather than in flow so that every row's handle lines up in one
     column whatever its indent. Both indented kinds grow by the same 18 so the
     dots stay in the relationship they had (D8). */
  .row-label {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    height: var(--row-h);
    padding: 0 10px 0 28px;
    border-bottom: 1px solid var(--line-weak);
    background: var(--surface);
  }
  /* The veil is translucent by design, so it is layered over the surface rather
     than replacing it: identical at rest, and opaque once the row is lifted over
     its neighbours. */
  .row-label.item {
    padding-left: 46px;
    background: linear-gradient(var(--veil), var(--veil)), var(--surface);
  }
  .row-label.add-actions {
    padding-left: 46px;
    gap: 6px;
  }
  /* Same reveal as .row-del: the space is always reserved and only the ink
     fades in, so nothing shifts when the pointer arrives. `touch-action` is the
     first in this file — without it the vertical gesture is swallowed by the
     scroll container before it ever reaches us. */
  .row-grip {
    position: absolute;
    left: 6px;
    top: 0;
    bottom: 0;
    width: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-dim);
    font-size: 11px;
    line-height: 1;
    opacity: 0;
    cursor: grab;
    touch-action: none;
  }
  .row-label:hover .row-grip,
  .row-label.held .row-grip {
    opacity: 1;
  }
  .row-grip:hover {
    color: var(--accent);
  }
  .row-grip:active {
    cursor: grabbing;
  }
  /* The held row: lifted out of the stack, translucent, and inert to hit-testing
     so the gesture keeps talking to the window listeners (D1). It is the real
     row, not a copy — the bar half of it carries a label, badges, counters and
     two handles that a clone would have to rebuild. */
  .row-label.held,
  .track.held {
    opacity: 0.8;
    z-index: 50;
    pointer-events: none;
  }
  .row-label.held {
    box-shadow: 0 6px 20px var(--shadow-strong);
  }
  /* Only while a gesture runs, so the one-shot re-render on drop does not
     animate rows into their settled places. The held row is exempt: it tracks
     the pointer and must not lag behind it. */
  .sidebar-rows.reordering .row-label,
  .rows.reordering .track {
    transition:
      transform 0.12s ease,
      top 0.12s ease;
  }
  .sidebar-rows.reordering .row-label.held,
  .rows.reordering .track.held {
    transition: none;
  }
  .gantt-scroll.reordering {
    user-select: none;
  }
  .add-btn {
    background: transparent;
    border: 1px dashed var(--line);
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
  }
  .add-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
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
    color: var(--text-mid);
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
    color: var(--text-dim);
    cursor: pointer;
    padding: 0 4px;
  }
  .row-label:hover .row-del {
    opacity: 1;
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
  .chev {
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
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
    color: var(--accent);
  }
  .dot {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    flex-shrink: 0;
    border: var(--line-width) solid var(--bar-border);
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
    background: var(--surface);
    border-bottom: 1px solid var(--line);
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
    color: var(--text-mid);
    border-left: 1px solid var(--line);
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  .month-label.year-start {
    color: var(--accent);
    font-weight: 700;
    border-left: 2px solid var(--accent);
    font-size: 13px;
    letter-spacing: 0.05em;
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
  .sprint-label.current {
    color: var(--accent);
    font-weight: 700;
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  .rows {
    position: relative;
  }
  .weekend-bg {
    position: absolute;
    top: 0;
    background: var(--weekend);
    border-left: var(--line-width) solid var(--weekend-line);
    border-right: var(--line-width) solid var(--weekend-line);
    z-index: 1;
    pointer-events: none;
  }
  .grid-line {
    position: absolute;
    top: 0;
    width: 1px;
    background: var(--line);
  }
  .grid-line.week {
    background: var(--line-weak);
    opacity: 0.55;
  }
  .grid-line.year {
    background: var(--accent);
    opacity: 0.35;
    width: 2px;
  }
  /* Above the sticky headers (4), not just the grid, because `.today-flag` below
     hangs above this element and would otherwise be painted over by the opaque
     month header. Still below the sticky sidebar (6), which has to keep covering
     the timeline as it scrolls past. */
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
    stroke: var(--accent);
    stroke-width: 1.6;
  }
  .track {
    position: absolute;
    left: 0;
    right: 0;
    height: var(--row-h);
    border-bottom: 1px solid var(--line-weak);
  }
  .track.item-track {
    background: var(--veil);
  }
  .track.add-track {
    background: var(--wash-accent);
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
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    opacity: 0.55;
    cursor: crosshair;
  }
  .ghost {
    position: absolute;
    top: 8px;
    height: 36px;
    border-radius: 6px;
    background: var(--tint-selected);
    border: 1px dashed var(--accent);
    z-index: 5;
    pointer-events: none;
  }
  .bar {
    position: absolute;
    top: 8px;
    height: 36px;
    border-radius: var(--bar-radius);
    display: flex;
    align-items: center;
    box-shadow: 0 1px 0 var(--shadow-medium) inset;
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

  /* Blocked striping.
     Drawn in `--bar-ink`, the per-bar ink already computed from the slot color,
     so it contrasts on any palette in any theme without a new theme token (D6).
     A pseudo-element under the bar's content, and click-through, so the grip,
     the label and the resize handles keep working exactly as before. */
  .bar.blocked::before,
  .bar.blocked-soft::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background: repeating-linear-gradient(45deg, var(--bar-ink) 0 2px, transparent 2px 6px);
  }
  .bar.blocked::before {
    opacity: 0.3;
  }
  /* The phase rollup is a derived signal, not a fact about the phase, so it
     stays quieter than the items it comes from (D5). */
  .bar.blocked-soft::before {
    opacity: 0.15;
  }
  .grip {
    width: 14px;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--bar-ink);
    opacity: 0.4;
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
    color: var(--bar-ink);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: grab;
  }
  /* Nothing on a completed bar offers to be dragged, cursor included: the
     freeze should be legible before it is discovered (D4). */
  .barlabel.frozen {
    cursor: default;
  }

  /* The completion mark, in the 14px the grip vacates. Slightly more present
     than the grip was (0.4) without becoming the loudest thing on the bar —
     done work reports, it does not announce (D7). */
  .done-mark {
    width: 14px;
    align-self: center;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .done-mark svg {
    width: 12px;
    height: 12px;
    fill: none;
    stroke: var(--bar-ink);
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.85;
  }
  .m-check {
    fill: none;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.85;
  }
  .bar-meta {
    font-size: 11px;
    color: var(--bar-ink);
    opacity: 0.55;
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
  /* Scoped to the diamond by class, not to every `svg` in the row: the badges
     alongside it are svg too, and `.milestone svg` outranked their own sizing —
     which is what blew them up to 30px and gave them the diamond's drop shadow
     and grab cursor. */
  .milestone .m-diamond {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    filter: drop-shadow(0 1px 2px var(--shadow-medium));
    cursor: grab;
  }
  .milestone .m-diamond:active {
    cursor: grabbing;
  }
  .milestone .m-diamond.frozen,
  .milestone .m-diamond.frozen:active {
    cursor: default;
  }
  .milestone .m-label {
    margin-left: 6px;
    font-size: 12px;
    color: var(--text);
    font-weight: 600;
    white-space: nowrap;
    background: var(--overlay-bg);
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
    color: var(--bar-ink);
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
    color: var(--text-dim);
    margin-left: 4px;
  }
  /* Counts, not names: an external dependency's name never fits on a short bar.
     The full list lives in the tooltip and in the drawer.

     Pending and resolved are two badges that can sit side by side, so each has
     to carry on its own. Sized to the assignee badge beside it rather than to
     the notes dot, and the icon is a drawn path — the typographic ⚠ and ✓ are
     hairline outlines that vanish at this size. */
  .dep-badge {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 7px;
    border-radius: 5px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;
    margin-left: 5px;
    background: var(--overlay-bg);
    cursor: help;
  }
  .dep-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    fill: currentColor;
  }
  /* The tick is a stroke, the warning triangle a filled path with the mark
     punched out by `fill-rule: evenodd` — set on the element so it applies to
     the fill above. */
  .dep-icon.stroked {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .dep-n {
    /* Tabular-ish: the badge must not jiggle as a count goes 9 → 10. */
    min-width: 7px;
    text-align: center;
  }
  .dep-badge.pending {
    color: var(--danger);
  }
  .dep-badge.done {
    color: var(--text-dim);
  }

  /* On a bar the plate would sit on an arbitrary palette color, so it is drawn
     from the bar's own ink at low alpha — the one color guaranteed to read
     against this bar, whatever the slot and whatever the theme. Off the bar (a
     milestone floats over the grid) the themed plate and colors apply. */
  .dep-badge.on-bar {
    background: none;
    color: var(--bar-ink);
  }
  .dep-badge.on-bar::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--bar-ink);
    opacity: 0.22;
  }
  /* The plate is a positioned pseudo-element, so it paints over plain in-flow
     content; both children are lifted above it. */
  .dep-badge.on-bar > * {
    position: relative;
  }
  /* Resolved keeps the count so a once-blocked item stays distinguishable from
     one that never was (D4), but it stops competing with what is still pending. */
  .dep-badge.on-bar.done {
    opacity: 0.72;
  }
  .dep-badge.on-bar.done::before {
    opacity: 0.12;
  }
  .defs-only {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
  }
</style>
