<script lang="ts">
  /**
   * One vigilada: how each metric has evolved, and its releases on top.
   *
   * The application's own errors come first and apart from the client's, because
   * the two are read differently: the first should head for zero, the second
   * matters when it jumps. Traffic stays folded, since it explains the others and
   * is not itself a problem.
   */
  import {
    formatoInstante,
    formatoNumero,
    formatoVariacion,
    PERIODOS,
    puntos,
    puntosHora,
    rango,
  } from '../../health/chart';
  import { healthFuente } from '../../health/fuente/connection.svelte';
  import { tasaPorHora } from '../../health/fuente/rate';
  import type { ClaseMetrica, Metrica, Vigilada } from '../../health/model';
  import { health } from '../../health/store.svelte';
  import { healthUi } from '../../health/ui.svelte';
  import { textoCaptura } from '../../health/trends';
  import { fmtDate } from '../../time/timeline';
  import HourlyChart from './HourlyChart.svelte';
  import MetricChart from './MetricChart.svelte';
  import ReleaseComparison from './ReleaseComparison.svelte';
  import SaludBadge from './SaludBadge.svelte';

  interface Props {
    app: Vigilada;
  }

  let { app }: Props = $props();

  const filas = $derived(health.observacionesDe(app.id));
  const vinculo = $derived(health.vinculoDe(app.id));
  const zona = $derived(health.data.catalogo.zona);
  /** Why a linked vigilada shows only the folder's data, when it does. */
  const faltaFuente = $derived.by(() => {
    if (!app.fuente || vinculo) return null;
    const e = healthFuente.estado;
    if (e.kind === 'sin-fuente')
      return 'Está vinculada a la fuente, pero la fuente no está conectada.';
    if (e.kind === 'permiso') return 'Está vinculada a la fuente, pero falta reactivar su permiso.';
    if (e.kind === 'abriendo') return 'Abriendo la fuente…';
    if (e.kind === 'no-valida') return `La fuente no se puede leer: ${e.motivo}`;
    return health.sinDatosDeFuente(app.id);
  });
  const porHoras = $derived(
    healthUi.periodo === 'horas' && vinculo !== null && vinculo.hasta !== null,
  );
  const idPeticiones = $derived(health.metricas.find((m) => m.clase === 'peticiones')?.id ?? null);
  const conTasa = $derived(
    idPeticiones !== null && vinculo?.leida.series.has(idPeticiones) === true,
  );

  function puntosPorHora(m: Metrica) {
    if (!vinculo || vinculo.hasta === null) return [];
    const horas = vinculo.leida.series.get(m.id)?.serie.horas ?? new Map<number, number>();
    if (healthUi.verTasa && conTasa && m.clase !== 'peticiones') {
      const pet = vinculo.leida.series.get(idPeticiones!)!.serie.horas;
      return puntosHora(tasaPorHora(horas, pet), vinculo.hasta);
    }
    return puntosHora(horas, vinculo.hasta);
  }
  const salud = $derived(health.filas.find((f) => f.id === app.id)?.salud ?? null);

  const extremos = $derived.by(() => {
    let primero: string | null = null;
    let ultimo: string | null = null;
    for (const f of filas) {
      if (primero === null || f.dia < primero) primero = f.dia;
      if (ultimo === null || f.dia > ultimo) ultimo = f.dia;
    }
    // A release newer than the data must still have its place on the axis.
    for (const v of app.versiones) {
      if (ultimo !== null && v.dia > ultimo && v.dia <= health.hoy) ultimo = v.dia;
    }
    return { primero, ultimo };
  });

  const periodo = $derived(rango(healthUi.periodo, extremos.primero, extremos.ultimo));

  const GRUPOS: { clase: ClaseMetrica; titulo: string }[] = [
    { clase: 'propia', titulo: 'Errores propios' },
    { clase: 'cliente', titulo: 'Errores de cliente' },
  ];

  /**
   * A linked vigilada shows the metrics its source has, and any other only if
   * the folder holds data for it: MYA measures no 404s, and an empty chart per
   * metric it will never have would only be noise.
   */
  const visible = (m: Metrica) =>
    !vinculo || vinculo.leida.series.has(m.id) || filas.some((f) => f.metrica === m.id);
  const deClase = (clase: ClaseMetrica) =>
    health.metricas.filter((m) => m.clase === clase && visible(m));

  const seleccionada = $derived(app.versiones.find((v) => v.id === healthUi.versionSel) ?? null);
  const versionesOrdenadas = $derived(
    [...app.versiones].sort((a, b) => (a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : 0)),
  );

  function seleccionar(id: string) {
    healthUi.versionSel = healthUi.versionSel === id ? null : id;
  }

  const puntosDe = (m: Metrica) =>
    periodo ? puntos(filas, m.id, periodo.desde, periodo.hasta) : [];
