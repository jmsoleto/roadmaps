<script lang="ts">
  /**
   * The points a sprint in planning can reasonably take, and where each figure
   * comes from (personas-historico, D4).
   */
  import { personas } from '../../personas/store.svelte';
  import { fmtPoints, forecast, type Proposal } from '../../personas/delivery';
  import type { Sprint } from '../../personas/model';
  import { fmtHours, fmtNumber } from '../../personas/format';

  let { sprint }: { sprint: Sprint } = $props();

  const f = $derived(forecast(personas.data, sprint, personas.capacityOf(sprint)));
  let open = $state(false);
  const familyName = (id: string) => personas.technology(id)?.name ?? '';
  const basis = (p: Proposal) =>
    p.bases.map((b) => `${b.name}: ${fmtNumber(b.points)} SP en ${fmtHours(b.hours)}`).join(' · ');
</script>

<section class="forecast">
  {#if f === null}
    <p class="hint">
      SP recomendados: aún no hay histórico. Se proponen en cuanto el equipo cierre un sprint con
      Story Points terminados.
    </p>
  {:else}
    <button class="line" aria-expanded={open} onclick={() => (open = !open)}>
      <span class="caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      <span class="label"
        >SP recomendados · {f.avg3.bases.length === 1
          ? 'según el último sprint'
          : `media de los ${f.avg3.bases.length} últimos`}</span
      >
      <span class="value">{fmtPoints(f.avg3.value)}</span>
    </button>
    {#if open}
      <table>
        <thead>
          <tr
            ><th></th><th class="r">Último</th><th class="r">Media de 3</th><th class="r"
              >Media de 5</th
            ></tr
          >
        </thead>
        <tbody>
          <tr>
            <td>Equipo · {fmtHours(f.capacity)}</td>
            <td class="r">{fmtPoints(f.last.value)}</td>
            <td class="r">{fmtPoints(f.avg3.value)}</td>
            <td class="r">{fmtPoints(f.avg5.value)}</td>
          </tr>
          {#each f.families as ff (ff.familyId)}
            <tr>
              <td>{familyName(ff.familyId)} · {fmtHours(ff.capacity)}</td>
              <td class="r">{ff.last ? fmtPoints(ff.last.value) : '—'}</td>
              <td class="r">{ff.avg3 ? fmtPoints(ff.avg3.value) : '—'}</td>
              <td class="r">{ff.avg5 ? fmtPoints(ff.avg5.value) : '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="hint">
        SP terminados × capacidad planificable de este sprint ÷ horas planificables reales de los
        sprints de base. Base de la media de 5: {basis(f.avg5)}.
      </p>
    {/if}
  {/if}
</section>

<style>
  .forecast {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 9px 16px;
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text-mid);
    font: inherit;
    cursor: pointer;
    text-align: left;
  }
  .caret {
    width: 10px;
    color: var(--text-dim);
    font-size: 10px;
  }
  .label {
    flex: 1;
  }
  .value {
    font-family: 'IBM Plex Mono', monospace;
    color: var(--accent);
    font-weight: 600;
  }
</style>
