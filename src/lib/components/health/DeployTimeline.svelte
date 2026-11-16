<script lang="ts">
  /**
   * The deployments of an application, newest first (health-despliegues,
   * «Línea de tiempo de despliegues»).
   *
   * Every text of a row comes from GitHub or Jira, and anybody with access to a
   * GDV can write its changelog: all of it is printed with `{…}`, which Svelte
   * escapes, and links are offered only when they are `https:` (D6).
   */
  import {
    describir,
    glifo,
    horaLocal,
    textoGdv,
    TEXTO_RESULTADO,
  } from '../../health/despliegue-texto';
  import { enlaceSeguro, gdvPuedeCambiar, type Despliegue } from '../../health/fuente/despliegues';
  import { idDespliegue } from '../../health/marcas';

  interface Props {
    /** What the period and the filter let through, newest first. */
    despliegues: Despliegue[];
    /** Every deployment read, to find what a rollback reverts. */
    todos: Despliegue[];
    seleccionada: string | null;
    onseleccion: (id: string) => void;
    /** Now, in ms: whether a GDV may still arrive depends on it. */
    ahora: number;
  }

  let { despliegues, todos, seleccionada, onseleccion, ahora }: Props = $props();

  const porRun = $derived(new Map(todos.map((d) => [d.runId, d])));
  const notas = (texto: string) => texto.replace(/\r\n?/g, '\n');
</script>

<ol class="timeline">
  {#each despliegues as d (d.runId)}
    {@const id = idDespliegue(d.runId)}
    {@const run = enlaceSeguro(d.runUrl)}
    {@const revierte = d.rollbackOf !== null ? (porRun.get(d.rollbackOf) ?? null) : null}
    <li
      class="fila"
      class:fallida={d.result !== 'success'}
      class:rollback={d.kind === 'rollback'}
      class:activa={seleccionada === id}
    >
      <div class="cabecera">
        <span class="glifo" aria-hidden="true">{glifo(d)}</span>
        <button
          type="button"
          class="version"
          aria-pressed={seleccionada === id}
          onclick={() => onseleccion(id)}
        >
          {d.version ?? `run ${d.runId}`}
        </button>
        <span class="tipo">{d.kind}</span>
        <span class="resultado">{TEXTO_RESULTADO[d.result]}</span>
        <time datetime={new Date(d.finishedAt).toISOString()}>{horaLocal(d.finishedAt)}</time>
        {#if d.actor}<span class="actor">{d.actor}</span>{/if}
        {#if run}
          <a href={run} target="_blank" rel="noopener noreferrer">run {d.runId}</a>
        {:else}
          <span class="dim">run {d.runId}</span>
        {/if}
      </div>

      {#if d.kind === 'rollback'}
        <p class="revierte">
          {#if revierte}
            revierte
            <button
              type="button"
              class="link"
              onclick={() => onseleccion(idDespliegue(revierte.runId))}
            >
              {describir(revierte)}, {horaLocal(revierte.finishedAt)}
            </button>
          {:else}
            revierte un despliegue no registrado
          {/if}
        </p>
      {/if}

      <dl class="datos">
        {#if d.crq}<div>
            <dt>CRQ</dt>
            <dd>{d.crq}</dd>
          </div>{/if}
        {#if d.plannedFrom !== null && d.plannedTo !== null}
          <div>
            <dt>ventana</dt>
            <dd>{horaLocal(d.plannedFrom)} – {horaLocal(d.plannedTo)}</dd>
          </div>
        {/if}
        {#if d.originBranch}<div>
            <dt>rama</dt>
            <dd>{d.originBranch}</dd>
          </div>{/if}
        {#if d.components.length > 0}
          <div>
            <dt>componentes</dt>
            <dd>
              {d.components.map((c) => (c.version ? `${c.name} ${c.version}` : c.name)).join(', ')}
            </dd>
          </div>
        {/if}
      </dl>

      {#if d.gdv.status === 'found'}
        {@const g = d.gdv}
        {@const url = enlaceSeguro(g.url)}
        <div class="gdv">
          <p>
            {#if url}
              <a href={url} target="_blank" rel="noopener noreferrer">{g.key ?? 'GDV'}</a>
            {:else}
              <span>{g.key ?? 'GDV'}</span>
            {/if}
            {#if g.summary}<span class="gdv-titulo">{g.summary}</span>{/if}
          </p>
          {#if g.release}
            <p class="dim">release {g.release.key ?? ''} {g.release.summary ?? ''}</p>
          {/if}
          {#if g.deployedAt !== null && g.deployedAt !== d.finishedAt}
            <p class="dim">declarado en Jira: {horaLocal(g.deployedAt)}</p>
          {/if}
          {#if g.releaseNotes}
            <details>
              <summary>changelog</summary>
              <pre class="notas">{notas(g.releaseNotes)}</pre>
              {#if g.releaseNotesTruncated}
                <p class="dim">El changelog está cortado: el texto completo está en la GDV.</p>
              {/if}
            </details>
          {:else}
            <p class="dim">la GDV no tiene changelog</p>
          {/if}
        </div>
      {:else}
        <p class="gdv dim">{textoGdv(d.gdv.status, gdvPuedeCambiar(d, ahora))}</p>
      {/if}
    </li>
  {/each}
</ol>

<style>
  .timeline {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .fila {
    padding: 8px 0 8px 12px;
    border-left: 2px solid var(--accent);
    border-bottom: var(--line-width) solid var(--line-weak);
  }
  .fila.fallida {
    border-left-color: var(--danger);
  }
  .fila.activa {
    background: var(--tint-accent-soft);
  }
  .cabecera {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 12px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
  }
  .glifo {
    color: var(--accent);
  }
  .fallida .glifo,
  .fallida .resultado {
    color: var(--danger);
  }
  .version {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
  }
  .version:hover {
    color: var(--accent);
  }
  .tipo,
  .actor,
  time {
    color: var(--text-mid);
  }
  .rollback .tipo {
    font-weight: 600;
    color: var(--text);
  }
  a {
    color: var(--text-mid);
  }
  .revierte,
  .gdv p,
  p.gdv {
    margin: 4px 0 0;
    font-size: 12.5px;
  }
  .datos {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 16px;
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--text-dim);
  }
  .datos div {
    display: flex;
    gap: 6px;
    min-width: 0;
  }
  .datos dt {
    font-family: 'IBM Plex Mono', monospace;
  }
  .datos dd {
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--text-mid);
  }
  .gdv-titulo {
    margin-left: 8px;
    color: var(--text-mid);
  }
  .dim {
    color: var(--text-dim);
  }
  details {
    margin-top: 4px;
  }
  summary {
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: var(--text-dim);
  }
  .notas {
    max-height: 320px;
    overflow: auto;
    margin: 6px 0 0;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--surface-2);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--text);
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: var(--text-mid);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
