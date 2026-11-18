<script lang="ts">
  /**
   * What a sprint committed and delivered, one row per family
   * (personas-historico, D1, D3, D5). Committed is written in planning,
   * delivered while active; the totals and the delivery figures are read from
   * `delivery.ts`, never added up here.
   */
  import { personas } from '../../personas/store.svelte';
  import { sprintDelivery, type Delivery } from '../../personas/delivery';
  import type { FamilyResult, Sprint } from '../../personas/model';
  import { fmtHours, fmtNumber, parseNumber } from '../../personas/format';

  let { sprint }: { sprint: Sprint } = $props();

  const real = $derived(personas.capacityOf(sprint));
  const d = $derived(sprintDelivery(sprint.results, real, personas.data.technologies));
  const canPlan = $derived(sprint.status === 'planificacion');
  const canDeliver = $derived(sprint.status === 'activo');
  const families = $derived(
    personas.data.technologies.filter(
      (t) => t.parentId === null && t.active && !sprint.results.some((r) => r.familyId === t.id),
    ),
  );
  let adding = $state('');
  let error = $state<string | null>(null);

  type Field = keyof Omit<FamilyResult, 'familyId'>;
  const FIELD_LABEL: Record<Field, string> = {
    plannedStories: 'historias comprometidas',
    plannedPoints: 'SP comprometidos',
    completedStories: 'historias terminadas',
    completedPoints: 'SP terminados',
  };

  function write(familyId: string, field: Field, input: HTMLInputElement) {
    const v = input.value.trim() === '' ? 0 : parseNumber(input.value);
    const out =
      v === null
        ? ({ ok: false, error: 'Las historias y los Story Points son números.' } as const)
        : personas.setResult(sprint.id, familyId, { [field]: v });
    if (out.ok) error = null;
    else {
      error = out.error;
      const row = sprint.results.find((r) => r.familyId === familyId);
      input.value = row ? fmtNumber(row[field]) : '0';
    }
  }

  function add() {
    if (!adding) return;
    const out = personas.addResultFamily(sprint.id, adding);
    error = out.ok ? null : out.error;
    adding = '';
  }

  const pct = (x: number | null) =>
    x === null ? 'no disponible' : `${fmtNumber(Math.round(x * 1000) / 10)} %`;
  const prod = (x: number | null) => (x === null ? 'no disponible' : `${fmtNumber(x)} SP/100 h`);
  const familyName = (id: string) => personas.technology(id)?.name ?? '';
</script>

{#snippet cell(familyId: string, field: Field, value: number, editable: boolean)}
  {#if editable}
    <input
      class="num"
      inputmode="decimal"
      aria-label="{FIELD_LABEL[field]} de {familyName(familyId)}"
      value={fmtNumber(value)}
      onchange={(e) => write(familyId, field, e.currentTarget)}
    />
  {:else}
    {fmtNumber(value)}
  {/if}
{/snippet}

{#snippet figures(x: Delivery)}
  <!-- Nothing has been delivered while planning: a 0 % there would read as a
       failure that has not happened. -->
  <td class="r">{canPlan ? '—' : pct(x.completion)}</td>
  <td class="r">{canPlan ? '—' : prod(x.productivity)}</td>
{/snippet}

<table>
  <thead>
    <tr>
      <th>Familia</th>
      <th class="r">Historias comprometidas</th>
      <th class="r">SP comprometidos</th>
      <th class="r">Historias terminadas</th>
      <th class="r">SP terminados</th>
      <th class="r">Cumplimiento</th>
      <th class="r">Rendimiento</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {#each sprint.results as r (r.familyId)}
      {@const fd = d.families.find((f) => f.familyId === r.familyId)}
      <tr>
        <td>{familyName(r.familyId)}</td>
        <td class="r">{@render cell(r.familyId, 'plannedStories', r.plannedStories, canPlan)}</td>
        <td class="r">{@render cell(r.familyId, 'plannedPoints', r.plannedPoints, canPlan)}</td>
        <td class="r"
          >{@render cell(r.familyId, 'completedStories', r.completedStories, canDeliver)}</td
        >
        <td class="r"
          >{@render cell(r.familyId, 'completedPoints', r.completedPoints, canDeliver)}</td
        >
        {#if fd}{@render figures(fd)}{/if}
        <td class="r">
          {#if canPlan}
            <button class="link" onclick={() => personas.removeResultFamily(sprint.id, r.familyId)}
              >quitar</button
            >
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
  <tfoot>
    <tr class="total">
      <td>Total</td>
      <td class="r">{fmtNumber(d.total.plannedStories)}</td>
      <td class="r">{fmtNumber(d.total.plannedPoints)}</td>
      <td class="r">{fmtNumber(d.total.completedStories)}</td>
      <td class="r">{fmtNumber(d.total.completedPoints)}</td>
      {@render figures(d.total)}
      <td></td>
    </tr>
  </tfoot>
</table>
{#if error}<p class="error">{error}</p>{/if}

{#if sprint.status !== 'cerrado' && families.length > 0}
  <div class="form">
    <label class="field"
      >Añadir una familia
      <select bind:value={adding}>
        <option value="">—</option>
        {#each families as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
      </select>
    </label>
    <div class="actions">
      <button class="btn" disabled={!adding} onclick={add}>añadir</button>
    </div>
  </div>
{/if}

<p class="hint">
  {#if canPlan}
    Apunta lo comprometido por familia: queda congelado al activar el sprint.
  {:else if canDeliver}
    Lo comprometido quedó congelado al activar. Apunta lo terminado: queda congelado al cerrar.
  {:else}
    Los resultados quedaron congelados al cerrar.
  {/if}
  El rendimiento son los SP terminados por cada 100 horas planificables reales ({fmtHours(
    d.total.realPlanning,
  )} en este sprint).
</p>

<style>
  tr.total td {
    font-weight: 600;
    border-top: var(--line-width) solid var(--line);
  }
</style>
