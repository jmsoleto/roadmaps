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

  let gantt = $state<Gantt | undefined>(undefined);
  let meta = $state<MetaView | undefined>(undefined);

  // Which view is on screen. Both the toolbar's "ir a hoy" and the markup below
  // need the answer, and they must not be able to disagree.
  const showMeta = $derived(store.metaView || !store.activeRoadmap);

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
  <!-- Both views mark today, so "ir a hoy" goes to whichever one is mounted.
       The two branches are exclusive, so only one reference is ever live. -->
  <Toolbar onToday={() => (showMeta ? meta : gantt)?.scrollToToday()} />
  <div class="gantt-wrapper">
    <!-- Falling back to "Todos" when there is no active roadmap keeps any
         degenerate state on the home, which now carries its own empty state. -->
    {#if showMeta}
      <MetaView bind:this={meta} />
    {:else}
      <Gantt bind:this={gantt} />
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
</style>
