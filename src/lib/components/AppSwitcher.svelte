<script lang="ts">
  /**
   * First level of the breadcrumb: which application is open.
   *
   * Same shape as `RoadmapSwitcher`, one level up — a trigger showing where you
   * are and a popover listing where you can go. No filter box here: the list is
   * a handful of applications, not a catalog that grows with use.
   *
   * Applications that are not live are listed but not selectable. Showing them
   * is the point — an announced app is information — but there is nowhere to go.
   */
  import { APPS, shortName } from '../hub/apps';
  import { location } from '../hub/location.svelte';
  import AppIcon from './AppIcon.svelte';

  let open = $state(false);

  const current = $derived(APPS.find((a) => a.id === location.appId) ?? null);

  function close() {
    open = false;
  }

  function chooseHub() {
    location.goHub();
    close();
  }

  function chooseApp(id: string, live: boolean) {
    // An announced app has no way in, so the entry is inert rather than absent.
    if (!live) return;
    location.goApp(id);
    close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  // Same reasoning as the roadmap switcher: `pointerdown` in capture, because
  // WebKit does not focus buttons on click and `blur` would never fire.
  $effect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-app-switcher]')) return;
      close();
    };
    window.addEventListener('pointerdown', outside, true);
    return () => window.removeEventListener('pointerdown', outside, true);
  });
</script>

<svelte:window on:keydown={onKeydown} />

<div class="switcher" data-app-switcher>
  <button
    type="button"
    class="trigger"
    class:home={location.inHub}
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open = !open)}
    title="cambiar de aplicación"
  >
    {#if current}
      <AppIcon identity={current.identity} size={18} />
      <span class="label">{shortName(current)}</span>
    {:else}
      <span class="glyph" aria-hidden="true">▦</span>
      <span class="label">Hub</span>
    {/if}
    <span class="caret" aria-hidden="true">▾</span>
  </button>

  {#if open}
    <div class="pop" role="listbox" aria-label="aplicaciones">
      <button
        type="button"
        class="opt"
        class:current={location.inHub}
        role="option"
        aria-selected={location.inHub}
        onclick={chooseHub}
      >
        <span class="glyph" aria-hidden="true">▦</span>
        <span class="opt-label">Hub</span>
        {#if location.inHub}<span class="tick" aria-hidden="true">✓</span>{/if}
      </button>

      <div class="rule" role="presentation"></div>

      {#each APPS as app (app.id)}
        {@const live = app.state === 'live'}
        {@const isCurrent = app.id === location.appId}
        <button
          type="button"
          class="opt"
          class:current={isCurrent}
          class:inert={!live}
          role="option"
          aria-selected={isCurrent}
          aria-disabled={!live}
          disabled={!live}
          onclick={() => chooseApp(app.id, live)}
        >
          <AppIcon identity={app.identity} size={18} muted={!live} />
          <span class="opt-label">{shortName(app)}</span>
          {#if isCurrent}
            <span class="tick" aria-hidden="true">✓</span>
          {:else if !live}
            <span class="soon">próximamente</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .switcher {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
  .trigger {
    display: flex;
    align-items: center;
    gap: 7px;
    height: 32px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
  .trigger:hover {
    border-color: var(--accent);
  }
  .trigger.home {
    color: var(--accent);
    border-color: var(--accent);
  }
  .label {
    white-space: nowrap;
  }
  .caret {
    flex-shrink: 0;
    color: var(--text-dim);
    font-size: 10px;
  }
  .glyph {
    flex-shrink: 0;
    font-size: 11px;
    width: 18px;
    text-align: center;
  }
  /* Above the sticky sidebars of the grid (z-index 6), below the drawer (49). */
  .pop {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 30;
    width: 240px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 8px 24px var(--shadow-strong);
    padding: 6px;
  }
  .rule {
    height: 1px;
    margin: 5px 2px;
    background: var(--line-weak);
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 34px;
    padding: 0 8px;
    border: none;
    border-radius: 5px;
    background: none;
    color: var(--text-dim);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .opt:hover:not(.inert) {
    background: var(--hover);
    color: var(--text);
  }
  .opt.current {
    color: var(--accent);
  }
  .opt.inert {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .opt-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tick {
    flex-shrink: 0;
    font-size: 11px;
  }
  .soon {
    flex-shrink: 0;
    font-size: 10px;
    letter-spacing: 0.06em;
    opacity: 0.75;
  }
</style>
