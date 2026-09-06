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
   * (D5). It is always armed, which is safe because `isTyping` stands in front
   * of it — and it is being always armed that lets the legend live on screen
   * instead of behind a key nobody presses.
   */
  import { links } from '../../links/store.svelte';
  import { linksUi } from '../../links/ui.svelte';
  import { usage } from '../../hub/usage.svelte';
  import { LINKS_ID } from '../../hub/apps';
  import { actionFor, isTyping } from '../../links/keyboard';
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
    const action = actionFor(event, isTyping(event.target));
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

      <div class="grid">
        {#each visible as link, i (link.id)}
          <LinkTile
            {link}
            index={i}
            focused={link.id === links.focusedLinkId}
            onopen={() => record(link)}
            oncustomize={() => linksUi.openEdit(link.id)}
            onfocus={() => links.setFocus(link.id)}
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
