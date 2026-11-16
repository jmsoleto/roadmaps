<script lang="ts">
  /**
   * What happened around a release: the week before against the week after.
   *
   * Worded as what the numbers did and never as what the release did. Errors that
   * rise after a release coincide with it; proving more takes reading the logs.
   *
   * The release is a mark: one registered by hand, or a deployment read from the
   * source. A failed or cancelled deployment changed nothing in production, so it
   * shows its detail and no comparison (health-despliegues, D3).
   */
  import { formatoNumero, formatoVariacion } from '../../health/chart';
  import { describir, glifo, horaLocal } from '../../health/despliegue-texto';
  import { enlaceSeguro } from '../../health/fuente/despliegues';
  import { abreComparacion, nombreMarca, type Marca } from '../../health/marcas';
  import type { Vigilada } from '../../health/model';
  import { health } from '../../health/store.svelte';
  import { healthUi } from '../../health/ui.svelte';
  import { compararMarca, type ComparacionHoras } from '../../health/trends';
  import { fmtDate } from '../../time/timeline';

  interface Props {
    app: Vigilada;
    marca: Marca;
    /** Every mark of the application, for the «another release» warning. */
    marcas: Marca[];
    /** Other deployments of the same day, to move between them. */
    mismoDia: Marca[];
    /** In the hourly view: the 24 hours around a deployment, by error metric. */
    horas: { nombre: string; r: ComparacionHoras }[] | null;
  }

  let { app, marca, marcas, mismoDia, horas }: Props = $props();

  const comparacion = $derived(
    compararMarca(marca, marcas, health.observacionesDe(app.id), health.catalogo, health.hoy),
  );
  const hayEstimados = $derived(
    comparacion.metricas.some((m) => m.kind === 'completa' && m.estimado),
  );
  const run = $derived(marca.origen === 'despliegue' ? enlaceSeguro(marca.d.runUrl) : null);
  const suben = $derived((horas ?? []).filter((h) => h.r.kind === 'completa' && h.r.sube));
</script>

