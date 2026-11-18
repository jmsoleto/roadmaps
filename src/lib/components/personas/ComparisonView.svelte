<script lang="ts">
  /**
   * Plan against reality, side by side (personas-plan-real, D4): every line of
   * the summary, every person, and the absences that appeared or went away
   * after activation. Read from `compare`, never added up here.
   */
  import { personas } from '../../personas/store.svelte';
  import { compare, realAbsences, type CompareLine } from '../../personas/snapshot';
  import type { SprintCapacity } from '../../personas/capacity';
  import { ABSENCE_LABEL, type Absence, type Sprint } from '../../personas/model';
  import { fmtDay, fmtHours, fmtNumber } from '../../personas/format';
  import { LINE_LABEL } from '../../personas/breakdown';

  let { sprint, plan, real }: { sprint: Sprint; plan: SprintCapacity; real: SprintCapacity } =
    $props();

  const cmp = $derived(
    compare(plan, real, sprint.plan?.absences ?? [], realAbsences(sprint, personas.data)),
  );

  /**
   * Whether a line moving up is bad news: more holidays, absences, dedication
   * elsewhere all take hours away. Painted by its effect on capacity, so red
   * always means fewer hours.
   */
  const TAKES: ReadonlySet<CompareLine> = new Set(['holiday', 'absence', 'dedication']);
  // The reserve only follows what is available, so it is never good or bad news.
  const loses = (l: CompareLine, d: number) =>
    l !== 'reserve' && (TAKES.has(l) ? d > 0.05 : d < -0.05);
  const gains = (l: CompareLine, d: number) =>
    l !== 'reserve' && (TAKES.has(l) ? d < -0.05 : d > 0.05);

  const label = (l: CompareLine) => (l === 'planning' ? 'Planificable' : LINE_LABEL[l]);
  /** A signed difference: `+8 h`, `−13,6 h`, `=` when nothing moved. */
  const delta = (d: number) =>
    Math.round(d * 10) === 0 ? '=' : `${d > 0 ? '+' : '−'}${fmtNumber(Math.abs(d))} h`;
  const name = (personId: string) =>
    sprint.plan?.people.find((p) => p.id === personId)?.name ??
    personas.person(personId)?.name ??
    '';
  const span = (a: Absence) =>
    a.startDate === a.endDate
      ? fmtDay(a.startDate)
      : `${fmtDay(a.startDate)} – ${fmtDay(a.endDate)}`;
  const hours = (a: Absence) =>
    a.hoursPerDay === null ? 'día completo' : `${fmtNumber(a.hoursPerDay)} h/día`;
</script>

<div class="cols">
  <section>
    <h3>El sprint</h3>
    <table>
      <thead>
        <tr><th></th><th class="r">Plan</th><th class="r">Real</th><th class="r">Diferencia</th></tr
        >
      </thead>
      <tbody>
        {#each cmp.lines as l (l.line)}
          {#if l.line !== 'adjustment' || l.real !== 0 || l.plan !== 0}
            <tr class:total={l.line === 'planning'} class:strong={l.line === 'available'}>
              <td
                >{label(l.line)}{l.line === 'adjustment' && real.team.adjustmentReason
                  ? ` · ${real.team.adjustmentReason}`
                  : ''}</td
              >
              <td class="r">{fmtHours(l.plan)}</td>
              <td class="r">{fmtHours(l.real)}</td>
              <td class="r" class:down={loses(l.line, l.delta)} class:up={gains(l.line, l.delta)}
                >{delta(l.delta)}</td
              >
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </section>

  <section>
    <h3>Por persona · disponible</h3>
    <table>
      <thead>
        <tr><th></th><th class="r">Plan</th><th class="r">Real</th><th class="r">Diferencia</th></tr
        >
      </thead>
      <tbody>
        {#each cmp.people as p (p.personId)}
          <tr>
            <td>{p.name}</td>
            <td class="r">{fmtHours(p.plan)}</td>
            <td class="r">{fmtHours(p.real)}</td>
            <td class="r" class:down={p.delta < -0.05} class:up={p.delta > 0.05}
              >{delta(p.delta)}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>

<section>
  <h3>Lo que cambió desde que se activó</h3>
  {#if cmp.appeared.length === 0 && cmp.withdrawn.length === 0}
    <p class="hint">Ninguna ausencia nueva ni retirada: el sprint va como se planificó.</p>
  {:else}
    <table>
      <thead>
        <tr><th></th><th>Persona</th><th>Tipo</th><th>Cuándo</th><th class="r">Horas</th></tr>
      </thead>
      <tbody>
        {#each cmp.appeared as a (`+${a.id}`)}
          <tr>
            <td><span class="tag accent">+ sobrevenida</span></td>
            <td>{name(a.personId)}</td>
            <td>{ABSENCE_LABEL[a.type]}</td>
            <td class="mono">{span(a)}</td>
            <td class="r">{hours(a)}</td>
          </tr>
        {/each}
        {#each cmp.withdrawn as a (`-${a.id}`)}
          <tr>
            <td><span class="tag">− retirada</span></td>
            <td>{name(a.personId)}</td>
            <td>{ABSENCE_LABEL[a.type]}</td>
            <td class="mono">{span(a)}</td>
            <td class="r">{hours(a)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
  <p class="hint">
    El plan se congeló al activar{sprint.plan ? ` (${sprint.plan.takenAt.slice(0, 10)})` : ''}.
    {sprint.status === 'cerrado'
      ? 'Lo real se congeló al cerrar.'
      : 'Lo real sigue a los datos de ahora hasta que se cierre el sprint.'}
  </p>
</section>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 28px;
    align-items: start;
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  tr.total td {
    font-weight: 600;
    border-top: 3px double var(--line);
  }
  tr.strong td {
    font-weight: 600;
  }
  td.down {
    color: var(--danger);
  }
  td.up {
    color: var(--accent);
  }
</style>
