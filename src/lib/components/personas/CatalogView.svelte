<script lang="ts">
  /**
   * The catalogue: roles and technologies, or locations and their holidays.
   *
   * Something in use is deactivated, never deleted, and the screen offers only
   * the action that will work: «borrar» appears only when nothing points at it.
   */
  import { personas, type Outcome } from '../../personas/store.svelte';
  import { personasUi, type CatalogTab } from '../../personas/ui.svelte';
  import { fmtDay, fmtWeekday } from '../../personas/format';
  import { festivosEnabled } from '../../personas/festivos-api';
  import MunicipalityImport from './MunicipalityImport.svelte';

  let { tab }: { tab: CatalogTab } = $props();

  let error = $state<string | null>(null);
  const report = (o: Outcome<unknown>): boolean => {
    error = o.ok ? null : o.error;
    return o.ok;
  };

  // ---- inline renaming, shared by every list ----

  let renamingId = $state<string | null>(null);
  let renameText = $state('');
  function startRename(id: string, current: string) {
    renamingId = id;
    renameText = current;
  }
  function finishRename(rename: (id: string, name: string) => Outcome<null>) {
    if (renamingId && report(rename(renamingId, renameText))) renamingId = null;
  }

  // ---- roles and technologies ----

  let newRole = $state('');
  let newFamily = $state('');
  let newTech = $state<Record<string, string>>({});
  const families = $derived(personas.data.technologies.filter((t) => t.parentId === null));
  const techsOf = (id: string) => personas.data.technologies.filter((t) => t.parentId === id);

  function addRole() {
    if (report(personas.addRole(newRole))) newRole = '';
  }
  function addFamily() {
    if (report(personas.addTechnology(newFamily, null))) newFamily = '';
  }
  function addTech(familyId: string) {
    if (report(personas.addTechnology(newTech[familyId] ?? '', familyId))) newTech[familyId] = '';
  }

  // ---- locations and holidays ----

  let newLocation = $state('');
  let openLocation = $state<string | null>(null);
  let hDate = $state('');
  let hName = $state('');
  let paste = $state('');
  let pasteNotice = $state<string | null>(null);

  const location = $derived(personas.location(openLocation));
  const years = $derived.by(() => {
    const byYear = new Map<string, number>();
    for (const h of location?.holidays ?? []) {
      byYear.set(h.date.slice(0, 4), (byYear.get(h.date.slice(0, 4)) ?? 0) + 1);
    }
    return [...byYear.entries()];
  });

  function addLocation() {
    const out = personas.addLocation(newLocation);
    if (report(out) && out.ok) {
      newLocation = '';
      openLocation = out.value.id;
    }
  }
  function addHoliday() {
    if (!openLocation) return;
    if (report(personas.addHoliday(openLocation, hDate, hName))) {
      hDate = '';
      hName = '';
    }
  }
  function pasteHolidays() {
    if (!openLocation) return;
    pasteNotice = personas.pasteHolidays(openLocation, paste);
    paste = '';
  }

  $effect(() => {
    if (openLocation === null && personas.data.locations.length > 0) {
      openLocation = personas.data.locations[0].id;
    }
  });
</script>

