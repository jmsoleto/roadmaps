<script lang="ts">
  /**
   * Roadmaps' screen: what the shell paints when the application is entered.
   *
   * This used to be a branch of `App.svelte`. It moved out whole when the shell
   * stopped knowing any application by name (design decision D1): an app now
   * registers what it looks like, and this is what Roadmaps registers.
   *
   * It takes no props, like every screen in the registry. The toolbar's "ir a
   * hoy" needs a reference to whichever view is mounted, and that reference is
   * this component's business — which is exactly why it belongs here and not in
   * the shell.
   */
  import { store } from '../store/app.svelte';
  import Toolbar from './Toolbar.svelte';
  import Gantt from './Gantt.svelte';
  import MetaView from './MetaView.svelte';
  import StoreUnavailable from './StoreUnavailable.svelte';
  import { unavailableActions } from '../hub/folders';
  import { ROADMAPS_ID } from '../hub/apps';

  let gantt = $state<Gantt | undefined>(undefined);
  let meta = $state<MetaView | undefined>(undefined);

  // Which view is on screen. Both the toolbar's "ir a hoy" and the markup below
  // need the answer, and they must not be able to disagree.
  const showMeta = $derived(store.metaView || !store.activeRoadmap);
</script>

{#if !store.ready}
  <!-- Not "there is nothing": "we do not know yet". A folder can take a moment
       to answer, and an empty plan shown meanwhile reads as a deleted one. -->
  <div class="loading">Abriendo los roadmaps…</div>
{:else if store.unavailable}
  <!-- No toolbar either: everything on it creates or edits, and nothing may be
       written over data that could not be read. -->
  <StoreUnavailable
    title="Los roadmaps no están disponibles"
    reason={store.unavailable.reason}
    explain="No se muestra un plan vacío a propósito: podría haber roadmaps guardados que no se han podido leer, y escribir encima sería irreversible. El resto del hub sigue funcionando con normalidad."
    actions={unavailableActions(ROADMAPS_ID, store.unavailable.why, store.source)}
  />
{:else}
  <!-- Both views mark today, so "ir a hoy" goes to whichever one is mounted.
       The two branches are exclusive, so only one reference is ever live. -->
  <Toolbar onToday={() => (showMeta ? meta : gantt)?.scrollToToday()} />
  <div class="body">
    <!-- Falling back to "Todos" when there is no active roadmap keeps any
         degenerate state on the app's home, which carries its own empty state. -->
    {#if showMeta}
      <MetaView bind:this={meta} />
    {:else}
      <Gantt bind:this={gantt} />
    {/if}
  </div>
{/if}

<style>
  /* The shell hands every screen the same body: `flex: 1`, clipped, and a
     positioning context. Roadmaps splits it into its own toolbar and the view
     below, so the Gantt keeps exactly the parent it had when this markup lived
     in the shell. */
  .body {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
  /* The same as Decisions' and API Hub's opening line. */
  .loading {
    padding: 48px 16px;
    text-align: center;
    color: var(--text-dim);
    font-size: 13.5px;
  }
</style>
