<script lang="ts">
  /**
   * Record or edit an absence. Opened from a team's list, from a person's row,
   * or from a day of a sprint's matrix with the person and the day already set.
   */
  import { personas } from '../../personas/store.svelte';
  import { personasUi } from '../../personas/ui.svelte';
  import { ABSENCE_LABEL, ABSENCE_TYPES, peopleOf, type AbsenceType } from '../../personas/model';
  import { fmtNumber, parseNumber } from '../../personas/format';

  const form = personasUi.absenceForm!;
  const existing =
    form.kind === 'edit'
      ? (personas.data.absences.find((a) => a.id === form.absenceId) ?? null)
      : null;
  const firstPerson = existing?.personId ?? (form.kind === 'new' ? form.personId : null);
  const teamId = personas.person(firstPerson)?.teamId ?? personasUi.teamId;
  const people = teamId
    ? peopleOf(personas.data, teamId).filter((p) => p.active || p.id === firstPerson)
    : [];
  const day = form.kind === 'new' ? form.date : null;

  let personId = $state(firstPerson ?? people[0]?.id ?? '');
  let type = $state<AbsenceType>(existing?.type ?? 'vacaciones');
  let start = $state(existing?.startDate ?? day ?? '');
  let end = $state(existing?.endDate ?? day ?? '');
  let partial = $state(existing ? existing.hoursPerDay !== null : false);
  let hours = $state(existing?.hoursPerDay != null ? fmtNumber(existing.hoursPerDay) : '4');
  let comment = $state(existing?.comment ?? '');
  let error = $state<string | null>(null);

  function save() {
    let h: number | null = null;
    if (partial) {
      h = parseNumber(hours);
      if (h === null)
        return void (error = 'Las horas de una ausencia parcial deben ser un número.');
    }
    const draft = {
      personId,
      type,
      startDate: start,
      endDate: end || start,
      hoursPerDay: h,
      comment,
    };
    const out = existing ? personas.updateAbsence(existing.id, draft) : personas.addAbsence(draft);
    if (!out.ok) return void (error = out.error);
    personasUi.absenceForm = null;
  }

  function remove() {
    if (!existing) return;
    personas.deleteAbsence(existing.id);
    personasUi.absenceForm = null;
  }

  const close = () => (personasUi.absenceForm = null);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<div class="scrim" role="presentation" onclick={(e) => e.target === e.currentTarget && close()}>
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-label={existing ? 'Editar ausencia' : 'Nueva ausencia'}
  >
    <h3>{existing ? 'Ausencia' : 'Nueva ausencia'}</h3>
    <div class="row">
      <label class="field"
        >Persona
        <select bind:value={personId}>
          {#each people as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
        </select>
      </label>
      <label class="field"
        >Tipo
        <select bind:value={type}>
          {#each ABSENCE_TYPES as t (t)}<option value={t}>{ABSENCE_LABEL[t]}</option>{/each}
        </select>
      </label>
    </div>
    <div class="row">
      <label class="field">Desde <input class="date" type="date" bind:value={start} /></label>
      <label class="field">Hasta <input class="date" type="date" bind:value={end} /></label>
    </div>
    <div class="row">
      <label class="check"
        ><input type="checkbox" bind:checked={partial} /> solo unas horas cada día</label
      >
      {#if partial}
        <label class="field"
          >Horas por día <input class="num" inputmode="decimal" bind:value={hours} /></label
        >
      {/if}
    </div>
    <label class="field">Comentario (opcional) <input bind:value={comment} /></label>
    {#if type === 'baja' || comment.trim() !== ''}
      <p class="hint">
        Es un dato personal: si Personas Hub está conectado a una carpeta, viaja al repo.
      </p>
    {/if}
    {#if error}<p class="error">{error}</p>{/if}
    <footer>
      {#if existing}<button class="btn danger" onclick={remove}>borrar</button>{/if}
      <span class="spacer"></span>
      <button class="btn" onclick={close}>cancelar</button>
      <button class="btn primary" disabled={people.length === 0} onclick={save}>guardar</button>
    </footer>
  </div>
</div>