{#snippet item(
  id: string,
  name: string,
  active: boolean,
  inUse: boolean,
  rename: (id: string, name: string) => Outcome<null>,
  setActive: (id: string, active: boolean) => void,
  remove: (id: string) => Outcome<null>,
)}
  {#if renamingId === id}
    <!-- svelte-ignore a11y_autofocus -->
    <input
      autofocus
      bind:value={renameText}
      onkeydown={(e) => {
        if (e.key === 'Enter') finishRename(rename);
        if (e.key === 'Escape') renamingId = null;
      }}
      onblur={() => finishRename(rename)}
    />
  {:else}
    <span class:off={!active}>{name}</span>
    {#if !active}<span class="tag">inactivo</span>{/if}
    <span class="ops">
      <button class="link" onclick={() => startRename(id, name)}>renombrar</button>
      <button class="link" onclick={() => setActive(id, !active)}
        >{active ? 'inactivar' : 'reactivar'}</button
      >
      {#if !inUse}<button class="link danger" onclick={() => report(remove(id))}>borrar</button
        >{/if}
    </span>
  {/if}
{/snippet}

<header class="view-head">
  <h2>Catálogo</h2>
  <span class="sub">compartido por todos los equipos</span>
</header>
<div class="tabs" role="tablist">
  <button role="tab" aria-selected={tab === 'roles'} onclick={() => personasUi.openCatalog('roles')}
    >Roles y tecnologías</button
  >
  <button
    role="tab"
    aria-selected={tab === 'localidades'}
    onclick={() => personasUi.openCatalog('localidades')}>Localidades y festivos</button
  >
</div>

<div class="pane">
  {#if error}<p class="error">{error}</p>{/if}

  {#if tab === 'roles'}
    <div class="columns">
      <section>
        <h3>Roles</h3>
        <ul class="list">
          {#each personas.data.roles as r (r.id)}
            <li>
              {@render item(
                r.id,
                r.name,
                r.active,
                personas.roleInUse(r.id),
                (id, n) => personas.renameRole(id, n),
                (id, a) => personas.setRoleActive(id, a),
                (id) => personas.deleteRole(id),
              )}
            </li>
          {:else}
            <li class="hint">
              Sin roles todavía. Se usan para saber quién cubre qué (QA, Back, Front…).
            </li>
          {/each}
        </ul>
        <div class="add">
          <input
            placeholder="nuevo rol"
            bind:value={newRole}
            onkeydown={(e) => e.key === 'Enter' && addRole()}
          />
          <button class="btn" onclick={addRole}>añadir</button>
        </div>
      </section>

      <section>
        <h3>Tecnologías</h3>
        {#each families as f (f.id)}
          <div class="family">
            <div class="fam-head">
              {@render item(
                f.id,
                f.name,
                f.active,
                personas.technologyInUse(f.id),
                (id, n) => personas.renameTechnology(id, n),
                (id, a) => personas.setTechnologyActive(id, a),
                (id) => personas.deleteTechnology(id),
              )}
            </div>
            <ul class="list nested">
              {#each techsOf(f.id) as t (t.id)}
                <li>
                  {@render item(
                    t.id,
                    t.name,
                    t.active,
                    personas.technologyInUse(t.id),
                    (id, n) => personas.renameTechnology(id, n),
                    (id, a) => personas.setTechnologyActive(id, a),
                    (id) => personas.deleteTechnology(id),
                  )}
                </li>
              {/each}
            </ul>
            <div class="add nested">
              <input
                placeholder="nueva tecnología en {f.name}"
                bind:value={newTech[f.id]}
                onkeydown={(e) => e.key === 'Enter' && addTech(f.id)}
              />
              <button class="btn" onclick={() => addTech(f.id)}>añadir</button>
            </div>
          </div>
        {/each}
        <div class="add">
          <input
            placeholder="nueva familia"
            bind:value={newFamily}
            onkeydown={(e) => e.key === 'Enter' && addFamily()}
          />
          <button class="btn" onclick={addFamily}>añadir familia</button>
        </div>
      </section>
    </div>
  {:else}
    <div class="columns">
      <section>
        <h3>Localidades</h3>
        <ul class="list">
          {#each personas.data.locations as l (l.id)}
            <li class:selected={l.id === openLocation}>
              <button class="link pick" onclick={() => (openLocation = l.id)}
                >{l.holidays.length} festivos</button
              >
              {@render item(
                l.id,
                l.name,
                l.active,
                personas.locationInUse(l.id),
                (id, n) => personas.renameLocation(id, n),
                (id, a) => personas.setLocationActive(id, a),
                (id) => personas.deleteLocation(id),
              )}
            </li>
          {:else}
            <li class="hint">
              Sin localidades todavía. Cada persona tiene una, y de ella salen los festivos que le
              descuentan.
            </li>
          {/each}
        </ul>
        <div class="add">
          <input
            placeholder="nueva localidad"
            bind:value={newLocation}
            onkeydown={(e) => e.key === 'Enter' && addLocation()}
          />
          <button class="btn" onclick={addLocation}>añadir</button>
        </div>
      </section>

      {#if location}
        <section>
          <h3>Festivos de {location.name}</h3>
          {#if years.length > 0}
            <p class="sub">{years.map(([y, n]) => `${y}: ${n}`).join(' · ')}</p>
          {/if}
          {#if festivosEnabled}
            {#key location.id}<MunicipalityImport {location} />{/key}
          {/if}
          <div class="add">
            <input class="date" type="date" bind:value={hDate} aria-label="fecha del festivo" />
            <input
              placeholder="nombre"
              bind:value={hName}
              onkeydown={(e) => e.key === 'Enter' && addHoliday()}
            />
            <button class="btn" onclick={addHoliday}>añadir</button>
          </div>
          <label class="field"
            >Pegar una lista: una fecha y un nombre por línea (2026-12-08 Inmaculada,
            08/12/2026;Inmaculada…)
            <textarea bind:value={paste} placeholder={'2027-01-01 Año Nuevo\n06/01/2027 Reyes'}
            ></textarea>
          </label>
          <div>
            <button class="btn" disabled={paste.trim() === ''} onclick={pasteHolidays}
              >añadir los pegados</button
            >
          </div>
          {#if pasteNotice}<p class="notice">{pasteNotice}</p>{/if}
          <table>
            <tbody>
              {#each location.holidays as h (h.date)}
                <tr>
                  <td class="mono"
                    >{fmtWeekday(h.date).weekday} {fmtDay(h.date)} {h.date.slice(0, 4)}</td
                  >
                  <td>{h.name}</td>
                  <td class="r">
                    <button class="link" onclick={() => personas.removeHoliday(location.id, h.date)}
                      >quitar</button
                    >
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 28px;
    align-items: start;
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .list li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 0 8px;
    border-bottom: var(--line-width) solid var(--line-weak);
  }
  .list li.selected {
    background: var(--tint-accent);
  }
  .nested {
    margin-left: 18px;
  }
  .family {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fam-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    min-height: 32px;
    padding: 0 8px;
  }
  .ops {
    margin-left: auto;
    display: flex;
    gap: 10px;
    font-size: 12px;
    opacity: 0.75;
  }
  li:hover .ops,
  .fam-head:hover .ops {
    opacity: 1;
  }
  .off {
    color: var(--text-dim);
  }
  .add {
    display: flex;
    gap: 8px;
  }
  .add input:not(.date) {
    flex: 1;
  }
  .pick {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    min-width: 70px;
  }
  :global(.personas-app button.link.danger) {
    color: var(--danger);
  }
</style>
