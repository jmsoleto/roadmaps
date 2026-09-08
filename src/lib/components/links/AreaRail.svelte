<script lang="ts">
  /**
   * The areas, and the keyboard legend under them.
   *
   * The legend stays on screen rather than hiding behind a `?` (D6). A shortcut
   * you have to remember in order to discover does not exist on the night it
   * would have helped, and the space under the list was empty anyway.
   *
   * Two ways to reorder, and both are meant. The grip is the fast one; the ↑↓
   * of the active row are the one that works without a mouse, which is a
   * requirement here and not a courtesy.
   */
  import { links } from '../../links/store.svelte';
  import { linksUi } from '../../links/ui.svelte';
  import { RowReorder } from '../../interactions/reorder.svelte';
  import { dropIndex, moveInArray } from '../../model/derive';

  /** Row height plus the rail's own gap: how far apart two areas sit. */
  const PITCH = 45;

  let newName = $state('');
  let newEl = $state<HTMLInputElement | null>(null);
  let renamevalue = $state('');

  const reorder = new RowReorder<null>(PITCH);

  const preview = $derived(
    reorder.gesture === null
      ? links.areas
      : moveInArray(links.areas, reorder.gesture.from, reorder.gesture.to),
  );

  const previewIndex = $derived.by(() => {
    const at = new Map<string, number>();
    preview.forEach((a, i) => at.set(a.id, i));
    return at;
  });

  const rowY = (id: string, i: number) => reorder.y(id, previewIndex.get(id) ?? i);

  /**
   * Start the gesture, having first put the rail back into even rows.
   *
   * Both modes that break the pitch are closed here rather than guarded
   * against (D9). A pending delete is a confirmation nobody confirmed and its
   * warning sits under its row; an open rename replaces a row with a field.
   * Neither can be left to close itself, because `onDrag` calls
   * `preventDefault()` on the pointerdown and that is exactly what stops the
   * field from ever losing the focus.
   */
  function startReorder(e: PointerEvent, id: string, from: number) {
    linksUi.cancelDeleteArea();
    if (linksUi.renamingArea !== null) commitRename(linksUi.renamingArea);
    reorder.start(e, {
      key: id,
      payload: null,
      from,
      originY: from * PITCH,
      minY: 0,
      maxY: (links.areas.length - 1) * PITCH,
      target: (dy) => dropIndex(from, dy, links.areas.length, PITCH),
      drop: (to) => links.moveArea(id, to),
    });
  }

  function create() {
    if (links.addArea(newName)) {
      newName = '';
      linksUi.closeCreateArea();
    }
  }

  function startRename(id: string, current: string) {
    renamevalueSet(current);
    linksUi.askRenameArea(id);
  }

  function renamevalueSet(v: string) {
    renamevalue = v;
  }

  function commitRename(id: string) {
    links.renameArea(id, renamevalue);
    linksUi.askRenameArea(null);
  }

  $effect(() => {
    if (linksUi.creatingArea) newEl?.focus();
  });
</script>

