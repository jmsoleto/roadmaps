<script lang="ts">
  /**
   * Personas Hub's screen: the teams and the catalogue on the left, whatever is
   * open on the right (personas-hub, D5).
   *
   * No loading state in the browser, as in Links Hub: the store is synchronous
   * there. Only a folder can make it wait, and then the screen says so.
   */
  import './personas.css';
  import { personas } from '../../personas/store.svelte';
  import { personasUi } from '../../personas/ui.svelte';
  import { PERSONAS_ID } from '../../hub/apps';
  import { unavailableActions } from '../../hub/folders';
  import StoreUnavailable from '../StoreUnavailable.svelte';
  import PersonasRail from './PersonasRail.svelte';
  import TeamView from './TeamView.svelte';
  import SprintView from './SprintView.svelte';
  import CatalogView from './CatalogView.svelte';
  import AbsenceForm from './AbsenceForm.svelte';
  import PersonForm from './PersonForm.svelte';

  let firstTeam = $state('');
  let error = $state<string | null>(null);

  function createFirstTeam() {
    const out = personas.addTeam(firstTeam);
    if (!out.ok) {
      error = out.error;
      return;
    }
    firstTeam = '';
    error = null;
    personasUi.openTeam(out.value.id, 'personas');
  }

  // Whatever is open may stop existing (a restore, a folder that changes):
  // go home instead of painting a hole.
  $effect(() => {
    void personas.data;
    personasUi.heal();
  });

  const view = $derived(personasUi.view);
  const noTeams = $derived(personas.data.teams.length === 0);
</script>

<div class="personas-app">
  {#if !personas.ready}
    <div class="loading">Abriendo los equipos…</div>
  {:else if personas.unavailable}
    <StoreUnavailable
      title="Personas Hub no está disponible"
      reason={personas.unavailable.reason}
      explain="No se muestra un Personas Hub vacío a propósito: podría haber equipos guardados que no se han podido leer, y escribir encima sería irreversible. El resto del hub sigue funcionando con normalidad."
      actions={unavailableActions(PERSONAS_ID, personas.unavailable.why, personas.source)}
    />
  {:else if noTeams && view.kind !== 'catalog'}
    <div class="empty">
      <h2>Todavía no hay ningún equipo</h2>
      <p class="hint">
        Un equipo reúne a las personas con las que se planifica cada sprint. Cada persona tiene su
        rol, su tecnología, su localidad (de la que salen sus festivos), sus horas por día y su
        dedicación. Con eso y sus ausencias, Personas Hub calcula cuántas horas tiene el sprint y de
        dónde sale cada una.
      </p>
      <div class="form">
        <label class="field"
          >Nombre del equipo
          <!-- svelte-ignore a11y_autofocus -->
          <input
            autofocus={personasUi.creatingTeam}
            bind:value={firstTeam}
            placeholder="Pagos"
            onkeydown={(e) => e.key === 'Enter' && createFirstTeam()}
          />
        </label>
        <div class="actions">
          <button class="btn primary" onclick={createFirstTeam}>crear el primer equipo</button>
        </div>
        {#if error}<p class="error">{error}</p>{/if}
      </div>
      <p class="hint">
        Los catálogos (roles, tecnologías, localidades y festivos) se pueden preparar antes o
        después: <button class="link" onclick={() => personasUi.openCatalog('localidades')}
          >ir al catálogo</button
        >.
      </p>
    </div>
  {:else}
    <PersonasRail />
    <section class="main">
      {#if view.kind === 'team'}
        {#key view.teamId}<TeamView teamId={view.teamId} tab={view.tab} />{/key}
      {:else if view.kind === 'sprint'}
        {#key view.sprintId}<SprintView sprintId={view.sprintId} tab={view.tab} />{/key}
      {:else if view.kind === 'catalog'}
        <CatalogView tab={view.tab} />
      {:else}
        <div class="empty">
          <p class="hint">Elige un equipo a la izquierda.</p>
        </div>
      {/if}
    </section>
  {/if}

  {#if personasUi.absenceForm !== null}
    <AbsenceForm />
  {/if}
  {#if personasUi.personForm !== null}
    <PersonForm />
  {/if}
</div>
