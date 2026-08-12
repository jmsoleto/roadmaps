<script lang="ts">
  /**
   * Topbar breadcrumb + roadmap picker.
   *
   * Replaces the old tab strip: its width no longer depends on how many
   * roadmaps exist. Purely navigational — renaming and deleting live in the
   * "Todos" view, so a control that gets pressed dozens of times a day never
   * sits next to a destructive one.
   */
  import { store } from '../store/app.svelte';
  import { theme } from '../theme/theme.svelte';

  type Option =
    | { kind: 'all'; label: string; current: boolean }
    | { kind: 'roadmap'; id: string; label: string; slot: number; current: boolean };

  let open = $state(false);
  let query = $state('');
  let hi = $state(0);
  let filterEl = $state<HTMLInputElement | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);

  /**
   * Accent- and case-insensitive, so "diseno" finds "Diseño" and "plat" finds
   * "Plataforma".
   *
   * Deliberately NOT `nameKey()` from `util/roadmap-name`, which looks almost
   * the same: that one also strips spaces, because it decides whether two
   * roadmaps count as the same name. Here spaces have to survive so that
   * typing "plan q" still finds "Plan Q1".
   */
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  /** A roadmap's palette slot is its position in the list, as in the "Todos" view. */
  const activeSlot = $derived(store.data.roadmaps.findIndex((r) => r.id === store.data.activeId));

  const allOptions = $derived<Option[]>([
    { kind: 'all', label: 'Todos', current: store.metaView },
    ...store.data.roadmaps.map((rm, i): Option => ({
      kind: 'roadmap',
      id: rm.id,
      label: rm.name,
      slot: i,
      current: !store.metaView && rm.id === store.data.activeId,
    })),
  ]);

  const options = $derived(
    query.trim() === ''
      ? allOptions
      : allOptions.filter((o) => norm(o.label).includes(norm(query.trim()))),
  );

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
    query = '';
  }

  function choose(o: Option) {
    if (o.kind === 'all') store.toggleMetaView(true);
    else store.setActive(o.id);
    close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (options.length) hi = (hi + 1) % options.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (options.length) hi = (hi - 1 + options.length) % options.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = options[hi];
      if (o) choose(o);
    }
  }

  // On opening, focus the filter (so typing filters straight away) and start
  // the highlight on whatever is showing now.
  $effect(() => {
    if (!open) return;
    hi = Math.max(
      0,
      allOptions.findIndex((o) => o.current),
    );
    filterEl?.focus();
  });

  // Filtering shrinks the list under the highlight; keep it in range.
  $effect(() => {
    if (hi >= options.length) hi = 0;
  });

  // Keep the highlighted option visible: on opening (the current roadmap may be
  // far down the list) and while arrowing through it. Reading `hi` into a local
  // is what subscribes this effect to the highlight moving.
  $effect(() => {
    if (!open) return;
    const idx = hi;
    listEl?.querySelector<HTMLElement>(`#rs-opt-${idx}`)?.scrollIntoView({ block: 'nearest' });
  });

  // Close on any interaction outside the switcher. `pointerdown` in capture
  // rather than `blur`: in WebKit (Safari) buttons don't take focus when
  // clicked, so blur would never fire. Events born inside the switcher are
  // left alone, so pressing the trigger while open reaches its own handler and
  // closes instead of being closed here and reopened.
  $effect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-switcher]')) return;
      close();
    };
    window.addEventListener('pointerdown', outside, true);
    return () => window.removeEventListener('pointerdown', outside, true);
  });
</script>

<div class="switcher" data-switcher>
  {#if !store.metaView}
    <button type="button" class="crumb" onclick={() => store.toggleMetaView(true)}>Todos</button>
    <span class="sep" aria-hidden="true">▸</span>
  {/if}

  <button
    type="button"
    class="trigger"
    class:home={store.metaView}
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={toggle}
    title="cambiar de roadmap"
  >
    {#if store.metaView}
      <span class="glyph" aria-hidden="true">▦</span>
      <span class="label">Todos</span>
    {:else if store.activeRoadmap}
      <span class="dot" style:background={theme.slotColor(activeSlot)}></span>
      <span class="label">{store.activeRoadmap.name}</span>
    {:else}
      <span class="label dim">sin roadmap</span>
    {/if}
    <span class="caret" aria-hidden="true">▾</span>
  </button>

  {#if open}
    <div class="pop">
      <input
        bind:this={filterEl}
        bind:value={query}
        class="filter"
        type="text"
        placeholder="buscar roadmap…"
        aria-label="buscar roadmap"
        aria-controls="rs-list"
        aria-activedescendant={options.length ? `rs-opt-${hi}` : undefined}
        onkeydown={onKeydown}
      />
      <div class="options" id="rs-list" role="listbox" bind:this={listEl}>
        {#each options as o, i (o.kind === 'all' ? 'all' : o.id)}
          <button
            type="button"
            class="opt"
            class:hl={i === hi}
            class:current={o.current}
            id="rs-opt-{i}"
            role="option"
            aria-selected={o.current}
            onmousemove={() => (hi = i)}
            onclick={() => choose(o)}
          >
            {#if o.kind === 'all'}
              <span class="glyph" aria-hidden="true">▦</span>
            {:else}
              <span class="dot" style:background={theme.slotColor(o.slot)}></span>
            {/if}
            <span class="opt-label">{o.label}</span>
            {#if o.current}<span class="tick" aria-hidden="true">✓</span>{/if}
          </button>
        {/each}
        {#if options.length === 0}
          <div class="no-match">sin coincidencias</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .switcher {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
  .crumb {
    flex-shrink: 0;
    background: none;
    border: none;
    padding: 0 2px;
    font: inherit;
    color: var(--text-dim);
    cursor: pointer;
  }
  .crumb:hover {
    color: var(--accent);
  }
  .sep {
    flex-shrink: 0;
    color: var(--text-dim);
    opacity: 0.6;
  }
  .trigger {
    display: flex;
    align-items: center;
    gap: 7px;
    max-width: 260px;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .label.dim {
    color: var(--text-dim);
  }
  .caret {
    flex-shrink: 0;
    color: var(--text-dim);
    font-size: 10px;
  }
  .glyph {
    flex-shrink: 0;
    font-size: 11px;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
    border: var(--line-width) solid var(--bar-border);
  }
  /* Above the sticky sidebars of the Gantt and "Todos" views (z-index 6),
     below the drawer (49/50). */
  .pop {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 30;
    width: 280px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 8px 24px var(--shadow-strong);
    padding: 6px;
  }
  .filter {
    width: 100%;
    box-sizing: border-box;
    height: 30px;
    padding: 0 8px;
    margin-bottom: 6px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--surface-2);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    outline: none;
  }
  .filter:focus {
    border-color: var(--accent);
  }
  .options {
    max-height: 320px;
    overflow-y: auto;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 30px;
    padding: 0 8px;
    border: none;
    border-radius: 5px;
    background: none;
    color: var(--text-dim);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .opt.hl {
    background: var(--hover);
    color: var(--text);
  }
  .opt.current {
    color: var(--accent);
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
  .no-match {
    padding: 8px;
    color: var(--text-dim);
    font-size: 12px;
    opacity: 0.7;
  }
</style>
