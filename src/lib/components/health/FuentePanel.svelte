<script lang="ts">
  /**
   * The collector's folder, from the global panel: whether it is connected,
   * how far its data goes, and the applications it has that nobody watches yet
   * (health-colector-kibana).
   *
   * It is read only. Nothing here writes to it; adding an application only
   * writes Health Hub's own file for it.
   */
  import { formatoInstante } from '../../health/chart';
  import { healthFuente } from '../../health/fuente/connection.svelte';
  import { datosHasta } from '../../health/fuente/rate';
  import { health } from '../../health/store.svelte';

  const estado = $derived(healthFuente.estado);
  const zona = $derived(health.catalogo.zona);
  const disponibles = $derived(health.disponiblesEnFuente);
  const down = $derived(health.sinCarpeta || !health.ready || health.unavailable !== null);

  /** The oldest «datos hasta» of the source's applications: what all of them have reached. */
  const hasta = $derived.by(() => {
    const l = healthFuente.lectura;
    if (!l) return null;
    const fechas = l.apps.map((a) => datosHasta(a.app)).filter((t): t is number => t !== null);
    return fechas.length > 0 ? Math.min(...fechas) : null;
  });
</script>

<section class="fuente" aria-label="Fuente del colector">
  <div class="linea">
    <span class="titulo">Fuente</span>
    {#if estado.kind === 'sin-fuente'}
      <span class="dim"
        >sin conectar: la carpeta de datos del colector, la que tiene index.json</span
      >
      {#if healthFuente.supported}
        <button type="button" class="link" onclick={() => void healthFuente.elegir()}>
          conectar la fuente…
        </button>
      {/if}
    {:else if estado.kind === 'abriendo'}
      <span class="dim">abriendo «{estado.nombre}»…</span>
    {:else if estado.kind === 'permiso'}
      <span>«{estado.nombre}» sigue conectada, pero el navegador no ha conservado el permiso.</span>
      <button type="button" class="link" onclick={() => void healthFuente.reactivar()}>
        reactivar el acceso
      </button>
    {:else if estado.kind === 'no-valida'}
      <span class="error">«{estado.nombre}»: {estado.motivo}</span>
      <button type="button" class="link" onclick={() => void healthFuente.elegir()}
        >elegir otra…</button
      >
    {:else}
      <span>«{estado.nombre}»</span>
      {#if hasta !== null}<span class="dim">datos hasta {formatoInstante(hasta, zona)}</span>{/if}
      <button type="button" class="link" onclick={() => void healthFuente.elegir()}>cambiar…</button
      >
    {/if}
    {#if estado.kind !== 'sin-fuente'}
      <button type="button" class="link" onclick={() => void healthFuente.desconectar()}>
        desconectar
      </button>
    {/if}
  </div>

  {#if healthFuente.rechazo}
    <p class="error" role="alert">
      {healthFuente.rechazo}
      <button
        type="button"
        class="link"
        aria-label="cerrar el aviso"
        onclick={() => (healthFuente.rechazo = null)}>×</button
      >
    </p>
  {/if}

  {#if healthFuente.lectura && healthFuente.lectura.avisos.length > 0}
    <ul class="avisos">
      {#each healthFuente.lectura.avisos as a (a)}<li>{a}</li>{/each}
    </ul>
  {/if}

  {#if disponibles.length > 0}
    <div class="linea">
      <span class="dim">En la fuente y sin vigilar:</span>
      {#each disponibles as d (d.id)}
        <button
          type="button"
          class="btn"
          disabled={down}
          onclick={() => {
            const app = health.anadirDesdeFuente(d.id);
            if (app) health.abrir(app.id);
          }}
        >
          + {d.nombre}
        </button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .fuente {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px;
    border: var(--line-width) solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    font-size: 13px;
    color: var(--text-mid);
  }
  .linea {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
  }
  .titulo {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
  }
  .dim {
    color: var(--text-dim);
  }
  .error {
    margin: 0;
    color: var(--danger);
  }
  .avisos {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
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
  .btn {
    height: 26px;
    padding: 0 10px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: none;
    color: var(--accent);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
