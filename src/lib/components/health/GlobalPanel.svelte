<script lang="ts">
  /**
   * All the vigiladas at a glance, worst first.
   *
   * It compares each one with itself and never one with another: two applications
   * with different traffic have no meaningful common scale, so what sits side by
   * side here is how each one has changed.
   */
  import { formatoNumero, formatoVariacion, puntos as puntosDe } from '../../health/chart';
  import { ultimoRelease } from '../../health/fuente/despliegues';
  import { ultimaVersion as ultimaDe } from '../../health/marcas';
  import { health, type FilaPanel } from '../../health/store.svelte';
  import { healthUi } from '../../health/ui.svelte';
  import {
    ETIQUETA_SALUD,
    MINIMO_ABSOLUTO,
    ORDEN_SALUD,
    textoCaptura,
    UMBRAL_CLIENTE,
    UMBRAL_PROPIA,
    type Tendencia,
  } from '../../health/trends';
  import { addDays } from '../../time/timeline';
  import SaludBadge from './SaludBadge.svelte';
  import Sparkline from './Sparkline.svelte';

  const DIAS_EVOLUCION = 90;

  const filas = $derived(health.filas);
  const errores = $derived(health.metricas.filter((m) => m.clase !== 'peticiones'));
  const principal = $derived(health.metricas.find((m) => m.clase === 'propia') ?? null);

  const resumen = $derived(
    ORDEN_SALUD.map((estado) => ({
      estado,
      n: filas.filter((f) => f.salud.estado === estado).length,
    })).filter((r) => r.n > 0),
  );

  function evolucion(fila: FilaPanel) {
    if (!principal || !fila.salud.ultimoDia) return null;
    const dias = puntosDe(
      health.observacionesDe(fila.id),
      principal.id,
      addDays(fila.salud.ultimoDia, -(DIAS_EVOLUCION - 1)),
      fila.salud.ultimoDia,
    );
    // At this size the daily line is only its weekends: the mean shows the trend.
    // Until 7 days are measured there is none, and the days themselves are all there is.
    if (!dias.some((p) => p.media !== null)) return dias;
    return dias.map((p) => ({ ...p, valor: p.media }));
  }

  /** The latest manual release or successful deployment, whichever is newer (health-despliegues, D7). */
  function ultimaVersion(fila: FilaPanel) {
    const despliegues = health.desplieguesDe(fila.id);
    return ultimaDe(
      fila.app.versiones,
      despliegues ? ultimoRelease(despliegues) : null,
      health.catalogo.zona,
    );
  }

  function celda(t: Tendencia): string {
    if (t.estado === 'sin-datos' || t.recuento === null) return '—';
    return formatoNumero(t.recuento);
  }
</script>

