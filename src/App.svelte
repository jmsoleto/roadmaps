<script lang="ts">
  import { onMount } from 'svelte';
  import { store } from './lib/store/app.svelte';
  import { apiContracts } from './lib/api/store.svelte';
  import { apiLibrary } from './lib/api/library.svelte';
  import { valueSources } from './lib/api/sources/store.svelte';
  import { location } from './lib/hub/location.svelte';
  import { hubApp } from './lib/hub/registry';
  import Topbar from './lib/components/Topbar.svelte';
  import Drawer from './lib/components/Drawer.svelte';
  import DragTooltip from './lib/components/DragTooltip.svelte';
  import NewRoadmapDialog from './lib/components/NewRoadmapDialog.svelte';
  import FolderDialog from './lib/components/FolderDialog.svelte';
  import HubLanding from './lib/components/HubLanding.svelte';
  import QuickCapture from './lib/components/decisions/QuickCapture.svelte';

  /**
   * The outer level: the hub, or one application's own screen.
   *
   * *Which* application is none of the shell's business (design decision D1).
   * It asks the registry what the active app looks like and paints that, so
   * adding, removing or renaming one never reaches this file. Anything that
   * fails to resolve falls back to the landing, which is the same degradation
   * `parseHash` already applies to a route it does not recognise.
   */
  const Screen = $derived(
    (location.appId !== null ? hubApp(location.appId)?.root : null) ?? HubLanding,
  );

  onMount(() => {
    // Flush the pending autosaves before the page goes away
    // (local-persistence).
    //
    // Roadmaps' `flush` runs synchronously up to its `localStorage.setItem`, so
    // that write lands inside this handler rather than racing the unload. The
    // IndexedDB stores cannot promise as much — the write is started here and
    // the browser is under no obligation to finish it — but starting it is
    // strictly better than letting the debounce swallow it.
    //
    // What none of this covers is the browser discarding the tab without
    // warning, where the event never fires at all.
    //
    // With Roadmaps in a folder, its write is asynchronous too, and it is the
    // user's shared plan. So the write is started and, if it is still running,
    // the browser is asked to confirm leaving: its own «¿Salir del sitio?»
    // keeps the page alive while the write finishes (carpeta-roadmaps, D9).
    // With nothing pending, closing asks nothing.
    const flush = (e: BeforeUnloadEvent) => {
      // Read before flushing: the flush itself starts a write, and asking after
      // it would ask every time, even with everything already on disk.
      const unwritten = store.source === 'folder' && store.pending;
      void store.flush();
      void apiContracts.flush();
      void apiLibrary.flush();
      void valueSources.flush();
      if (unwritten) {
        e.preventDefault();
        // Older engines read this instead of `preventDefault`.
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', flush);

    return () => window.removeEventListener('beforeunload', flush);
  });
</script>

<div class="app">
  <Topbar />
  <!-- The same body for every screen: it fills what the topbar leaves, clips
       its own overflow and provides a positioning context. What a screen does
       with it — Roadmaps splits it into a toolbar and a view — is its own. -->
  <div class="app-body">
    <Screen />
  </div>
  <Drawer />
  <!-- Mounted once here rather than at each trigger: the topbar button, the
       "Todos" empty-state call to action and the landing card all open the same
       dialog. They are not part of any application's branch, because there are
       no branches left — they are the shell's own overlays. -->
  <NewRoadmapDialog />
  <FolderDialog />
  <QuickCapture />
  <DragTooltip />
</div>

<style>
  .app-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }
</style>
