<script lang="ts">
  /**
   * One team: its sprints, its people and their absences.
   *
   * Deleting is offered only when nothing depends on it; otherwise the action is
   * to deactivate, and the screen says why (RF-01, RF-03).
   */
  import { personas } from '../../personas/store.svelte';
  import { personasUi, type TeamTab } from '../../personas/ui.svelte';
  import { sprintsOf, peopleOf, technologyLabel, ABSENCE_LABEL } from '../../personas/model';
  import {
    fmtDay,
    fmtHours,
    fmtPercent,
    fmtRange,
    fmtNumber,
    parseNumber,
  } from '../../personas/format';
  import { readDate } from '../../personas/holidays';

  let { teamId, tab }: { teamId: string; tab: TeamTab } = $props();

  const team = $derived(personas.team(teamId));
  const sprints = $derived(team ? sprintsOf(personas.data, team.id) : []);
  const people = $derived(team ? peopleOf(personas.data, team.id) : []);
  const absences = $derived.by(() => {
    const ids = new Set(people.map((p) => p.id));
    return personas.data.absences
      .filter((a) => ids.has(a.personId))
      .sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0));
  });

  // ---- the team itself ----

  let renaming = $state(false);
  let name = $state('');
  let description = $state('');
  let headError = $state<string | null>(null);

  function startRename() {
    if (!team) return;
    name = team.name;
    description = team.description;
    renaming = true;
  }
  function saveRename() {
    const out = personas.updateTeam(teamId, { name, description });
    if (!out.ok) headError = out.error;
    else {
      headError = null;
      renaming = false;
    }
  }
  function remove() {
    const out = personas.deleteTeam(teamId);
    if (!out.ok) headError = out.error;
    else personasUi.home();
  }

  // ---- a new sprint ----

  let sName = $state('');
  let sStart = $state('');
  let sEnd = $state('');
  let sReserve = $state('');
  let sError = $state<string | null>(null);

  $effect(() => {
    if (personasUi.creatingSprint === teamId) {
      const d = personas.propose(teamId);
      sName = d.name;
      sStart = d.startDate;
      sEnd = d.endDate;
      sReserve = fmtNumber(d.incidentPercentage);
      sError = null;
    }
  });

  function createSprint() {
    const reserve = parseNumber(sReserve);
    if (reserve === null) {
      sError = 'La reserva de incidencias debe ser un número.';
      return;
    }
    const start = readDate(sStart);
    const end = readDate(sEnd);
    if (start === null || end === null) {
      sError = 'La fecha no es válida.';
      return;
    }
    const out = personas.addSprint({
      teamId,
      name: sName,
      startDate: start,
      endDate: end,
      incidentPercentage: reserve,
    });
    if (!out.ok) {
      sError = out.error;
      return;
    }
    personasUi.openSprint(out.value.id, 'resumen');
  }

  const setTab = (t: TeamTab) => personasUi.openTeam(teamId, t);
  const roleName = (id: string | null) => personas.role(id)?.name ?? '';
  const locationName = (id: string | null) => personas.location(id)?.name ?? '';
  const personName = (id: string) => personas.person(id)?.name ?? '';
</script>