<nav class="rail" class:reordering={reorder.active} aria-label="Áreas">
  <div class="label">ÁREAS</div>

  {#each links.areas as area, i (area.id)}
    {@const active = area.id === links.activeAreaId}
    {#if linksUi.renamingArea === area.id}
      <input
        class="rename"
        value={renamevalue}
        oninput={(e) => renamevalueSet(e.currentTarget.value)}
        onblur={() => commitRename(area.id)}
        onkeydown={(e) => {
          if (e.key === 'Enter') commitRename(area.id);
          if (e.key === 'Escape') linksUi.askRenameArea(null);
        }}
      />
    {:else}
      <div
        class="row"
        class:active
        class:held={reorder.held(area.id)}
        style:transform="translateY({rowY(area.id, i) - i * PITCH}px)"
      >
        <!-- Not a tab stop: the ↑↓ below are the way in without a mouse, and a
             grip in the tab order would only be a stop where nothing happens. -->
        <button
          type="button"
          class="grip"
          tabindex={-1}
          title="mover el área"
          aria-label="mover el área {area.name}"
          onpointerdown={(e) => startReorder(e, area.id, i)}>⠿</button
        >
        <button type="button" class="area" onclick={() => links.setActiveArea(area.id)}>
          <span class="name">{area.name}</span>
          <span class="count">{links.countIn(area.id)}</span>
        </button>
        {#if active}
          {@const at = links.areas.findIndex((a) => a.id === area.id)}
          <button
            type="button"
            class="tiny"
            title="subir el área"
            disabled={at === 0}
            onclick={() => links.moveArea(area.id, at - 1)}>↑</button
          >
          <button
            type="button"
            class="tiny"
            title="bajar el área"
            disabled={at === links.areas.length - 1}
            onclick={() => links.moveArea(area.id, at + 1)}>↓</button
          >
          <button
            type="button"
            class="tiny"
            title="renombrar el área"
            onclick={() => startRename(area.id, area.name)}>✎</button
          >
          {#if linksUi.deletingArea === area.id}
            <button
              type="button"
              class="tiny danger"
              title="confirmar"
              onclick={() => {
                links.deleteArea(area.id);
                linksUi.cancelDeleteArea();
              }}>✓</button
            >
          {:else}
            <button
              type="button"
              class="tiny"
              title="eliminar el área"
              onclick={() => linksUi.askDeleteArea(area.id)}>✕</button
            >
          {/if}
        {/if}
      </div>
      {#if linksUi.deletingArea === area.id}
        <!-- The count is the whole point of the warning: what is about to be
             lost is the links, not the name. -->
        <p class="warn">
          {#if links.countIn(area.id) === 0}
            Se eliminará el área, que está vacía.
          {:else if links.countIn(area.id) === 1}
            Se eliminará el área y su enlace.
          {:else}
            Se eliminarán el área y sus {links.countIn(area.id)} enlaces.
          {/if}
          <button type="button" class="link" onclick={() => linksUi.cancelDeleteArea()}
            >cancelar</button
          >
        </p>
      {/if}
    {/if}
  {/each}

  {#if linksUi.creatingArea}
    <input
      bind:this={newEl}
      class="rename"
      bind:value={newName}
      placeholder="nombre del área"
      onkeydown={(e) => {
        if (e.key === 'Enter') create();
        if (e.key === 'Escape') linksUi.closeCreateArea();
      }}
      onblur={create}
    />
  {:else}
    <button type="button" class="add" onclick={() => linksUi.openCreateArea()}>+ nueva área</button>
  {/if}

  <div class="legend">
    ←→ cambia de área<br />
    1–9 abre ese enlace<br />
    ⏎ abre el enfocado<br />
    E personaliza el botón
  </div>
</nav>

<style>
  .rail {
    width: 220px;
    flex-shrink: 0;
    border-right: var(--line-width) solid var(--line-weak);
    padding: 18px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .label {
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 10.5px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    padding: 0 14px 8px;
  }
  .row {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: 8px;
    border: var(--line-width) solid transparent;
  }
  .row.active {
    background: var(--tint-accent);
    border-color: var(--accent);
  }
  /* The held row leaves the column; the rest slide under it. */
  .rail.reordering .row {
    transition: transform 120ms ease;
  }
  .rail.reordering .row.held {
    transition: none;
    z-index: 2;
    background: var(--surface);
    box-shadow: 0 6px 18px rgb(0 0 0 / 22%);
  }
  .grip {
    position: absolute;
    left: 2px;
    top: 0;
    bottom: 0;
    width: 14px;
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
  .row:hover .grip,
  .row.held .grip {
    opacity: 1;
  }
  .grip:hover {
    color: var(--text);
  }
  .grip:active {
    cursor: grabbing;
  }
  .area {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 14px 0 20px;
    background: none;
    border: none;
    color: var(--text-mid);
    cursor: pointer;
    font: inherit;
    text-align: left;
  }
  .row.active .area {
    color: var(--accent);
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
  }
  .count {
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 11px;
    color: var(--text-dim);
  }
  .tiny {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 4px 6px;
    font-size: 12px;
  }
  .tiny:hover:not(:disabled) {
    color: var(--text);
  }
  .tiny:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .tiny.danger:hover {
    color: var(--danger);
  }
  .warn {
    margin: 0 0 4px;
    padding: 8px 14px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--text-dim);
    background: var(--tint-danger);
    border-radius: 8px;
  }
  .link {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    text-decoration: underline;
  }
  .add,
  .rename {
    height: 40px;
    padding: 0 14px;
    border-radius: 8px;
    border: var(--line-width) dashed var(--line);
    background: none;
    color: var(--text-dim);
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 12px;
    cursor: pointer;
    text-align: left;
  }
  .rename {
    border-style: solid;
    color: var(--text);
    font-family: inherit;
    font-size: 14px;
  }
  .legend {
    margin-top: auto;
    padding: 16px 14px 0;
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.6;
  }
</style>
