<script lang="ts">
  /** A team's closed sprints and what they delivered (personas-historico). */
  import { personas } from '../../personas/store.svelte';
  import { personasUi } from '../../personas/ui.svelte';
  import { average, history } from '../../personas/delivery';
  import { fmtHours, fmtNumber, fmtRange } from '../../personas/format';

  let { teamId }: { teamId: string } = $props();

  const rows = $derived(history(personas.data, teamId));
  // A sprint closed without results is a figure that is missing, not a zero:
  // it stays in the list and out of the means, as it is out of the forecast.
  const withResults = $derived(rows.filter((r) => r.sprint.results.length > 0));
  const avg3 = $derived(average(withResults, 3));
  const avg5 = $derived(average(withResults, 5));

  const pct = (x: number | null) =>
    x === null ? '—' : `${fmtNumber(Math.round(x * 1000) / 10)} %`;
  const prod = (x: number | null) => (x === null ? '—' : fmtNumber(x));
</script>

{#if rows.length === 0}
  <p class="hint">
    El histórico se llena al cerrar sprints: cada uno deja su capacidad planificada y real y lo que
    entregó, y con eso se proponen los SP del siguiente.
  </p>
{:else}
  <table>
    <thead>
      <tr>
        <th>Sprint</th>
        <th>Fechas</th>
        <th class="r">Planificable plan</th>
        <th class="r">Planificable real</th>
        <th class="r">SP comprometidos</th>
        <th class="r">SP terminados</th>
        <th class="r">Cumplimiento</th>
        <th class="r">SP/100 h</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as r (r.sprint.id)}
        <tr>
          <td>
            <button class="link" onclick={() => personasUi.openSprint(r.sprint.id, 'resultados')}
              >{r.sprint.name}</button
            >
          </td>
          <td class="mono">{fmtRange(r.sprint.startDate, r.sprint.endDate)}</td>
          <td class="r">{fmtHours(r.planPlanning)}</td>
          <td class="r">{fmtHours(r.delivery.total.realPlanning)}</td>
          {#if r.sprint.results.length === 0}
            <td class="r" colspan="4">sin resultados apuntados</td>
          {:else}
            <td class="r">{fmtNumber(r.delivery.total.plannedPoints)}</td>
            <td class="r">{fmtNumber(r.delivery.total.completedPoints)}</td>
            <td class="r">{pct(r.delivery.total.completion)}</td>
            <td class="r">{prod(r.delivery.total.productivity)}</td>
          {/if}
        </tr>
      {/each}
    </tbody>
    <tfoot>
      {#each [{ label: 'Media de 3', a: avg3 }, { label: 'Media de 5', a: avg5 }] as m (m.label)}
        {#if m.a}
          <tr class="avg">
            <td>{m.label}</td>
            <td class="mono">{m.a.count} {m.a.count === 1 ? 'sprint' : 'sprints'} con resultados</td
            >
            <td class="r">{fmtHours(m.a.planPlanning)}</td>
            <td class="r">{fmtHours(m.a.realPlanning)}</td>
            <td class="r">{fmtNumber(m.a.plannedPoints)}</td>
            <td class="r">{fmtNumber(m.a.completedPoints)}</td>
            <td class="r">{pct(m.a.completion)}</td>
            <td class="r">{prod(m.a.productivity)}</td>
          </tr>
        {/if}
      {/each}
    </tfoot>
  </table>
  <p class="hint">
    Las medias de cumplimiento y de rendimiento son cocientes de las sumas, para que un sprint corto
    no pese lo mismo que uno largo.
  </p>
{/if}

<style>
  tr.avg td {
    color: var(--text-mid);
    font-weight: 600;
  }
  tr.avg:first-child td {
    border-top: var(--line-width) solid var(--line);
  }
</style>
