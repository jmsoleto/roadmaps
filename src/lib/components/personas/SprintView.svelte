<script lang="ts">
  /**
   * One sprint: the summary and its breakdown, its people, and the daily matrix.
   *
   * Everything on this screen is read from one `SprintCapacity`, computed by the
   * engine; no figure here is added up by the component (personas-hub, D4).
   */
  import { personas } from '../../personas/store.svelte';
  import { personasUi, type SprintTab } from '../../personas/ui.svelte';
  import {
    breakdown,
    IS_DISCOUNT,
    LINE_LABEL,
    lineValue,
    type Line,
  } from '../../personas/breakdown';
  import { ABSENCE_LABEL, ABSENCE_MARK, peopleOf, technologyLabel } from '../../personas/model';
  import {
    fmtDay,
    fmtDiscount,
    fmtHours,
    fmtNumber,
    fmtPercent,
    fmtRange,
    fmtWeekday,
    parseNumber,
  } from '../../personas/format';
  import { readDate } from '../../personas/holidays';
  import type { PersonDay } from '../../personas/capacity';

  let { sprintId, tab }: { sprintId: string; tab: SprintTab } = $props();

  const sprint = $derived(personas.sprint(sprintId));
  const team = $derived(sprint ? personas.team(sprint.teamId) : null);
  const c = $derived(sprint ? personas.capacityOf(sprint) : null);

  // ---- editing the sprint ----

  let editing = $state(false);
  let name = $state('');
  let start = $state('');
  let end = $state('');
  let reserve = $state('');
  let error = $state<string | null>(null);
  let confirmDelete = $state(false);

  function startEdit() {
    if (!sprint) return;
    name = sprint.name;
    start = sprint.startDate;
    end = sprint.endDate;
    reserve = fmtNumber(sprint.incidentPercentage);
    editing = true;
  }

  function saveEdit() {
    const pct = parseNumber(reserve);
    if (pct === null) return void (error = 'La reserva de incidencias debe ser un número.');
    const s = readDate(start);
    const e = readDate(end);
    if (s === null || e === null) return void (error = 'La fecha no es válida.');
    const out = personas.updateSprint(sprintId, {
      name,
      startDate: s,
      endDate: e,
      incidentPercentage: pct,
    });
    if (!out.ok) return void (error = out.error);
    error = null;
    editing = false;
  }

  function remove() {
    const teamId = sprint?.teamId;
    personas.deleteSprint(sprintId);
    if (teamId) personasUi.openTeam(teamId, 'sprints');
  }

  // ---- summary ----

  let opened = $state<Line | null>(null);
  const toggle = (line: Line) => (opened = opened === line ? null : line);
  const DISCOUNTS: Line[] = ['holiday', 'absence', 'dedication'];

  // ---- people ----

  const members = $derived(new Set(sprint?.members.map((m) => m.personId) ?? []));
  const outside = $derived(
    sprint
      ? peopleOf(personas.data, sprint.teamId).filter((p) => p.active && !members.has(p.id))
      : [],
  );
  let dedicationError = $state<string | null>(null);

  /**
   * A refused value is put back to what is saved, and the sentence names whose
   * it was: a box still showing «120» would read as if it had been accepted.
   */
  function setDedication(personId: string, input: HTMLInputElement) {
    const t = input.value.trim();
    const value = t === '' ? null : parseNumber(t);
    const out =
      t !== '' && value === null
        ? ({ ok: false, error: 'La dedicación debe ser un número.' } as const)
        : personas.setMemberDedication(sprintId, personId, value);
    if (out.ok) {
      dedicationError = null;
      return;
    }
    const saved = sprint?.members.find((m) => m.personId === personId)?.dedication;
    input.value = saved == null ? '' : fmtNumber(saved);
    dedicationError = `${personas.person(personId)?.name ?? ''}: ${out.error}`;
  }

  // ---- matrix ----

  function mark(d: PersonDay): string {
    if (d.cause === null) return '';
    if (d.cause.kind === 'festivo') return 'F';
    return ABSENCE_MARK[d.cause.type];
  }

  function cellTitle(d: PersonDay, person: string): string {
    const day = `${person} · ${fmtDay(d.date)}`;
    if (d.state === 'finde') return `${day}: fin de semana`;
    if (d.cause === null) return `${day}: disponible, ${fmtHours(d.net)}`;
    if (d.cause.kind === 'festivo') return `${day}: festivo, ${d.cause.name}`;
    const type = ABSENCE_LABEL[d.cause.type];
    const why = d.cause.comment ? ` (${d.cause.comment})` : '';
    return d.state === 'parcial'
      ? `${day}: ${type}${why}, quedan ${fmtHours(d.net)}`
      : `${day}: ${type}${why}`;
  }

  function onCell(d: PersonDay, personId: string) {
    if (d.state === 'finde' || d.state === 'festivo') return;
    if (d.cause?.kind === 'ausencia') {
      personasUi.absenceForm = { kind: 'edit', absenceId: d.cause.absenceId };
    } else {
      personasUi.absenceForm = { kind: 'new', personId, date: d.date };
    }
  }

  const setTab = (t: SprintTab) => personasUi.openSprint(sprintId, t);