</script>

{#snippet bloqueMetrica(m: Metrica)}
  {@const t = salud?.tendencias[m.id]}
  {@const consulta = health.consultaDe(app.id, m.id)}
  {@const tasa = porHoras && healthUi.verTasa && conTasa && m.clase !== 'peticiones'}
  <article class="metrica">
    <header>
      <h4>{m.nombre}</h4>
      {#if t && t.estado !== 'sin-datos' && t.recuento !== null}
        <span class="dato">{formatoNumero(t.recuento)} en 7 días</span>
        <span class="dato variacion" class:sube={t.estado === 'sube' && m.clase !== 'peticiones'}>
          {formatoVariacion(t.variacion, t.estado === 'sube')}{t.base === 'tasa' &&
          t.variacion !== null
            ? ' tasa'
            : ''}{t.estimado ? ' ≈' : ''}
        </span>
      {/if}
      {#if consulta?.deFuente}
        <span class="link consulta fija" title="la consulta la da la fuente y no se edita aquí">
          consulta de la fuente
        </span>
      {:else}
        <button
          type="button"
          class="link consulta"
          onclick={() => healthUi.abrir({ kind: 'consulta', appId: app.id, metrica: m.id })}
        >
          {consulta ? 'editar consulta' : '+ consulta'}
        </button>
      {/if}
    </header>
    {#if consulta}<code class="texto-consulta">{consulta.texto}</code>{/if}
    {#if porHoras}
      <HourlyChart
        titulo={tasa ? `Tasa de ${m.nombre}` : m.nombre}
        puntos={puntosPorHora(m)}
        modo={tasa ? 'tasa' : 'recuento'}
        {zona}
        versiones={app.versiones}
      />
    {:else}
      <MetricChart
        titulo={m.nombre}
        puntos={puntosDe(m)}
        versiones={app.versiones}
        seleccionada={healthUi.versionSel}
        onseleccion={seleccionar}
      />
    {/if}
  </article>
{/snippet}

<div class="head">
  <h2>{app.nombre}</h2>
  {#if salud}<SaludBadge estado={salud.estado} />{/if}
  {#if salud && salud.motivo.length > 0}<span class="motivo">{salud.motivo.join(', ')}</span>{/if}
  {#if vinculo?.hasta}
    <span class="captura">datos hasta {formatoInstante(vinculo.hasta, zona)}</span>
  {/if}
  {#if salud?.captura}
    <span
      class="captura"
      class:warn={salud.captura.tono === 'warn'}
      class:danger={salud.captura.tono === 'danger'}
    >
      captura: {textoCaptura(salud.captura)}
    </span>
  {/if}
  <div class="acciones">
    <button
      type="button"
      class="link"
      onclick={() => healthUi.abrir({ kind: 'fuente', id: app.id })}
    >
      fuente y nota
    </button>
    <button
      type="button"
      class="link"
      onclick={() => healthUi.abrir({ kind: 'renombrar', id: app.id })}
    >
      renombrar
    </button>
    <button
      type="button"
      class="link"
      onclick={() => healthUi.abrir({ kind: 'eliminar', id: app.id })}
    >
      eliminar
    </button>
  </div>
</div>

{#if app.nota}
  <p class="nota-app"><span class="nota-titulo">Nota</span> {app.nota}</p>
{/if}
{#if faltaFuente}
  <p class="aviso-fuente" role="status">
    {faltaFuente}
    {#if healthFuente.estado.kind === 'sin-fuente'}
      <button type="button" class="link" onclick={() => void healthFuente.elegir()}>
        conectar la fuente…
      </button>
    {:else if healthFuente.estado.kind === 'permiso'}
      <button type="button" class="link" onclick={() => void healthFuente.reactivar()}>
        reactivar el acceso
      </button>
    {/if}
  </p>
{/if}
{#if vinculo && vinculo.avisos.length > 0}
  <details class="avisos-fuente">
    <summary>
      {vinculo.avisos.length === 1 ? '1 aviso' : `${vinculo.avisos.length} avisos`} al leer la fuente
    </summary>
    <ul>
      {#each vinculo.avisos as a (a)}<li>{a}</li>{/each}
    </ul>
  </details>
{/if}

{#if filas.length === 0 && !vinculo}
  <div class="vacio">
    <p>
      Aún no hay datos de {app.nombre}. Cuando un agente deje una captura en la bandeja de la
      carpeta, usa el identificador <code>{app.id}</code> en sus filas y pulsa «↻ recargar».
    </p>
  </div>
{:else}
  <div class="controles">
    <div class="periodos" role="group" aria-label="Periodo">
      {#each PERIODOS as p (p.id)}
        <button
          type="button"
          class="periodo"
          class:activo={healthUi.periodo === p.id}
          aria-pressed={healthUi.periodo === p.id}
          onclick={() => (healthUi.periodo = p.id)}
        >
          {p.label}
        </button>
      {/each}
      {#if vinculo?.hasta}
        <button
          type="button"
          class="periodo"
          class:activo={healthUi.periodo === 'horas'}
          aria-pressed={healthUi.periodo === 'horas'}
          onclick={() => (healthUi.periodo = 'horas')}
        >
          por horas
        </button>
      {/if}
    </div>
    {#if porHoras}
      {#if conTasa}
        <div class="periodos" role="group" aria-label="Errores como">
          <button
            type="button"
            class="periodo"
            class:activo={!healthUi.verTasa}
            aria-pressed={!healthUi.verTasa}
            onclick={() => (healthUi.verTasa = false)}
          >
            recuento
          </button>
          <button
            type="button"
            class="periodo"
            class:activo={healthUi.verTasa}
            aria-pressed={healthUi.verTasa}
            onclick={() => (healthUi.verTasa = true)}
          >
            tasa
          </button>
        </div>
      {/if}
      <p class="leyenda">
        por horas, 7 días hasta «datos hasta»; una hora sin dato corta la línea; las subidas, que
        solo tienen día, se marcan al empezar ese día
      </p>
    {:else}
      <p class="leyenda">
        <span class="muestra media" aria-hidden="true"></span> media 7 días
        <span class="muestra diaria" aria-hidden="true"></span> diaria
        <span class="muestra estimada" aria-hidden="true"></span> estimado
      </p>
    {/if}
  </div>

  {#if seleccionada}
    <ReleaseComparison {app} version={seleccionada} />
  {/if}

  {#each GRUPOS as g (g.clase)}
    {@const metricas = deClase(g.clase)}
    {#if metricas.length > 0}
      <section class="grupo">
        <h3>{g.titulo}</h3>
        {#each metricas as m (m.id)}
          {@render bloqueMetrica(m)}
        {/each}
      </section>
    {/if}
  {/each}

  {#if deClase('peticiones').length > 0}
    <details class="grupo trafico">
      <summary>Tráfico</summary>
      {#each deClase('peticiones') as m (m.id)}
        {@render bloqueMetrica(m)}
      {/each}
    </details>
  {/if}
{/if}

<section class="grupo">
  <h3>Subidas de versión</h3>
  {#if versionesOrdenadas.length === 0}
    <p class="sin-versiones">
      Aún no hay subidas. Márcalas con «+ versión» para ver si coinciden con cambios en la
      tendencia.
    </p>
  {:else}
    <ul class="versiones">
      {#each versionesOrdenadas as v (v.id)}
        <li>
          <button
            type="button"
            class="version"
            class:activa={healthUi.versionSel === v.id}
            aria-pressed={healthUi.versionSel === v.id}
            onclick={() => seleccionar(v.id)}
          >
            <span class="v-nombre">{v.version}</span>
            <span class="v-dia">{fmtDate(v.dia)}</span>
            {#if v.nota}<span class="v-nota">{v.nota}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }
  .motivo {
    font-size: 13px;
    color: var(--text-mid);
  }
  .captura {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-dim);
  }
  .captura.warn {
    color: var(--accent);
  }
  .captura.danger {
    color: var(--danger);
  }
  .nota-app,
  .aviso-fuente {
    margin: 0;
    padding: 8px 12px;
    border-left: 2px solid var(--line);
    background: var(--surface);
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-mid);
  }
  .aviso-fuente {
    border-left-color: var(--accent);
  }
  .nota-titulo {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
    margin-right: 6px;
  }
  .avisos-fuente {
    font-size: 12px;
    color: var(--text-mid);
  }
  .avisos-fuente summary {
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--accent);
  }
  .avisos-fuente ul {
    margin: 6px 0 0;
    padding-left: 18px;
  }
  .consulta.fija {
    cursor: default;
  }
  .consulta.fija:hover {
    color: var(--text-dim);
  }
  .acciones {
    margin-left: auto;
    display: flex;
    gap: 12px;
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-dim);
    cursor: pointer;
  }
  .link:hover {
    color: var(--accent);
  }
  .vacio {
    padding: 24px;
    border: 1px dashed var(--line);
    border-radius: 8px;
    color: var(--text-mid);
    font-size: 14px;
    line-height: 1.5;
  }
  .vacio p {
    margin: 0;
  }
  code {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }
  .controles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
  }
  .periodos {
    display: flex;
    gap: 4px;
  }
  .periodo {
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: none;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    cursor: pointer;
  }
  .periodo.activo {
    color: var(--accent);
    border-color: var(--accent);
  }
  .leyenda {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .muestra {
    display: inline-block;
    width: 18px;
    height: 0;
    margin-left: 8px;
    border-top: 1px solid var(--text-dim);
  }
  .muestra.media {
    border-top: 2px solid var(--accent);
  }
  .muestra.estimada {
    border-top: 1px dashed var(--text-dim);
  }
  .grupo {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  h3,
  .trafico summary {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .trafico summary {
    cursor: pointer;
    margin-bottom: 10px;
  }
  .metrica {
    padding: 12px 14px;
    border: var(--line-width) solid var(--line);
    border-radius: 8px;
    background: var(--surface);
  }
  .metrica + .metrica {
    margin-top: 10px;
  }
  .metrica header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    margin-bottom: 4px;
  }
  h4 {
    margin: 0;
    font-size: 14px;
  }
  .dato {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-mid);
  }
  .variacion.sube {
    color: var(--danger);
  }
  .consulta {
    margin-left: auto;
    font-size: 11px;
  }
  .texto-consulta {
    display: block;
    margin-bottom: 6px;
    overflow-wrap: anywhere;
    color: var(--text-dim);
  }
  .sin-versiones {
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
  }
  .versiones {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .version {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    width: 100%;
    padding: 6px 10px;
    border: 1px solid var(--line-weak);
    border-radius: 6px;
    background: none;
    color: var(--text-mid);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .version:hover,
  .version.activa {
    border-color: var(--accent);
  }
  .v-nombre {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 600;
    color: var(--text);
  }
  .v-dia {
    font-family: 'IBM Plex Mono', monospace;
    color: var(--text-dim);
  }
</style>
