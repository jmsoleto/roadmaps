<script lang="ts">
  /**
   * The areas, and the keyboard legend under them.
   *
   * The legend stays on screen rather than hiding behind a `?` (D6). A shortcut
   * you have to remember in order to discover does not exist on the night it
   * would have helped, and the space under the list was empty anyway.
   */
  import { links } from '../../links/store.svelte';
  import { linksUi } from '../../links/ui.svelte';

  let newName = $state('');
  let newEl = $state<HTMLInputElement | null>(null);
  let renamevalue = $state('');

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

<nav class="rail" aria-label="Áreas">
  <div class="label">ÁREAS</div>

  {#each links.areas as area (area.id)}
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
      <div class="row" class:active>
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
    display: flex;
    align-items: center;
    border-radius: 8px;
    border: var(--line-width) solid transparent;
  }
  .row.active {
    background: var(--tint-accent);
    border-color: var(--accent);
  }
  .area {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 14px;
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
