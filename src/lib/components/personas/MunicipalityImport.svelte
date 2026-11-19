<script lang="ts">
  /**
   * Link a location to a municipality and import its holidays from the public
   * calendar (personas-festivos-api, D7). Shown only when the build has the
   * proxy's address; otherwise the screen is as it was.
   */
  import { personas } from '../../personas/store.svelte';
  import {
    FESTIVOS_SITE,
    festivosClient,
    type FestivosResult,
    type MunicipalityOption,
    type Place,
  } from '../../personas/festivos-api';
  import type { Location } from '../../personas/model';

  let { location }: { location: Location } = $props();

  const client = festivosClient();
  const thisYear = new Date().getFullYear();
  const yearChoices = [thisYear, thisYear + 1];

  // ---- linking ----

  let linking = $state(false);
  let communities = $state<Place[] | null>(null);
  let provinces = $state<Place[] | null>(null);
  let municipalities = $state<MunicipalityOption[] | null>(null);
  let ccaa = $state('');
  let province = $state('');
  let muni = $state('');
  let loading = $state<string | null>(null);
  let failure = $state<string | null>(null);

  async function load<T>(what: string, run: () => Promise<FestivosResult<T>>): Promise<T | null> {
    loading = what;
    failure = null;
    const r = await run();
    loading = null;
    if (r.ok) return r.value;
    failure = `No se pudo cargar la lista de ${what}. Inténtalo más tarde.`;
    return null;
  }

  async function startLinking() {
    linking = true;
    ccaa = province = muni = '';
    provinces = municipalities = null;
    if (communities === null)
      communities = await load('comunidades', () => client.communities(thisYear));
  }
  async function pickCcaa() {
    province = muni = '';
    provinces = municipalities = null;
    if (ccaa !== '') provinces = await load('provincias', () => client.provinces(thisYear, ccaa));
  }
  async function pickProvince() {
    muni = '';
    municipalities = null;
    if (province !== '')
      municipalities = await load('municipios', () =>
        client.municipalities(thisYear, ccaa, province),
      );
  }
  function link() {
    const m = municipalities?.find((x) => x.slug === muni);
    const p = provinces?.find((x) => x.slug === province);
    const c = communities?.find((x) => x.slug === ccaa);
    if (!m || !p || !c) return;
    personas.setLocationMunicipality(location.id, {
      ccaa: c.slug,
      province: p.slug,
      slug: m.slug,
      ine: m.ine,
      name: m.name,
      provinceName: p.name,
      ccaaName: c.name,
    });
    linking = false;
    notice = null;
  }
  function unlink() {
    personas.setLocationMunicipality(location.id, null);
    notice = null;
  }

  // ---- importing ----

  let year = $state(thisYear);
  let importing = $state(false);
  let notice = $state<string | null>(null);

  async function importYear() {
    importing = true;
    notice = null;
    notice = (await personas.importHolidays(location.id, year, client)) || null;
    importing = false;
  }
</script>

<div class="import">
  {#if location.municipality && !linking}
    <p class="linked">
      Calendario de <strong>{location.municipality.name}</strong>
      <span class="where"
        >({location.municipality.provinceName}, {location.municipality.ccaaName})</span
      >
      <button class="link" onclick={startLinking}>cambiar</button>
      <button class="link" onclick={unlink}>quitar</button>
    </p>
    <div class="add">
      <select bind:value={year} aria-label="año a importar" disabled={importing}>
        {#each yearChoices as y (y)}<option value={y}>{y}</option>{/each}
      </select>
      <button class="btn" disabled={importing} onclick={importYear}
        >{importing ? 'importando…' : `Importar festivos ${year}`}</button
      >
    </div>
  {:else if linking}
    <div class="cascade">
      <select bind:value={ccaa} onchange={pickCcaa} aria-label="comunidad" disabled={!communities}>
        <option value="">comunidad…</option>
        {#each communities ?? [] as c (c.slug)}<option value={c.slug}>{c.name}</option>{/each}
      </select>
      <select
        bind:value={province}
        onchange={pickProvince}
        aria-label="provincia"
        disabled={!provinces}
      >
        <option value="">provincia…</option>
        {#each provinces ?? [] as p (p.slug)}<option value={p.slug}>{p.name}</option>{/each}
      </select>
      <select bind:value={muni} aria-label="municipio" disabled={!municipalities}>
        <option value="">municipio…</option>
        {#each municipalities ?? [] as m (m.slug)}<option value={m.slug}>{m.name}</option>{/each}
      </select>
      <div class="add">
        <button class="btn" disabled={muni === ''} onclick={link}>vincular</button>
        <button class="link" onclick={() => (linking = false)}>cancelar</button>
        {#if loading}<span class="hint">cargando {loading}…</span>{/if}
      </div>
    </div>
  {:else}
    <div>
      <button class="btn" onclick={startLinking}>Vincular a un municipio</button>
    </div>
  {/if}
  {#if failure}<p class="notice">{failure}</p>{/if}
  {#if notice}<p class="notice">{notice}</p>{/if}
  <p class="source">
    Datos de <a href={FESTIVOS_SITE} target="_blank" rel="noopener">calendariosnacionales.com</a>.
    Contrástalos con el boletín oficial.
  </p>
</div>

<style>
  .import {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 0;
    border-top: var(--line-width) solid var(--line-weak);
    border-bottom: var(--line-width) solid var(--line-weak);
  }
  .linked {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
  }
  .where {
    color: var(--text-dim);
  }
  .cascade {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .add {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .source {
    margin: 0;
    font-size: 11px;
    color: var(--text-dim);
  }
  .source a {
    color: inherit;
  }
</style>