</script>

{#if sprint && c}
  <header class="view-head">
    {#if editing}
      <div class="form" style="width: 100%">
        <label class="field">Nombre <input bind:value={name} /></label>
        <label class="field">Inicio <input class="date" type="date" bind:value={start} /></label>
        <label class="field">Fin <input class="date" type="date" bind:value={end} /></label>
        <label class="field"
          >Reserva de incidencias (%) <input
            class="num"
            inputmode="decimal"
            bind:value={reserve}
          /></label
        >
        <div class="actions">
          <button class="btn" onclick={() => (editing = false)}>cancelar</button>
          <button class="btn primary" onclick={saveEdit}>guardar</button>
        </div>
        {#if error}<p class="error">{error}</p>{/if}
      </div>
    {:else}
      <button class="link sub" onclick={() => team && personasUi.openTeam(team.id, 'sprints')}
        >{team?.name ?? ''} ›</button
      >
      <h2>{sprint.name}</h2>
      <span class="sub">{fmtRange(sprint.startDate, sprint.endDate)}</span>
      <span class="tag accent">en planificación</span>
      <div class="head-actions">
        <button class="btn" onclick={startEdit}>editar</button>
        {#if confirmDelete}
          <button class="btn danger" onclick={remove}>confirmar borrado</button>
          <button class="btn" onclick={() => (confirmDelete = false)}>no borrar</button>
        {:else}
          <button class="btn danger" onclick={() => (confirmDelete = true)}>borrar</button>
        {/if}
      </div>
    {/if}
  </header>

  <div class="tabs" role="tablist">
    <button role="tab" aria-selected={tab === 'resumen'} onclick={() => setTab('resumen')}
      >Resumen</button
    >
    <button role="tab" aria-selected={tab === 'personas'} onclick={() => setTab('personas')}
      >Personas · {c.people.length}</button
    >
    <button
      role="tab"
      aria-selected={tab === 'disponibilidad'}
      onclick={() => setTab('disponibilidad')}>Disponibilidad</button
    >
  </div>

  <div class="pane">
    {#if tab === 'resumen'}
      <div class="summary">
        {#snippet line(l: Line, label: string, cls = '')}
          <button class="line {cls}" aria-expanded={opened === l} onclick={() => toggle(l)}>
            <span class="caret" aria-hidden="true">{opened === l ? '▾' : '▸'}</span>
            <span class="label">{label}</span>
            <span class="value"
              >{IS_DISCOUNT[l] ? fmtDiscount(lineValue(c, l)) : fmtHours(lineValue(c, l))}</span
            >
          </button>
          {#if opened === l}
            {@const rows = breakdown(c, l)}
            <div class="detail">
              {#if rows.length === 0}
                <p class="hint">Nada que descontar.</p>
              {:else}
                <table>
                  <tbody>
                    {#each rows as r, i (i)}
                      <tr>
                        <td>{r.name}</td>
                        {#if r.date}
                          <td class="mono">{fmtWeekday(r.date).weekday} {fmtDay(r.date)}</td>
                          <td>{r.cause}</td>
                        {:else}
                          <td class="mono" colspan="2">{r.detail ?? ''}</td>
                        {/if}
                        <td class="r">{fmtHours(r.hours)}</td>
                      </tr>
                    {/each}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3">Total</td>
                      <td class="r"><strong>{fmtHours(lineValue(c, l))}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              {/if}
            </div>
          {/if}
        {/snippet}

        {@render line('theoretical', `${LINE_LABEL.theoretical} · ${c.people.length} personas`)}
        {#each DISCOUNTS as l (l)}{@render line(l, LINE_LABEL[l])}{/each}
        <hr />
        {@render line('available', LINE_LABEL.available, 'strong')}
        {@render line(
          'reserve',
          `${LINE_LABEL.reserve} · ${fmtPercent(c.team.incidentPercentage)}`,
        )}
        <hr class="double" />
        {@render line('planning', 'CAPACIDAD PLANIFICABLE', 'total')}
      </div>
      <p class="hint">
        Cada cifra se abre por persona, y los descuentos por fecha y causa. Mientras el sprint está
        en planificación, el cálculo sigue a las personas: cualquier ausencia o cambio de dedicación
        se refleja al momento.
      </p>
    {:else if tab === 'personas'}
      <table>
        <thead>
          <tr>
            <th>Persona</th>
            <th>Rol</th>
            <th>Tecnología</th>
            <th class="r">Por defecto</th>
            <th class="r">En este sprint (%)</th>
            <th class="r">Disponible</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each c.people as pc (pc.person.id)}
            {@const member = sprint.members.find((m) => m.personId === pc.person.id)}
            <tr class:inactive={!pc.person.active}>
              <td>
                {pc.person.name}
                {#if !pc.person.active}<span class="tag">inactiva</span>{/if}
              </td>
              <td>{personas.role(pc.person.roleId)?.name ?? ''}</td>
              <td>{technologyLabel(personas.data.technologies, pc.person.technologyId)}</td>
              <td class="r">{fmtPercent(pc.person.dedication)}</td>
              <td class="r">
                <input
                  class="num"
                  inputmode="decimal"
                  aria-label="dedicación de {pc.person.name} en este sprint"
                  placeholder={fmtNumber(pc.person.dedication)}
                  value={member?.dedication == null ? '' : fmtNumber(member.dedication)}
                  onchange={(e) => setDedication(pc.person.id, e.currentTarget)}
                />
              </td>
              <td class="r">{fmtHours(pc.totals.available)}</td>
              <td class="r">
                <button class="link" onclick={() => personas.removeMember(sprintId, pc.person.id)}
                  >quitar</button
                >
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if dedicationError}<p class="error">{dedicationError}</p>{/if}
      <p class="hint">
        Vacío, el sprint usa la dedicación por defecto de la persona. Lo que se escriba aquí vale
        solo para este sprint.
      </p>
      {#if outside.length > 0}
        <div class="form">
          <span class="sub">Del equipo, fuera de este sprint:</span>
          {#each outside as p (p.id)}
            <button class="btn" onclick={() => personas.addMember(sprintId, p.id)}
              >+ {p.name}</button
            >
          {/each}
        </div>
      {/if}
    {:else}
      <div class="matrix-wrap">
        <table class="matrix">
          <thead>
            <tr>
              <th class="who">Persona</th>
              {#each c.days as d (d.date)}
                {@const w = fmtWeekday(d.date)}
                <th class="day" class:weekend={d.weekend}>
                  {#if !d.weekend}<span class="wd">{w.weekday}</span><span class="dn">{w.day}</span
                    >{/if}
                </th>
              {/each}
              <th class="r">Netas</th>
              <th class="r">Disponible</th>
            </tr>
          </thead>
          <tbody>
            {#each c.people as pc (pc.person.id)}
              <tr>
                <td class="who">{pc.person.name}</td>
                {#each pc.days as d (d.date)}
                  {#if d.state === 'finde'}
                    <td class="cell weekend" aria-hidden="true"></td>
                  {:else}
                    <td class="cell {d.state}">
                      <button
                        title={cellTitle(d, pc.person.name)}
                        aria-label={cellTitle(d, pc.person.name)}
                        disabled={d.state === 'festivo'}
                        onclick={() => onCell(d, pc.person.id)}
                      >
                        {#if d.state === 'disponible'}
                          {fmtNumber(d.net)}
                        {:else if d.state === 'parcial'}
                          {fmtNumber(d.net)}<sup>{mark(d)}</sup>
                        {:else}
                          {mark(d)}
                        {/if}
                      </button>
                    </td>
                  {/if}
                {/each}
                <td class="r"
                  >{fmtNumber(pc.totals.theoretical - pc.totals.holiday - pc.totals.absence)}</td
                >
                <td class="r">{fmtHours(pc.totals.available)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="legend mono">
        número = horas del día antes de la dedicación · F festivo · V vacaciones · B baja médica · P
        permiso · Fo formación · A asuntos propios · O otra · número con marca = parcial
      </p>
      <p class="hint">Pulsa un día para registrar una ausencia, o una ausencia para cambiarla.</p>
    {/if}
  </div>
{/if}

<style>
  .summary {
    display: flex;
    flex-direction: column;
    max-width: 640px;
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
    padding: 8px 6px;
    background: var(--surface);
  }
  .line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: none;
    color: var(--text-mid);
    font: inherit;
    cursor: pointer;
    text-align: left;
  }
  .line:hover {
    background: var(--hover);
  }
  .caret {
    width: 10px;
    color: var(--text-dim);
    font-size: 10px;
  }
  .label {
    flex: 1;
  }
  .value {
    font-family: 'IBM Plex Mono', monospace;
    color: var(--text);
  }
  .line.strong .label,
  .line.strong .value {
    color: var(--text);
    font-weight: 600;
  }
  .line.total .label {
    color: var(--text);
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .line.total .value {
    color: var(--accent);
    font-size: 18px;
    font-weight: 600;
  }
  hr {
    border: none;
    border-top: var(--line-width) solid var(--line);
    margin: 4px 10px;
  }
  hr.double {
    border-top: 3px double var(--line);
  }
  .detail {
    margin: 0 10px 8px 28px;
    font-size: 12.5px;
  }
  .detail tfoot td {
    border-bottom: none;
    color: var(--text-dim);
  }

  .matrix-wrap {
    overflow-x: auto;
  }
  .matrix {
    width: auto;
    font-size: 12px;
  }
  .matrix th.who,
  .matrix td.who {
    position: sticky;
    left: 0;
    background: var(--bg);
    white-space: nowrap;
    padding-right: 14px;
    z-index: 1;
  }
  .matrix th.day {
    text-align: center;
    padding: 4px 2px;
    min-width: 38px;
    text-transform: none;
    letter-spacing: 0;
  }
  .matrix th.day .wd {
    display: block;
    font-size: 10px;
  }
  .matrix th.day .dn {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    color: var(--text-mid);
    font-size: 12px;
  }
  .matrix th.weekend,
  .matrix td.weekend {
    min-width: 8px;
    width: 8px;
    padding: 0;
    background: var(--weekend);
  }
  .matrix td.cell {
    padding: 2px;
    text-align: center;
  }
  .matrix td.cell button {
    width: 36px;
    height: 30px;
    border-radius: 5px;
    border: var(--line-width) solid var(--line-weak);
    background: var(--surface);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
  }
  .matrix td.cell button:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .matrix td.festivo button {
    background: var(--weekend);
    color: var(--text-dim);
    border-style: dashed;
    cursor: default;
  }
  .matrix td.ausencia button {
    background: var(--tint-danger);
    border-color: var(--danger);
    color: var(--danger);
    font-weight: 600;
  }
  .matrix td.parcial button {
    background: var(--tint-accent);
    border-color: var(--accent);
  }
  .matrix sup {
    font-size: 8.5px;
    margin-left: 1px;
    color: var(--accent);
  }
  .legend {
    margin: 0;
  }
</style>
