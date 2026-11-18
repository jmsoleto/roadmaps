<script lang="ts">
  /**
   * A sprint's alerts, most severe first (personas-alertas). Each one says its
   * severity with a mark and a word as well as a colour, and opens to who is
   * behind it. Nothing to resolve: an alert goes when its cause does.
   */
  import { SEVERITY_LABEL, SEVERITY_MARK, type Alert } from '../../personas/alerts';

  let { alerts }: { alerts: Alert[] } = $props();
  let open = $state<string | null>(null);
</script>

{#if alerts.length === 0}
  <p class="hint">
    Sin alertas: ningún rol crítico se queda sin nadie, no hay ausencias simultáneas de un mismo
    rol, la capacidad no cae más que el umbral del equipo y el calendario de festivos está completo.
  </p>
{:else}
  <ul class="alerts">
    {#each alerts as a (a.id)}
      <li class={a.severity}>
        <button
          class="row"
          aria-expanded={open === a.id}
          disabled={a.detail.length === 0}
          onclick={() => (open = open === a.id ? null : a.id)}
        >
          <span class="badge">
            <span aria-hidden="true">{SEVERITY_MARK[a.severity]}</span>
            {SEVERITY_LABEL[a.severity]}
          </span>
          <span class="message">{a.message}</span>
        </button>
        {#if open === a.id}
          <p class="detail">{a.detail.join(' · ')}</p>
        {/if}
      </li>
    {/each}
  </ul>
  <p class="hint">
    Las alertas se calculan con los datos de ahora y desaparecen cuando desaparece su causa. Los
    roles críticos y el umbral de caída se configuran en el equipo, en su pestaña Personas.
  </p>
{/if}

<style>
  .alerts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 760px;
  }
  li {
    border: var(--line-width) solid var(--line);
    border-radius: 8px;
    background: var(--surface);
  }
  li.critical {
    border-color: var(--danger);
    background: var(--tint-danger);
  }
  li.warn {
    border-color: var(--accent);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 9px 12px;
    border: none;
    background: none;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .row:disabled {
    cursor: default;
  }
  .badge {
    display: inline-flex;
    gap: 5px;
    min-width: 104px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: var(--text-mid);
  }
  .critical .badge {
    color: var(--danger);
  }
  .warn .badge {
    color: var(--accent);
  }
  .detail {
    margin: 0;
    padding: 0 12px 9px 128px;
    font-size: 12.5px;
    color: var(--text-mid);
  }
</style>
