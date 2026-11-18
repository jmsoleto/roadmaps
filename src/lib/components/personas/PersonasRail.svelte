<script lang="ts">
  /** The teams, active first, and the way into the catalogue. */
  import { personas } from '../../personas/store.svelte';
  import { personasUi } from '../../personas/ui.svelte';

  let creating = $state(false);
  let name = $state('');
  let error = $state<string | null>(null);

  const teams = $derived(
    [...personas.data.teams].sort((a, b) => Number(b.active) - Number(a.active)),
  );
  const openTeam = $derived(personasUi.teamId);
  const view = $derived(personasUi.view);

  function create() {
    const out = personas.addTeam(name);
    if (!out.ok) {
      error = out.error;
      return;
    }
    name = '';
    error = null;
    creating = false;
    personasUi.openTeam(out.value.id, 'personas');
  }

  $effect(() => {
    if (personasUi.creatingTeam) {
      creating = true;
      personasUi.creatingTeam = false;
    }
  });
</script>

<nav class="rail" aria-label="Equipos y catálogo">
  <div class="label">EQUIPOS</div>
  {#each teams as team (team.id)}
    <button
      class="row"
      class:active={openTeam === team.id}
      class:off={!team.active}
      onclick={() => personasUi.openTeam(team.id)}
    >
      <span class="name">{team.name}</span>
      {#if !team.active}<span class="tag">inactivo</span>{:else}
        <span class="count"
          >{personas.data.people.filter((p) => p.teamId === team.id && p.active).length}</span
        >{/if}
    </button>
  {/each}
  {#if creating}
    <!-- svelte-ignore a11y_autofocus -->
    <input
      class="new"
      autofocus
      bind:value={name}
      placeholder="nombre del equipo"
      onkeydown={(e) => {
        if (e.key === 'Enter') create();
        if (e.key === 'Escape') creating = false;
      }}
    />
    {#if error}<p class="error">{error}</p>{/if}
  {:else}
    <button class="add" onclick={() => (creating = true)}>+ equipo</button>
  {/if}

  <div class="label second">CATÁLOGO</div>
  <button
    class="row"
    class:active={view.kind === 'catalog' && view.tab === 'roles'}
    onclick={() => personasUi.openCatalog('roles')}
    ><span class="name">Roles y tecnologías</span></button
  >
  <button
    class="row"
    class:active={view.kind === 'catalog' && view.tab === 'localidades'}
    onclick={() => personasUi.openCatalog('localidades')}
    ><span class="name">Localidades y festivos</span></button
  >
</nav>

<style>
  .rail {
    width: 220px;
    flex-shrink: 0;
    border-right: var(--line-width) solid var(--line-weak);
    padding: 18px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: auto;
  }
  .label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    padding: 0 12px 6px;
  }
  .label.second {
    margin-top: 18px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 12px;
    border-radius: 8px;
    border: var(--line-width) solid transparent;
    background: none;
    color: var(--text-mid);
    cursor: pointer;
    font: inherit;
    text-align: left;
  }
  .row:hover {
    background: var(--hover);
  }
  .row.active {
    background: var(--tint-accent);
    border-color: var(--accent);
    color: var(--accent);
  }
  .row.off .name {
    color: var(--text-dim);
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
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .add {
    height: 32px;
    padding: 0 12px;
    background: none;
    border: var(--line-width) dashed var(--line);
    border-radius: 8px;
    color: var(--text-dim);
    cursor: pointer;
    font: inherit;
    text-align: left;
    margin-top: 4px;
  }
  .add:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .new {
    margin-top: 4px;
  }
</style>
