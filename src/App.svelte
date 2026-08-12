<script lang="ts">
  import { onMount } from 'svelte';
  import { store } from './lib/store/app.svelte';
  import Topbar from './lib/components/Topbar.svelte';
  import Toolbar from './lib/components/Toolbar.svelte';
  import Gantt from './lib/components/Gantt.svelte';
  import MetaView from './lib/components/MetaView.svelte';
  import Drawer from './lib/components/Drawer.svelte';
  import DragTooltip from './lib/components/DragTooltip.svelte';
  import NewRoadmapDialog from './lib/components/NewRoadmapDialog.svelte';

  let gantt = $state<Gantt | undefined>(undefined);
  let meta = $state<MetaView | undefined>(undefined);

  // Which view is on screen. Both the toolbar's "ir a hoy" and the markup below
  // need the answer, and they must not be able to disagree.
  const showMeta = $derived(store.metaView || !store.activeRoadmap);

  onMount(() => {
    // Flush the pending autosave before the page goes away (local-persistence).
    //
    // `flush` runs synchronously up to its `localStorage.setItem`, so the write
    // lands inside this handler rather than racing the unload. What this does
    // not cover is the browser discarding the tab without warning, where the
    // event never fires at all.
    const flush = () => void store.flush();
    window.addEventListener('beforeunload', flush);

    return () => window.removeEventListener('beforeunload', flush);
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
  <!-- Mounted once here rather than at each trigger: the topbar button and the
       "Todos" empty-state call to action open the same dialog. -->
  <NewRoadmapDialog />
  <DragTooltip />
</div>

<style>
  .gantt-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
</style>
