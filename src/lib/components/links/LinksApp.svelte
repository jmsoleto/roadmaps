<script lang="ts">
  /**
   * Links Hub's screen: the areas on the left, their grid on the right.
   *
   * No loading state, and that is deliberate (D7). `localStorage` is
   * synchronous, so there is never a moment where we do not yet know what the
   * links are — which is the whole reason this application does not live in
   * IndexedDB like the other two. "Abriendo los enlaces…" in the middle of an
   * outage is precisely the second this thing exists to remove.
   *
   * The window-level key handler is what makes the keyboard the primary way in
   * (D5). It is always armed, which is safe because `ownsKey` stands in front
   * of it — and it is being always armed that lets the legend live on screen
   * instead of behind a key nobody presses.
   */
  import { links } from '../../links/store.svelte';
  import { linksUi } from '../../links/ui.svelte';
  import { usage } from '../../hub/usage.svelte';
  import { LINKS_ID } from '../../hub/apps';
  import { actionFor, ownsKey } from '../../links/keyboard';
  import { DragReorder } from '../../interactions/reorder.svelte';
  import { moveInArray } from '../../model/derive';
  import {
    cellRect,
    dropIndexInGrid,
    measureGrid,
    placeCells,
    type GridMetrics,
  } from '../../links/grid';
  import AreaRail from './AreaRail.svelte';
  import LinkTile from './LinkTile.svelte';
  import LinkForm from './LinkForm.svelte';
  import type { Link } from '../../links/model';

  let firstArea = $state('');

  function createFirstArea() {
    if (links.addArea(firstArea)) {
      firstArea = '';
      linksUi.closeCreateArea();
    }
  }

  const area = $derived(links.activeArea);
  const visible = $derived(links.visibleLinks);
  const wideCount = $derived(visible.reduce((n, l) => n + (l.wide ? 1 : 0), 0));

  // ---- reordering the grid ----

  /**
   * The gesture that orders the grid, on the same state machine as the rail and
   * the two views of Roadmaps — but without a pitch, because a grid has none
   * (D1). Where a tile rests depends on how many columns the window is showing
   * and on how many cells each tile takes, so its position comes from a
   * placement and not from arithmetic on its index.
   */
  const GAP = 14;
  const TILE_H = 104;

  let gridEl = $state<HTMLDivElement | null>(null);
  const reorder = new DragReorder<null>();
  /** Columns and track width, measured once when the gesture starts (D2). */
  let frame: { cols: number; metrics: GridMetrics } | null = null;

  const widths = $derived(visible.map((l) => (l.wide ? 2 : 1)));

  const previewOrder = $derived(
    reorder.gesture === null
      ? visible
      : moveInArray(visible, reorder.gesture.from, reorder.gesture.to),
  );

  const layout = $derived.by(() => {
    const f = frame;
    if (f === null || reorder.gesture === null) return null;
    const at = new Map<string, number>();
    previewOrder.forEach((l, i) => at.set(l.id, i));
    return {
      f,
      natural: placeCells(widths, f.cols),
      preview: placeCells(
        previewOrder.map((l) => (l.wide ? 2 : 1)),
        f.cols,
      ),
      at,
    };
  });

  /** How far from its own cell a tile is drawn: zero unless a gesture is on. */
  function offsetOf(link: Link, i: number): { x: number; y: number } {
    const l = layout;
    if (l === null) return { x: 0, y: 0 };
    const f = l.f;
    const nat = cellRect(l.natural[i], f.cols, f.metrics);

    const g = reorder.gesture;
    if (g !== null && g.key === link.id) {
      // Clamped to the grid, which is how "a link does not leave its area" gets
      // taught rather than announced (D9): drag towards the rail and the tile
      // stops at the edge while the pointer keeps going.
      const stepX = f.metrics.cellW + f.metrics.gap;
      const stepY = f.metrics.cellH + f.metrics.gap;
      const span = link.wide && f.cols > 1 ? 2 : 1;
      const last = l.natural[l.natural.length - 1] + (widths[widths.length - 1] - 1);
      return {
        x: Math.max(0, Math.min((f.cols - span) * stepX, nat.x + g.dx)) - nat.x,
        y: Math.max(0, Math.min(Math.floor(last / f.cols) * stepY, nat.y + g.dy)) - nat.y,
      };
    }

    const cell = cellRect(l.preview[l.at.get(link.id) ?? i], f.cols, f.metrics);
    return { x: cell.x - nat.x, y: cell.y - nat.y };
  }

  function startDrag(e: PointerEvent, link: Link, from: number) {
    if (gridEl === null) return;
    const f = measureGrid(gridEl, GAP, TILE_H);
    frame = f;
    // Snapshotted: the area cannot change under a gesture that lasts a second,
    // and reading the derived inside the callback would track it for nothing.
    const order = widths;
    reorder.start(e, {
      key: link.id,
      payload: null,
      from,
      target: (d) => dropIndexInGrid(from, d.x, d.y, order, f.cols, f.metrics),
      drop: (to) => moveTo(link, to),
    });
  }

  /**
   * Move a link, and leave it focused.
   *
   * Its number just changed, and the focus is what points at the thing that
   * moved — which is also what keeps the two nudge buttons on it, so the drag
   * and the keyboard way are one continuous thing.
   */
  function moveTo(link: Link, to: number) {
    links.moveLink(link.id, to);
    links.setFocus(link.id);
  }

  /**
   * Open a link the way the keyboard opens it.
   *
   * A click goes through the anchor's own navigation and only reports here; a
   * keypress has no anchor to go through, so it opens the window itself. Both
   * paths record the opening, which is what feeds the landing card.
   */
  function openByKey(link: Link) {
    window.open(link.url, '_blank', 'noopener,noreferrer');
    record(link);
  }

  function record(link: Link) {
    links.setFocus(link.id);
    usage.touch(LINKS_ID, link.id);
  }

  function onKeydown(event: KeyboardEvent) {
    // A form is a conversation of its own; the grid's shortcuts stay out of it.
    if (linksUi.editing !== null) return;
    const action = actionFor(event, ownsKey(event.target, event.key));
    if (action === null) return;

    switch (action.kind) {
      case 'area':
        links.stepArea(action.step);
        break;
      case 'focus':
        links.stepFocus(action.step);
        break;
      case 'open': {
        const link = visible[action.index];
        // A number with no link behind it does nothing, and moves nothing.
        if (!link) return;
        openByKey(link);
        break;
      }
      case 'openFocused': {
        const link = visible.find((l) => l.id === links.focusedLinkId);
        if (!link) return;
        openByKey(link);
        break;
      }
      case 'customize': {
        if (links.focusedLinkId === null) return;
        linksUi.openEdit(links.focusedLinkId);
        break;
      }
    }
    event.preventDefault();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if links.areas.length === 0}
  <div class="empty-app">
    <h2>Todavía no hay ningún área</h2>
    <p>
      Un área agrupa los paneles de un frente — Favoritos, Pedidos, Pagos. Los enlaces los pones tú:
      aquí no viene ninguno de fábrica.
    </p>
    {#if linksUi.creatingArea}
      <!-- The field lives here and not only in the rail: with no areas the rail
           is not on screen, so pointing at its input would open a form nobody
           can see. Both ways in — this button and the topbar's action — land
           here. -->
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="first"
        autofocus
        bind:value={firstArea}
        placeholder="nombre del área"
        onkeydown={(e) => {
          if (e.key === 'Enter') createFirstArea();
          if (e.key === 'Escape') linksUi.closeCreateArea();
        }}
      />
    {:else}
      <button type="button" class="primary" onclick={() => linksUi.openCreateArea()}
        >crear la primera área</button
      >
    {/if}
  </div>
{:else}
  <div class="screen">
    <AreaRail />

    <section class="main">
      <header>
        <h2>{area?.name ?? ''}</h2>
        <span class="sub">
          {visible.length}
          {visible.length === 1 ? 'enlace' : 'enlaces'}{wideCount > 0
            ? ' · los dobles son los que miro primero'
            : ''}
        </span>
      </header>

      <div class="grid" bind:this={gridEl}>
        {#each visible as link, i (link.id)}
          <LinkTile
            {link}
            index={i}
            count={visible.length}
            focused={link.id === links.focusedLinkId}
            held={reorder.held(link.id)}
            reordering={reorder.active}
            offset={offsetOf(link, i)}
            onopen={() => record(link)}
            oncustomize={() => linksUi.openEdit(link.id)}
            onfocus={() => links.setFocus(link.id)}
            ongrab={(e) => startDrag(e, link, i)}
            onmove={(to) => moveTo(link, to)}
          />
        {/each}

        <button type="button" class="add" onclick={() => linksUi.openCreate()}>
          <span class="plus">+</span> añadir enlace
        </button>
      </div>
    </section>
  </div>
{/if}

{#if linksUi.editing !== null}
  <LinkForm />
{/if}

<style>
  /* Not `.app`: `app.css` owns that class globally, as a column, and a screen
     that borrowed the name would silently be laid out top-to-bottom. */
  .screen {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    flex: 1;
    min-height: 0;
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: auto;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 14px;
    padding: 15px 24px;
    border-bottom: var(--line-width) solid var(--line-weak);
    background: var(--veil);
  }
  h2 {
    margin: 0;
    font-size: 21px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .sub {
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 11px;
    color: var(--text-dim);
  }
  .grid {
    padding: 20px 24px 28px;
    display: grid;
    /* Four columns at the mock's width, fewer as it narrows. `auto-fill` with a
       floor wide enough for a double keeps a wide tile from ever being asked to
       span more columns than exist. */
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
    align-content: start;
  }
  .add {
    box-sizing: border-box;
    height: 104px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border-radius: 10px;
    border: var(--line-width) dashed var(--line);
    background: none;
    color: var(--text-dim);
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 12px;
    cursor: pointer;
  }
  .add:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .plus {
    font-size: 20px;
    line-height: 1;
  }
  .empty-app {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 48px 24px;
    text-align: center;
  }
  .empty-app h2 {
    font-size: 19px;
  }
  .empty-app p {
    margin: 0;
    max-width: 46ch;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.6;
  }
  .first {
    margin-top: 6px;
    height: 34px;
    width: min(280px, 100%);
    padding: 0 10px;
    border-radius: 6px;
    border: var(--line-width) solid var(--line);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    text-align: center;
  }
  .first:focus-visible {
    outline: var(--focus-ring, 2px) solid var(--accent);
    outline-offset: 1px;
  }
  .primary {
    margin-top: 6px;
    height: 34px;
    padding: 0 16px;
    border-radius: 6px;
    border: var(--line-width) solid var(--accent);
    background: var(--accent);
    color: var(--ink-on-accent);
    cursor: pointer;
    font: inherit;
  }
</style>
