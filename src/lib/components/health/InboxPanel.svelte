<script lang="ts">
  /**
   * What waits for a person in the inbox: entries to review and files rejected.
   *
   * The review shows what applying would do, row by row, before it is done: an
   * estimate read off a screenshot is exactly what deserves that second look.
   * Unknown applications are shown and never created from here: a misspelt id
   * would otherwise split one application's history in two.
   */
  import { MOTIVOS } from '../../health/merge';
  import { health } from '../../health/store.svelte';
  import { healthUi } from '../../health/ui.svelte';
  import type { Entrada } from '../../health/inbox';
  import { formatoNumero } from '../../health/chart';

  const entradas = $derived(health.bandeja);
  const n = $derived(entradas.length);
  let abiertaEntrada = $state<string | null>(null);
  let ocupado = $state(false);

  function vista(entrada: Entrada) {
    const f = health.previsualizar(entrada);
    const ignoradas = new Map(f.ignoradas.map((i) => [i.fila, i.motivo]));
    return { f, ignoradas };
  }

  async function correr(fn: () => Promise<void>) {
    ocupado = true;
    try {
      await fn();
    } catch (e) {
      health.saveError = e instanceof Error ? e.message : String(e);
    } finally {
      ocupado = false;
    }
  }
</script>

{#if n > 0}
  <section class="bandeja">
    <button
      type="button"
      class="cabecera"
      aria-expanded={healthUi.bandejaAbierta}
      onclick={() => (healthUi.bandejaAbierta = !healthUi.bandejaAbierta)}
    >
      <span aria-hidden="true">{healthUi.bandejaAbierta ? '▾' : '▸'}</span>
      {n === 1 ? '1 propuesta por revisar' : `${n} propuestas por revisar`} en la bandeja
    </button>

    {#if healthUi.bandejaAbierta}
      <ul>
        {#each entradas as l (l.kind === 'valida' ? l.entrada.fichero : l.fichero)}
          {#if l.kind === 'rechazada'}
            <li class="entrada rechazada">
              <div class="fila-entrada">
                <code>{l.fichero}</code>
                <span class="estado">rechazada: {l.motivo}</span>
                <button
                  type="button"
                  class="btn"
                  disabled={ocupado}
                  onclick={() => correr(() => health.descartarEntrada(l.fichero))}
                >
                  descartar
                </button>
              </div>
            </li>
          {:else}
            {@const e = l.entrada}
            {@const abierta = abiertaEntrada === e.fichero}
            <li class="entrada">
              <div class="fila-entrada">
                <button
                  type="button"
                  class="revisar"
                  aria-expanded={abierta}
                  onclick={() => (abiertaEntrada = abierta ? null : e.fichero)}
                >
                  <span aria-hidden="true">{abierta ? '▾' : '▸'}</span>
                  <code>{e.fichero}</code>
                </button>
                <span class="estado">
                  {e.fuente}, capturado {e.capturado}, {e.filas.length}
                  {e.filas.length === 1 ? 'fila' : 'filas'}
                </span>
              </div>
              {#if abierta}
                {@const { f, ignoradas } = vista(e)}
                <div class="tabla-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Aplicación</th>
                        <th scope="col">Métrica</th>
                        <th scope="col">Día</th>
                        <th scope="col" class="num">Valor</th>
                        <th scope="col">Qué pasará</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each e.filas as fila (`${fila.app}|${fila.metrica}|${fila.dia}`)}
                        {@const motivo = ignoradas.get(fila)}
                        <tr class:ignorada={motivo}>
                          <td>{fila.app}</td>
                          <td>{fila.metrica}</td>
                          <td>{fila.dia}</td>
                          <td class="num">
                            {formatoNumero(fila.valor)}{fila.estimado ? ' ≈' : ''}
                          </td>
                          <td>{motivo ? `se ignora: ${MOTIVOS[motivo]}` : 'entra'}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
                <div class="acciones">
                  <span class="resultado">
                    entrarían {f.aplicadas + f.sinCambios}, se ignorarían {f.ignoradas.length}
                  </span>
                  <button
                    type="button"
                    class="btn"
                    disabled={ocupado}
                    onclick={() => correr(() => health.descartarEntrada(e.fichero))}
                  >
                    descartar
                  </button>
                  <button
                    type="button"
                    class="btn primary"
                    disabled={ocupado}
                    onclick={() => correr(() => health.aplicarEntrada(e.fichero))}
                  >
                    aplicar
                  </button>
                </div>
              {/if}
            </li>
          {/if}
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .bandeja {
    border: 1px solid var(--accent);
    border-radius: 8px;
    background: var(--surface);
  }
  .cabecera {
    display: flex;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    border: none;
    background: none;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    text-align: left;
    cursor: pointer;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0 14px 12px;
  }
  .entrada {
    padding: 8px 0;
    border-top: var(--line-width) solid var(--line-weak);
  }
  .fila-entrada {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
  }
  code {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }
  .revisar {
    display: flex;
    gap: 6px;
    padding: 0;
    border: none;
    background: none;
    color: var(--text);
    cursor: pointer;
  }
  .estado {
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .rechazada .estado {
    color: var(--danger);
  }
  .rechazada .btn {
    margin-left: auto;
  }
  .tabla-scroll {
    max-height: 280px;
    margin-top: 8px;
    overflow: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-mid);
  }
  th,
  td {
    padding: 3px 12px 3px 0;
    text-align: left;
    font-weight: 400;
    white-space: nowrap;
  }
  thead th {
    position: sticky;
    top: 0;
    background: var(--surface);
    color: var(--text-dim);
  }
  .num {
    text-align: right;
  }
  .ignorada {
    color: var(--text-dim);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }
  .ignorada td:last-child {
    text-decoration: none;
    display: inline-block;
  }
  .acciones {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
  .resultado {
    margin-right: auto;
    font-size: 12px;
    color: var(--text-dim);
  }
  .btn {
    height: 28px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: none;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    cursor: pointer;
  }
  .btn.primary {
    color: var(--accent);
    border-color: var(--accent);
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