{#if filas.length === 0}
  <div class="empty">
    <p>
      Aún no vigilas ninguna aplicación. Da de alta la primera y deja sus capturas en la bandeja de
      esta carpeta.
    </p>
    <button type="button" class="btn" onclick={() => healthUi.abrir({ kind: 'crear' })}>
      + nueva aplicación
    </button>
  </div>
{:else}
  <div class="head">
    <h2>Salud de las aplicaciones</h2>
    <p class="resumen">
      {#each resumen as r, i (r.estado)}
        {#if i > 0}<span class="punto" aria-hidden="true">·</span>{/if}{r.n}
        {ETIQUETA_SALUD[r.estado].toLowerCase()}
      {/each}
    </p>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">Aplicación</th>
          <th scope="col">Salud</th>
          {#each errores as m (m.id)}
            <th scope="col" class="num">{m.nombre}<span class="sub">7 días</span></th>
          {/each}
          <th scope="col">{principal?.nombre ?? ''}<span class="sub">90 días</span></th>
          <th scope="col">Versión</th>
          <th scope="col">Captura</th>
        </tr>
      </thead>
      <tbody>
        {#each filas as fila (fila.id)}
          {@const serie = evolucion(fila)}
          {@const ultima = ultimaVersion(fila)}
          <tr onclick={() => health.abrir(fila.id)}>
            <th scope="row">
              <button type="button" class="nombre" onclick={() => health.abrir(fila.id)}>
                {fila.nombre}
              </button>
              {#if fila.salud.motivo.length > 0}
                <span class="motivo">{fila.salud.motivo.join(', ')}</span>
              {/if}
            </th>
            <td><SaludBadge estado={fila.salud.estado} /></td>
            {#each errores as m (m.id)}
              {@const t = fila.salud.tendencias[m.id]}
              <td class="num">
                <span class="valor">{celda(t)}</span>
                {#if t.estado !== 'sin-datos'}
                  <span class="variacion" class:sube={t.estado === 'sube'}>
                    {formatoVariacion(t.variacion, t.estado === 'sube')}{t.estimado ? ' ≈' : ''}
                  </span>
                {/if}
              </td>
            {/each}
            <td>
              {#if serie}<Sparkline puntos={serie} />{:else}<span class="dim">sin datos</span>{/if}
            </td>
            <td class="mono">
              {#if ultima}
                {ultima.version}
                <span
                  class="origen"
                  title={ultima.origen === 'despliegue'
                    ? 'último despliegue a producción, leído de la fuente'
                    : 'subida registrada a mano'}
                >
                  {ultima.origen === 'despliegue' ? '● desplegada' : '✎ manual'}
                </span>
              {:else}
                —
              {/if}
            </td>
            <td class="mono">
              {#if fila.salud.captura}
                <span
                  class:warn={fila.salud.captura.tono === 'warn'}
                  class:danger={fila.salud.captura.tono === 'danger'}
                >
                  {fila.salud.captura.aviso ? '⚠ ' : ''}{textoCaptura(fila.salud.captura)}
                </span>
              {:else}
                <span class="dim">sin empezar</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <details class="reglas">
    <summary>Cómo se calcula la salud</summary>
    <p>
      Se comparan los 7 últimos días con datos con los 7 anteriores, por cada 1.000 peticiones si
      están, y si no por recuento. Si falta un día no hay comparación. Una variación cuenta si es de
      al menos un {UMBRAL_PROPIA * 100} % en errores propios o un {UMBRAL_CLIENTE * 100} % en errores
      de cliente, y el recuento semanal cambia en {MINIMO_ABSOLUTO} o más.
    </p>
    <ul>
      <li><strong>Sin datos:</strong> ningún error propio tiene comparación.</li>
      <li><strong>Sin captura:</strong> ya se han perdido días.</li>
      <li><strong>Empeora:</strong> sube algún error propio.</li>
      <li><strong>Vigilar:</strong> sube algún error de cliente; puede no ser de la aplicación.</li>
      <li><strong>Mejora:</strong> baja algún error propio y ninguno sube.</li>
      <li><strong>Estable:</strong> en cualquier otro caso.</li>
    </ul>
    <p>El símbolo ≈ indica que la comparación usa valores estimados.</p>
  </details>
{/if}

<style>
  .origen {
    display: block;
    font-size: 10.5px;
    color: var(--text-dim);
  }
  .empty {
    max-width: 480px;
    margin: 40px auto;
    text-align: center;
    color: var(--text-mid);
    font-size: 14px;
    line-height: 1.5;
  }
  .btn {
    height: 32px;
    padding: 0 14px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: none;
    color: var(--accent);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    cursor: pointer;
  }
  .head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 16px;
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }
  .resumen {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .punto {
    margin: 0 6px;
  }
  .table-wrap {
    overflow-x: auto;
    border: var(--line-width) solid var(--line);
    border-radius: 8px;
    background: var(--surface);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 10px 12px;
    text-align: left;
    vertical-align: middle;
    border-bottom: var(--line-width) solid var(--line-weak);
    white-space: nowrap;
  }
  thead th {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    vertical-align: bottom;
  }
  tbody tr {
    cursor: pointer;
  }
  tbody tr:last-child th,
  tbody tr:last-child td {
    border-bottom: none;
  }
  tbody tr:hover {
    background: var(--hover);
  }
  .sub {
    display: block;
    text-transform: none;
    letter-spacing: 0;
    opacity: 0.8;
  }
  .num {
    text-align: right;
  }
  .nombre {
    display: block;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    text-align: left;
  }
  .nombre:hover {
    color: var(--accent);
  }
  .motivo {
    display: block;
    margin-top: 2px;
    font-size: 11.5px;
    font-weight: 400;
    color: var(--text-dim);
  }
  .valor {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-variant-numeric: tabular-nums;
  }
  .variacion {
    display: block;
    margin-top: 2px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .variacion.sube {
    color: var(--danger);
  }
  .mono {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-mid);
  }
  .dim {
    color: var(--text-dim);
    font-size: 12px;
  }
  .warn {
    color: var(--accent);
  }
  .danger {
    color: var(--danger);
  }
  .reglas {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-mid);
  }
  .reglas summary {
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-dim);
  }
  .reglas p {
    margin: 10px 0 6px;
    max-width: 720px;
  }
  .reglas ul {
    margin: 0;
    padding-left: 18px;
  }
</style>
