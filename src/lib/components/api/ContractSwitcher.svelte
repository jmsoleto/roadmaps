<script lang="ts">
  /**
   * API Hub's second breadcrumb level: which contract is open, and the picker
   * to change it.
   *
   * Built to the same shape as `RoadmapSwitcher`, and for the same reason its
   * comment gives: the width must not depend on how many contracts exist. It is
   * purely navigational — renaming and deleting live on the application's home,
   * so the control pressed dozens of times a day never sits next to a
   * destructive one.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { usage } from '../../hub/usage.svelte';
  import { API_ID } from '../../hub/apps';
  import { theme } from '../../theme/theme.svelte';

  type Option =
    | { kind: 'home'; label: string; current: boolean }
    | { kind: 'contract'; id: string; label: string; slot: number; current: boolean };

  let open = $state(false);
  let query = $state('');
  let hi = $state(0);
  let filterEl = $state<HTMLInputElement | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);

  /** Accent- and case-insensitive, so "catalogo" finds "Catálogo". */
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  const allOptions = $derived<Option[]>([
    { kind: 'home', label: 'Contratos', current: apiContracts.open === null },
    ...apiContracts.contracts.map((c): Option => ({
      kind: 'contract',
      id: c.id,
      label: c.title,
      slot: c.colorSlot,
      current: apiContracts.open?.id === c.id,
    })),
  ]);

  const options = $derived(
    query.trim() === ''
      ? allOptions
      : allOptions.filter((o) => norm(o.label).includes(norm(query.trim()))),
  );

  function close() {
    open = false;
    query = '';
  }

  function choose(o: Option) {
    if (o.kind === 'home') {
      apiContracts.setOpen(null);
    } else {
      apiContracts.setOpen(o.id);
      // The selector is one of the ways into a contract, so it feeds the hub's
      // recent list like the others.
      usage.touch(API_ID, o.id);
    }
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

  $effect(() => {
    if (!open) return;
    hi = Math.max(
      0,
      allOptions.findIndex((o) => o.current),
    );
    filterEl?.focus();
  });

  $effect(() => {
    if (hi >= options.length) hi = 0;
  });

  $effect(() => {
    if (!open) return;
    const idx = hi;
    listEl?.querySelector<HTMLElement>(`#cs-opt-${idx}`)?.scrollIntoView({ block: 'nearest' });
  });

  // Close on any interaction outside the switcher. `pointerdown` in capture
  // rather than `blur`: in WebKit buttons don't take focus when clicked, so
  // blur would never fire.
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
  {#if apiContracts.open}
    <button type="button" class="crumb" onclick={() => apiContracts.setOpen(null)}>Contratos</button
    >
    <span class="sep" aria-hidden="true">▸</span>
  {/if}

  <button
    type="button"
    class="trigger"
    class:home={apiContracts.open === null}
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open = !open)}
    title="cambiar de contrato"
  >
    {#if apiContracts.open}
      <span class="dot" style:background={theme.slotColor(apiContracts.open.colorSlot)}></span>
      <span class="label">{apiContracts.open.title}</span>
    {:else}
      <span class="glyph" aria-hidden="true">▦</span>
      <span class="label">Contratos</span>
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
        placeholder="buscar contrato…"
        aria-label="buscar contrato"
        aria-controls="cs-list"
        aria-activedescendant={options.length ? `cs-opt-${hi}` : undefined}
        onkeydown={onKeydown}
      />
      <div class="options" id="cs-list" role="listbox" bind:this={listEl}>
        {#each options as o, i (o.kind === 'home' ? 'home' : o.id)}
          <button
            type="button"
            class="opt"
            class:hl={i === hi}
            class:current={o.current}
            id="cs-opt-{i}"
            role="option"
            aria-selected={o.current}
            onmousemove={() => (hi = i)}
            onclick={() => choose(o)}
          >
            {#if o.kind === 'home'}
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
