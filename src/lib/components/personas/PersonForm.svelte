<script lang="ts">
  /**
   * Add or edit a person. Out-of-range values are refused with the store's own
   * sentence; someone already in a sprint can only be deactivated (RF-03).
   */
  import { personas } from '../../personas/store.svelte';
  import { personasUi } from '../../personas/ui.svelte';
  import { DEFAULT_DEDICATION, DEFAULT_HOURS, isInAnySprint } from '../../personas/model';
  import { fmtNumber, parseNumber } from '../../personas/format';

  const form = personasUi.personForm!;
  const existing = form.kind === 'edit' ? personas.person(form.personId) : null;

  let name = $state(existing?.name ?? '');
  let teamId = $state(existing?.teamId ?? (form.kind === 'new' ? form.teamId : ''));
  let roleId = $state(existing?.roleId ?? '');
  let technologyId = $state(existing?.technologyId ?? '');
  let locationId = $state(existing?.locationId ?? '');
  let hours = $state(fmtNumber(existing?.hoursPerDay ?? DEFAULT_HOURS));
  let dedication = $state(fmtNumber(existing?.dedication ?? DEFAULT_DEDICATION));
  let error = $state<string | null>(null);

  // Inactive entries are offered only to whoever already has them.
  const roles = $derived(personas.data.roles.filter((r) => r.active || r.id === existing?.roleId));
  const families = $derived(
    personas.data.technologies.filter(
      (t) => t.parentId === null && (t.active || t.id === existing?.technologyId),
    ),
  );
  const techsOf = (familyId: string) =>
    personas.data.technologies.filter(
      (t) => t.parentId === familyId && (t.active || t.id === existing?.technologyId),
    );
  const locations = $derived(
    personas.data.locations.filter((l) => l.active || l.id === existing?.locationId),
  );
  const teams = $derived(personas.data.teams.filter((t) => t.active || t.id === existing?.teamId));
  const inSprint = existing ? isInAnySprint(personas.data, existing.id) : false;

  function save() {
    const h = parseNumber(hours);
    const d = parseNumber(dedication);
    if (h === null) return void (error = 'Las horas por día deben ser un número.');
    if (d === null) return void (error = 'La dedicación debe ser un número.');
    const draft = {
      name,
      teamId,
      roleId: roleId || null,
      technologyId: technologyId || null,
      locationId: locationId || null,
      hoursPerDay: h,
      dedication: d,
    };
    const out = existing ? personas.updatePerson(existing.id, draft) : personas.addPerson(draft);
    if (!out.ok) return void (error = out.error);
    personasUi.personForm = null;
  }

  function remove() {
    if (!existing) return;
    const out = personas.deletePerson(existing.id);
    if (!out.ok) return void (error = out.error);
    personasUi.personForm = null;
  }

  const close = () => (personasUi.personForm = null);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<div class="scrim" role="presentation" onclick={(e) => e.target === e.currentTarget && close()}>
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-label={existing ? 'Editar persona' : 'Nueva persona'}
  >
    <h3>{existing ? existing.name : 'Nueva persona'}</h3>
    <!-- svelte-ignore a11y_autofocus -->
    <label class="field">Nombre <input autofocus bind:value={name} /></label>
    <div class="row">
      <label class="field"
        >Equipo
        <select bind:value={teamId}>
          {#each teams as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
        </select>
      </label>
      <label class="field"
        >Rol
        <select bind:value={roleId}>
          <option value="">—</option>
          {#each roles as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
        </select>
      </label>
      <label class="field"
        >Tecnología
        <select bind:value={technologyId}>
          <option value="">—</option>
          {#each families as f (f.id)}
            <optgroup label={f.name}>
              <option value={f.id}>{f.name} (familia)</option>
              {#each techsOf(f.id) as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
            </optgroup>
          {/each}
        </select>
      </label>
    </div>
    <div class="row">
      <label class="field"
        >Localidad
        <select bind:value={locationId}>
          <option value="">— sin festivos —</option>
          {#each locations as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
        </select>
      </label>
      <label class="field"
        >Horas por día <input class="num" inputmode="decimal" bind:value={hours} /></label
      >
      <label class="field"
        >Dedicación (%) <input class="num" inputmode="decimal" bind:value={dedication} /></label
      >
    </div>
    {#if roles.length === 0 || locations.length === 0}
      <p class="hint">
        {roles.length === 0 ? 'Aún no hay roles' : 'Aún no hay localidades'} en el catálogo: se pueden
        añadir después y asignar aquí.
      </p>
    {/if}
    {#if error}<p class="error">{error}</p>{/if}
    <footer>
      {#if existing}
        <button class="btn" onclick={() => personas.setPersonActive(existing.id, !existing.active)}
          >{existing.active ? 'inactivar' : 'reactivar'}</button
        >
        {#if !inSprint}<button class="btn danger" onclick={remove}>borrar</button>{/if}
      {/if}
      <span class="spacer"></span>
      <button class="btn" onclick={close}>cancelar</button>
      <button class="btn primary" onclick={save}>guardar</button>
    </footer>
    {#if existing && inSprint}
      <p class="hint">
        Está en algún sprint, así que no se borra: inactivarla la deja en esos sprints y la saca de
        los siguientes.
      </p>
    {/if}
  </div>
</div>
