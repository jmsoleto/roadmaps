<script lang="ts">
  import { onMount } from 'svelte';
  import { store } from './lib/store/app.svelte';
  import { isTauri } from './lib/store/storage';
  import Topbar from './lib/components/Topbar.svelte';
  import Toolbar from './lib/components/Toolbar.svelte';
  import Gantt from './lib/components/Gantt.svelte';
  import MetaView from './lib/components/MetaView.svelte';
  import Drawer from './lib/components/Drawer.svelte';
  import DragTooltip from './lib/components/DragTooltip.svelte';

  let gantt: Gantt | undefined;

  onMount(() => {
    // Browser fallback: best-effort flush on unload.
    const flush = () => void store.flush();
    window.addEventListener('beforeunload', flush);

    // Tauri: flush pending autosave before the window actually closes (desktop-shell).
    let unlisten: (() => void) | undefined;
    if (isTauri()) {
      import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        unlisten = await win.onCloseRequested(async (event) => {
          event.preventDefault();
          await store.flush();
          await win.destroy();
        });
      });
    }

    return () => {
      window.removeEventListener('beforeunload', flush);
      unlisten?.();
    };
  });
</script>

<div class="app">
  <Topbar />
  {#if !store.metaView}
    <Toolbar onToday={() => gantt?.scrollToToday()} />
  {/if}
  <div class="gantt-wrapper">
    {#if store.metaView}
      <MetaView />
    {:else if store.activeRoadmap}
      <Gantt bind:this={gantt} />
    {:else}
      <div class="empty">no hay roadmaps</div>
    {/if}
  </div>
  <Drawer />
  <DragTooltip />
</div>

<style>
  .gantt-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
  .empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
</style>
