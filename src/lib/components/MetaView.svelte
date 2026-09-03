<script lang="ts">
  import { onMount } from 'svelte';
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import { usage } from '../hub/usage.svelte';
  import { ROADMAPS_ID } from '../hub/apps';
  import { ROW_H } from '../config';
  import { theme } from '../theme/theme.svelte';
  import { dayIndex, dayToX, fmtDate, todayIso } from '../time/timeline';
  import { getQuarterSegments } from '../time/segments';
  import { getMetaWindow, getRoadmapExtent, dropIndex, moveInArray } from '../model/derive';
  import { RowReorder } from '../interactions/reorder.svelte';
  import { onDrag } from '../interactions/drag';
  import { fitSidebarToWindow } from '../util/sidebar-width';
  import type { IsoDate } from '../model/types';

  let scrollEl = $state<HTMLDivElement | undefined>(undefined);

  /* El ancho de la columna, con su propia preferencia: "Todos" lista nombres de
     roadmap y un roadmap lista fases e items indentados, así que no tienen por
     qué querer el mismo sitio (D2). El límite de pintado es el mismo que allí y
     está explicado en el Gantt (D3). */
  let portW = $state(0);
  let resizing = $state(false);
  const sidebarW = $derived(fitSidebarToWindow(store.metaSidebarW, portW));

  const roadmaps = $derived(store.data.roadmaps);

  // Common meta timeline, stretched to always contain today — see `getMetaWindow`.
  const meta = $derived(getMetaWindow(roadmaps, todayIso()));
  const metaOrigin = $derived(meta.origin);
  const windowDays = $derived(meta.windowDays);
  const today = $derived(dayIndex(metaOrigin, todayIso()));

  const rows = $derived(
    roadmaps.map((rm, idx) => {
      const extent = getRoadmapExtent(rm);
      // The slot is the roadmap's own, not its position: reordering this list
      // must not repaint it, nor anything else in it.
      return { rm, idx, slot: rm.colorSlot, extent };
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

  function startSidebarResize(e: PointerEvent) {
    if (!scrollEl) return;
    const left = scrollEl.getBoundingClientRect().left;
    resizing = true;
    onDrag(e, {
      move: (ev) => store.setMetaSidebarW(ev.clientX - left, portW),
      up: () => {
        resizing = false;
        store.saveMetaSidebarW();
      },
    });
  }

  // Same 200px lead-in as the Gantt, and it needs no term for the sidebar even
  // though the sidebar now has no fixed width. The column is `sticky` but it is
  // in flow, so the grid starts at `sidebarW` and the width cancels itself out:
  // `sidebarW + today*dayW − (today*dayW − 200)` always lands today 200px clear
  // of the column, whatever it measures. Adding the width would double that
  // clearance, not preserve it (D6).
  export function scrollToToday() {
    if (scrollEl) scrollEl.scrollLeft = Math.max(0, today * store.dayW - 200);
  }

  // "Todos" is the app's landing view, and the question it answers is "how are
  // things going right now" — so entering it looks at today rather than at
  // whatever the calendar origin happens to be. The grid width comes from inline
  // styles, already applied by the time this runs, so the container is scrollable
  // without waiting for a tick.
  onMount(scrollToToday);

  /**
   * Open a roadmap, and note that it was opened.
   *
   * Both ways in from this view land here so the hub's "abiertos recientemente"
   * cannot miss one. The note lives outside `AppData` on purpose (D6).
   */
  function openRoadmap(id: string) {
    store.setActive(id);
    usage.touch(ROADMAPS_ID, id);
  }

  // ---- vertical reordering ----

  /**
   * The same gesture the Gantt uses, and the easy half of it (D5).
   *
   * Every row here is one roadmap and one row tall, so there is no block
   * arithmetic and nothing a roadmap can be contained by: `dropIndex` clamps at
   * the ends of the list, which is the only boundary there is.
   */
  const reorder = new RowReorder<number>();

  const preview = $derived(
    reorder.gesture === null
      ? roadmaps
      : moveInArray(roadmaps, reorder.gesture.from, reorder.gesture.to),
  );
  const previewIndex = $derived.by(() => {
    const m = new Map<string, number>();
    preview.forEach((rm, i) => m.set(rm.id, i));
    return m;
  });

  const rowY = (id: string, i: number) => reorder.y(id, previewIndex.get(id) ?? i);

  function startReorder(e: PointerEvent, id: string, from: number) {
    reorder.start(e, {
      key: id,
      payload: from,
      from,
      originY: from * ROW_H,
      minY: 0,
      maxY: (roadmaps.length - 1) * ROW_H,
      target: (dy) => dropIndex(from, dy, roadmaps.length),
      drop: (to) => store.moveRoadmap(id, to),
    });
  }

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
  // `pointerdown` rather than `blur`: in WebKit (Safari) buttons don't take
  // focus when clicked, so blur would never fire. Events born
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
    <button type="button" class="empty-cta" onclick={() => ui.openNewRoadmap()}
      >+ crear el primero</button
    >
  </div>
{:else}
  <div
    class="gantt-scroll"
    class:reordering={reorder.active || resizing}
    bind:this={scrollEl}
    bind:clientWidth={portW}
    style:--sidebar-w="{sidebarW}px"
  >
    <div class="sidebar">
      <button
        type="button"
        class="sidebar-resize"
        onpointerdown={startSidebarResize}
        title="ajustar ancho de la columna"
        aria-label="ajustar ancho de la columna"
      ></button>
      <div class="sidebar-head"></div>
      <div class="sidebar-head-spacer"></div>
      <div class="sidebar-rows" class:reordering={reorder.active}>
        {#each rows as r, i (r.rm.id)}
          <div
            class="row-label"
            class:held={reorder.held(r.rm.id)}
            style:transform="translateY({rowY(r.rm.id, i) - i * ROW_H}px)"
          >
            <button
              type="button"
              class="row-grip"
              onpointerdown={(ev) => startReorder(ev, r.rm.id, i)}
              title="reordenar roadmap"
              aria-label="reordenar {r.rm.name}">⠿</button
            >
            <span class="dot" style:background={theme.slotColor(r.slot)}></span>
            <input
              class="rl-input"
              value={r.rm.name}
              title={r.rm.name}
              oninput={(e) => store.renameRoadmap(r.rm.id, e.currentTarget.value)}
            />
            <!-- The bar in the grid opens the roadmap too, but a roadmap without
               dates has no bar; this button is what keeps it reachable. -->
            <button
              type="button"
              class="row-open"
              onclick={() => openRoadmap(r.rm.id)}
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

      <div
        class="rows"
        class:reordering={reorder.active}
        style:width="{totalWidth}px"
        style:height="{totalHeight}px"
      >
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
          <div class="track" class:held={reorder.held(r.rm.id)} style:top="{rowY(r.rm.id, i)}px">
            {#if r.extent}
              {@const g = geom(r.extent.start, r.extent.end)}
              <button
                type="button"
                class="bar"
                style:left="{g.left}px"
                style:width="{g.width}px"
                style:background={theme.slotColor(r.slot)}
                style:--bar-ink={theme.inkFor(r.slot)}
                onclick={() => openRoadmap(r.rm.id)}
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
  /* El mismo `align-items: flex-start` que el Gantt, y por la misma razón, que
     está explicada entera allí: sin él los dos hijos del flex reciben el alto
     visible del contenedor en vez del del contenido, y la columna se queda sin
     fondo, sin borde y sin cabecera en cuanto la lista pasa de una pantalla.

     Que haya que arreglarlo dos veces es la segunda razón concreta para extraer
     la columna a un componente compartido. No se hace aquí: son cuatro líneas
     de CSS frente a una reestructuración de las dos vistas, y el momento de
     partirla es cuando duela por sí sola (D1). */
  .gantt-scroll {
    display: flex;
    align-items: flex-start;
    overflow: auto;
    height: 100%;
  }
  .sidebar {
    position: sticky;
    left: 0;
    z-index: 6;
    /* El respaldo es lo que pinta el primer fotograma, mientras `init()` resuelve
       la preferencia (D5). */
    width: var(--sidebar-w, 250px);
    min-height: 100%;
    flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--line);
  }
  /* Mismo tirador que el del Gantt, con las mismas dos razones: la zona de
     agarre es más ancha que la línea, y sin `touch-action: none` el contenedor
     de scroll se come el gesto (D4). */
  .sidebar-resize {
    position: absolute;
    top: 0;
    bottom: 0;
    right: -4px;
    width: 9px;
    z-index: 7;
    padding: 0;
    border: none;
    background: transparent;
    cursor: col-resize;
    touch-action: none;
  }
  .sidebar-resize:hover,
  .sidebar-resize:active {
    background: var(--tint-accent);
  }
  /* Las dos bandas de la esquina son `sticky` por la misma razón, y con los
     mismos offsets, que `.month-header` y `.sprint-header`: son la mitad
     izquierda de una misma cabecera. Si solo se ancla la mitad de la rejilla, al
     bajar las filas de nombres se meten bajo la barra de herramientas mientras
     los meses siguen arriba, y la cabecera queda partida por la mitad.

     Antes no se notaba porque no podía: la columna medía una pantalla, así que
     nunca había scroll dentro de ella. Arreglado el estiramiento, esto es lo que
     completa la tercera cara del fallo (D8). */
  .sidebar-head {
    position: sticky;
    top: 0;
    z-index: 2;
    height: 38px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  .sidebar-head-spacer {
    position: sticky;
    top: 38px;
    z-index: 2;
    height: 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  /* The 18px of left padding beyond the old 10 is the gutter the grip sits in,
     positioned rather than in flow so the handles line up in one column — the
     same treatment the Gantt rows got. */
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
  /* Duplicated from Gantt.svelte, like the rest of the layout in this file.
     What was worth extracting was the state machine, not the style rules
     (D6). */
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
  .row-label.held,
  .track.held {
    opacity: 0.8;
    z-index: 50;
    pointer-events: none;
  }
  .row-label.held {
    box-shadow: 0 6px 20px var(--shadow-strong);
  }
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
    min-height: 100%;
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