<section class="comparacion" aria-label="Comparación de {nombreMarca(marca)}">
  <header>
    {#if marca.origen === 'manual'}
      <h3>{marca.version} · {fmtDate(marca.dia)}</h3>
      {#if marca.v.nota}<p class="nota">{marca.v.nota}</p>{/if}
    {:else}
      <h3>
        <span aria-hidden="true">{glifo(marca.d)}</span>
        {describir(marca.d)} · {horaLocal(marca.instante)}
      </h3>
      <p class="nota">
        {#if marca.d.actor}por {marca.d.actor} ·{/if}
        {#if run}
          <a href={run} target="_blank" rel="noopener noreferrer">run {marca.d.runId}</a>
        {:else}
          run {marca.d.runId}
        {/if}
      </p>
    {/if}
    <div class="acciones">
      {#if marca.origen === 'manual'}
        <button
          type="button"
          class="link"
          onclick={() => healthUi.abrir({ kind: 'version', appId: app.id, versionId: marca.id })}
        >
          editar
        </button>
      {/if}
      <button type="button" class="link" onclick={() => (healthUi.versionSel = null)}>cerrar</button
      >
    </div>
  </header>

  {#if mismoDia.length > 0}
    <p class="mismo-dia">
      Ese día también:
      {#each mismoDia as otra (otra.id)}
        <button type="button" class="link" onclick={() => (healthUi.versionSel = otra.id)}>
          {otra.origen === 'despliegue'
            ? `${glifo(otra.d)} ${describir(otra.d)}, ${horaLocal(otra.instante)}`
            : otra.version}
        </button>
      {/each}
    </p>
  {/if}

  {#if horas}
    <div class="horas">
      <p class="explica">
        24 horas antes y 24 después de la hora en que terminó, sin contarla. Indica lo que coincidió
        en el tiempo, no la causa.
      </p>
      <ul>
        {#each horas as h (h.nombre)}
          <li class:sube={h.r.kind === 'completa' && h.r.sube}>
            <span class="h-nombre">{h.nombre}</span>
            {#if h.r.kind === 'completa'}
              {formatoNumero(h.r.antes)} → {formatoNumero(h.r.despues)}
              ({formatoVariacion(h.r.variacion, h.r.sube)}{h.r.base === 'tasa' ? ' tasa' : ''}){h.r
                .sube
                ? ' · sube en las 24 horas siguientes'
                : ''}
            {:else if h.r.kind === 'pendiente'}
              {h.r.quedan === 1 ? 'falta 1 hora' : `faltan ${h.r.quedan} horas`} para comparar
            {:else}
              datos insuficientes: {h.r.faltan === 1
                ? 'falta 1 hora'
                : `faltan ${h.r.faltan} horas`}
            {/if}
          </li>
        {/each}
      </ul>
      {#if suben.length === 0 && horas.some((h) => h.r.kind === 'completa')}
        <p class="pie">Ningún error sube en las 24 horas siguientes.</p>
      {/if}
    </div>
  {/if}

  {#if !abreComparacion(marca)}
    <p class="explica">
      Un despliegue {marca.origen === 'despliegue' && marca.d.result === 'cancelled'
        ? 'cancelado'
        : 'fallido'} no cambió producción: no se compara antes y después.
    </p>
  {:else}
    <p class="explica">
      Media diaria de los 7 días anteriores y los 7 posteriores, sin contar el día de la subida.
      Indica lo que coincidió en el tiempo, no la causa.
    </p>

    {#if comparacion.otras.length > 0}
      <p class="aviso" role="note">
        ⚠ Hay otra subida dentro de la ventana ({comparacion.otras
          .map((v) => `${nombreMarca(v)}, ${fmtDate(v.dia)}`)
          .join('; ')}): el cambio no se puede atribuir a una sola versión.
      </p>
    {/if}

    <table>
      <thead>
        <tr>
          <th scope="col">Métrica</th>
          <th scope="col" class="num">Antes</th>
          <th scope="col" class="num">Después</th>
          <th scope="col" class="num">Variación</th>
        </tr>
      </thead>
      <tbody>
        {#each comparacion.metricas as m (m.metrica.id)}
          <tr>
            <th scope="row">{m.metrica.nombre}</th>
            {#if m.kind === 'completa'}
              <td class="num">{formatoNumero(m.mediaAntes)}</td>
              <td class="num">{formatoNumero(m.mediaDespues)}</td>
              <td class="num">
                {formatoVariacion(m.variacion)}{m.base === 'tasa' ? ' tasa' : ''}{m.estimado
                  ? ' ≈'
                  : ''}
              </td>
            {:else if m.kind === 'pendiente'}
              <td class="espera" colspan="3">
                {m.quedan === 1 ? 'queda 1 día' : `quedan ${m.quedan} días`} para comparar
              </td>
            {:else}
              <td class="espera" colspan="3">
                datos insuficientes: {m.faltan === 1 ? 'falta 1 día' : `faltan ${m.faltan} días`}
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
    {#if hayEstimados}
      <p class="pie">≈ usa valores estimados. «tasa» indica que se compara por peticiones.</p>
    {:else}
      <p class="pie">«tasa» indica que la variación se compara por peticiones.</p>
    {/if}
  {/if}
</section>

<style>
  .comparacion {
    padding: 14px 16px;
    border: 1px solid var(--accent);
    border-radius: 8px;
    background: var(--surface);
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
  }
  h3 {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
  }
  .nota {
    margin: 0;
    font-size: 13px;
    color: var(--text-mid);
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
  .explica,
  .pie {
    margin: 8px 0;
    font-size: 12px;
    color: var(--text-dim);
  }
  .pie {
    margin-bottom: 0;
  }
  .aviso {
    margin: 8px 0;
    padding: 6px 10px;
    border-left: 2px solid var(--danger);
    background: var(--tint-danger);
    font-size: 12.5px;
    color: var(--text);
  }
  table {
    width: 100%;
    max-width: 640px;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 5px 12px 5px 0;
    border-bottom: var(--line-width) solid var(--line-weak);
    text-align: left;
    font-weight: 400;
  }
  thead th {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  tbody td {
    font-family: 'IBM Plex Mono', monospace;
    font-variant-numeric: tabular-nums;
  }
  .num {
    text-align: right;
  }
  .mismo-dia {
    margin: 8px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .horas ul {
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
  }
  .horas li.sube {
    color: var(--danger);
  }
  .h-nombre {
    display: inline-block;
    min-width: 14em;
    color: var(--text-mid);
  }
  .nota a {
    color: inherit;
  }
  .espera {
    color: var(--text-dim);
    font-size: 12px;
  }
</style>