{#if team}
  <header class="view-head">
    {#if renaming}
      <div class="form" style="width: 100%">
        <label class="field">Nombre <input bind:value={name} /></label>
        <label class="field" style="flex: 1">Descripción <input bind:value={description} /></label>
        <div class="actions">
          <button class="btn" onclick={() => (renaming = false)}>cancelar</button>
          <button class="btn primary" onclick={saveRename}>guardar</button>
        </div>
      </div>
    {:else}
      <h2>{team.name}</h2>
      {#if !team.active}<span class="tag">inactivo</span>{/if}
      <span class="sub">{team.description}</span>
      <div class="head-actions">
        <button class="btn" onclick={startRename}>editar</button>
        <button class="btn" onclick={() => personas.setTeamActive(teamId, !team.active)}
          >{team.active ? 'inactivar' : 'reactivar'}</button
        >
        {#if !personas.teamHasHistory(teamId)}
          <button class="btn danger" onclick={remove}>borrar</button>
        {/if}
      </div>
    {/if}
    {#if headError}<p class="error">{headError}</p>{/if}
  </header>

  <div class="tabs" role="tablist">
    <button role="tab" aria-selected={tab === 'sprints'} onclick={() => setTab('sprints')}
      >Sprints · {sprints.length}</button
    >
    <button role="tab" aria-selected={tab === 'personas'} onclick={() => setTab('personas')}
      >Personas · {people.filter((p) => p.active).length}</button
    >
    <button role="tab" aria-selected={tab === 'ausencias'} onclick={() => setTab('ausencias')}
      >Ausencias · {absences.length}</button
    >
  </div>

  <div class="pane">
    {#if tab === 'sprints'}
      {#if personasUi.creatingSprint === teamId}
        <div class="form">
          <label class="field">Nombre <input bind:value={sName} /></label>
          <label class="field">Inicio <input class="date" type="date" bind:value={sStart} /></label>
          <label class="field">Fin <input class="date" type="date" bind:value={sEnd} /></label>
          <label class="field"
            >Reserva de incidencias (%) <input
              class="num"
              inputmode="decimal"
              bind:value={sReserve}
            /></label
          >
          <div class="actions">
            <button class="btn" onclick={() => (personasUi.creatingSprint = null)}>cancelar</button>
            <button class="btn primary" onclick={createSprint}>crear el sprint</button>
          </div>
          {#if sError}<p class="error">{sError}</p>{/if}
          <p class="hint">
            Entran las {people.filter((p) => p.active).length} personas activas del equipo, con su dedicación
            por defecto. En el sprint se puede quitar a alguien o cambiar su dedicación solo para ese
            sprint.
          </p>
        </div>
      {:else if team.active}
        <div>
          <button class="btn primary" onclick={() => (personasUi.creatingSprint = teamId)}
            >+ nuevo sprint</button
          >
        </div>
      {/if}

      {#if sprints.length === 0}
        <p class="hint">
          Este equipo todavía no tiene sprints. Al crear uno se propone el siguiente número, el día
          laborable siguiente al anterior, dos semanas y la misma reserva de incidencias.
        </p>
      {:else}
        <table>
          <thead>
            <tr>
              <th>Sprint</th>
              <th>Fechas</th>
              <th class="r">Personas</th>
              <th class="r">Reserva</th>
              <th class="r">Disponible</th>
              <th class="r">Planificable</th>
            </tr>
          </thead>
          <tbody>
            {#each sprints as s (s.id)}
              {@const c = personas.capacityOf(s).team}
              <tr>
                <td
                  ><button class="link" onclick={() => personasUi.openSprint(s.id)}>{s.name}</button
                  ></td
                >
                <td class="mono">{fmtRange(s.startDate, s.endDate)}</td>
                <td class="r">{s.members.length}</td>
                <td class="r">{fmtPercent(s.incidentPercentage)}</td>
                <td class="r">{fmtHours(c.available)}</td>
                <td class="r"><strong>{fmtHours(c.planning)}</strong></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {:else if tab === 'personas'}
      <div>
        <button
          class="btn primary"
          onclick={() => (personasUi.personForm = { kind: 'new', teamId })}>+ persona</button
        >
      </div>
      {#if people.length === 0}
        <p class="hint">
          Da de alta a cada persona una sola vez: su rol, su tecnología, su localidad (de la que
          salen sus festivos), sus horas por día y su dedicación a este equipo.
        </p>
      {:else}
        <table>
          <thead>
            <tr>
              <th>Persona</th>
              <th>Rol</th>
              <th>Tecnología</th>
              <th>Localidad</th>
              <th class="r">h/día</th>
              <th class="r">Dedicación</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each people as p (p.id)}
              <tr class:inactive={!p.active}>
                <td>
                  <button
                    class="link"
                    onclick={() => (personasUi.personForm = { kind: 'edit', personId: p.id })}
                    >{p.name}</button
                  >
                  {#if !p.active}<span class="tag">inactiva</span>{/if}
                </td>
                <td>{roleName(p.roleId)}</td>
                <td>{technologyLabel(personas.data.technologies, p.technologyId)}</td>
                <td>{locationName(p.locationId)}</td>
                <td class="r">{fmtNumber(p.hoursPerDay)}</td>
                <td class="r">{fmtPercent(p.dedication)}</td>
                <td class="r">
                  <button
                    class="link"
                    onclick={() =>
                      (personasUi.absenceForm = { kind: 'new', personId: p.id, date: null })}
                    >+ ausencia</button
                  >
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {:else}
      <div>
        <button
          class="btn primary"
          disabled={people.length === 0}
          onclick={() => (personasUi.absenceForm = { kind: 'new', personId: null, date: null })}
          >+ ausencia</button
        >
      </div>
      {#if absences.length === 0}
        <p class="hint">
          Las vacaciones, bajas, permisos y formaciones que se conozcan. Descuentan sus días
          laborables en cualquier sprint que los incluya.
        </p>
      {:else}
        <table>
          <thead>
            <tr>
              <th>Persona</th>
              <th>Tipo</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th class="r">Horas</th>
              <th>Comentario</th>
            </tr>
          </thead>
          <tbody>
            {#each absences as a (a.id)}
              <tr>
                <td>
                  <button
                    class="link"
                    onclick={() => (personasUi.absenceForm = { kind: 'edit', absenceId: a.id })}
                    >{personName(a.personId)}</button
                  >
                </td>
                <td>{ABSENCE_LABEL[a.type]}</td>
                <td class="mono">{fmtDay(a.startDate)} {a.startDate.slice(0, 4)}</td>
                <td class="mono">{fmtDay(a.endDate)} {a.endDate.slice(0, 4)}</td>
                <td class="r"
                  >{a.hoursPerDay === null
                    ? 'día completo'
                    : `${fmtNumber(a.hoursPerDay)} h/día`}</td
                >
                <td>{a.comment}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {/if}
  </div>
{/if}
