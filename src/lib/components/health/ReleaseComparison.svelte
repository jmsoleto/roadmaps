<script lang="ts">
  /**
   * What happened around a release: the week before against the week after.
   *
   * Worded as what the numbers did and never as what the release did. Errors that
   * rise after a release coincide with it; proving more takes reading the logs.
   */
  import { formatoNumero, formatoVariacion } from '../../health/chart';
  import type { VersionSubida, Vigilada } from '../../health/model';
  import { health } from '../../health/store.svelte';
  import { healthUi } from '../../health/ui.svelte';
  import { compararVersion } from '../../health/trends';
  import { fmtDate } from '../../time/timeline';

  interface Props {
    app: Vigilada;
    version: VersionSubida;
  }

  let { app, version }: Props = $props();

  const comparacion = $derived(
    compararVersion(version, app, health.observacionesDe(app.id), health.data.catalogo, health.hoy),
  );
  const hayEstimados = $derived(
    comparacion.metricas.some((m) => m.kind === 'completa' && m.estimado),
  );
</script>

<section class="comparacion" aria-label="Comparación de la versión {version.version}">
  <header>
    <h3>{version.version} · {fmtDate(version.dia)}</h3>
    {#if version.nota}<p class="nota">{version.nota}</p>{/if}
    <div class="acciones">
      <button
        type="button"
        class="link"
        onclick={() => healthUi.abrir({ kind: 'version', appId: app.id, versionId: version.id })}
      >
        editar
      </button>
      <button type="button" class="link" onclick={() => (healthUi.versionSel = null)}>cerrar</button
      >
    </div>
  </header>

  <p class="explica">
    Media diaria de los 7 días anteriores y los 7 posteriores, sin contar el día de la subida.
    Indica lo que coincidió en el tiempo, no la causa.
  </p>

  {#if comparacion.otras.length > 0}
    <p class="aviso" role="note">
      ⚠ Hay otra subida dentro de la ventana ({comparacion.otras
        .map((v) => `${v.version}, ${fmtDate(v.dia)}`)
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
  .espera {
    color: var(--text-dim);
    font-size: 12px;
  }
</style>
