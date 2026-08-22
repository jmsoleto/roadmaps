<script lang="ts">
  /**
   * The Decisions application: the list on the left, one decision on the right.
   *
   * The unavailable case is handled first and on its own. A store that would not
   * open must never be shown as a store with nothing in it — arriving on an
   * empty list over real data invites writing over it, and there is no server to
   * recover from.
   */
  import { decisions } from '../../decisions/store.svelte';
  import { decisionsUi, FILTERS, matchesFilter } from '../../decisions/ui.svelte';
  import { byUrgency, daysToDeadline, phaseOf } from '../../decisions/model/state';
  import { knownProjects } from '../../decisions/model/projects';
  import { todayIso } from '../../time/timeline';
  import DecisionDetail from './DecisionDetail.svelte';
  import PresentationView from './PresentationView.svelte';

  const today = todayIso();

  const projects = $derived(knownProjects(decisions.all));

  const visible = $derived(
    decisions.all
      .filter((d) => matchesFilter(decisionsUi.filter, phaseOf(d, today)))
      .filter((d) => decisionsUi.project === '' || d.project === decisionsUi.project)
      .sort(byUrgency(today)),
  );

  const counts = $derived({
    abiertas: decisions.countOpen(),
    borradores: decisions.captured.length,
    listas: decisions.all.filter((d) => ['lista', 'caducada'].includes(phaseOf(d, today))).length,
    resueltas: decisions.all.length - decisions.countOpen(),
    todas: decisions.all.length,
  });

  /**
   * The decision being presented, if any.
   *
   * `cerrada` counts. Deciding in the meeting closes the decision, and dropping
   * out of the presentation at that exact instant would snatch the screen away
   * from the room instead of showing them the minute. What is refused is
   * *entering* on something unfinished — phases 1 and 2 — which is a different
   * rule from staying.
   */
  const presented = $derived(
    decisionsUi.presenting === null
      ? null
      : (decisions.all.find(
          (d) =>
            d.id === decisionsUi.presenting &&
            ['lista', 'caducada', 'cerrada'].includes(phaseOf(d, today)),
        ) ?? null),
  );

  function meta(d: (typeof visible)[number]): string {
    const phase = phaseOf(d, today);
    if (phase === 'cerrada') return d.resolution?.at ?? '';
    if (d.deadline === null) return 'sin fecha';
    const days = daysToDeadline(d, today)!;
    if (days < 0) return `venció hace ${-days} d`;
    if (days === 0) return 'hoy';
    return `${days} d`;
  }
</script>

{#if presented}
  <PresentationView decision={presented} onClose={() => decisionsUi.endPresentation()} />
{:else if !decisions.ready}
  <!-- Not "there is nothing": "we do not know yet". Showing an empty list over a
       store still answering is the same mistake as showing one over a store that
       failed. -->
  <div class="loading">Abriendo las decisiones…</div>
{:else if decisions.unavailable}
  <div class="unavailable">
    <h2>Las decisiones no están disponibles</h2>
    <p class="reason">{decisions.unavailable.reason}</p>
    <p class="explain">
      No se muestra una lista vacía a propósito: podría haber decisiones guardadas que no se han
      podido leer, y escribir encima sería irreversible. Roadmaps y el hub siguen funcionando con
      normalidad.
    </p>
  </div>
{:else}
  <div class="app">
    <div class="filters">
      {#each FILTERS as f (f.id)}
        <button
          type="button"
          class="filter"
          class:on={decisionsUi.filter === f.id}
          onclick={() => decisionsUi.setFilter(f.id)}
        >
          {f.label} · {counts[f.id]}
        </button>
      {/each}

      <div class="spacer"></div>

      {#if projects.length > 0}
        <span class="field-label">proyecto</span>
        <select
          class="project"
          value={decisionsUi.project}
          onchange={(e) => decisionsUi.setProject(e.currentTarget.value)}
        >
          <option value="">todos</option>
          {#each projects as p (p)}<option value={p}>{p}</option>{/each}
        </select>
      {/if}
    </div>

    <div class="body">
      <div class="list">
        {#if visible.length === 0}
          <p class="empty">
            {#if decisions.all.length === 0}
              Todavía no hay ninguna decisión. Captura la primera con <strong>+ capturar</strong>:
              una línea y Enter.
            {:else}
              Nada en este filtro.
            {/if}
          </p>
        {/if}

        {#each visible as d (d.id)}
          {@const phase = phaseOf(d, today)}
          <button
            type="button"
            class="row"
            class:selected={decisions.selectedId === d.id}
            onclick={() => decisions.select(d.id)}
          >
            <span class="dot {phase}"></span>
            <span class="title">{d.question.trim() || d.origin}</span>
            <span class="project-tag">{d.project}</span>
            <span class="meta {phase}">{meta(d)}</span>
          </button>
        {/each}
      </div>

      <div class="detail-pane">
        {#if decisions.selected}
          <DecisionDetail decision={decisions.selected} />
        {:else}
          <div class="nothing">
            <p>Elige una decisión para verla entera.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .filters {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-bottom: var(--line-width) solid var(--line-weak);
    flex-shrink: 0;
  }
  .spacer {
    flex: 1;
  }
  .filter {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    padding: 7px 12px;
    cursor: pointer;
  }
  .filter:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .filter.on {
    color: var(--accent);
    border-color: var(--accent);
  }
  .field-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .project {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    padding: 5px 8px;
  }
  .body {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .list {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }
  .row {
    display: grid;
    grid-template-columns: 10px 1fr 150px 110px;
    align-items: center;
    gap: 12px;
    width: 100%;
    height: 52px;
    padding: 0 16px;
    border: none;
    border-bottom: var(--line-width) solid var(--line-weak);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    background: var(--hover);
  }
  .row.selected {
    background: var(--tint-accent);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--text-dim);
  }
  .dot.captura {
    background: var(--text-dim);
    opacity: 0.5;
  }
  .dot.lista {
    background: var(--accent);
  }
  .dot.caducada {
    background: var(--danger);
  }
  .dot.cerrada {
    background: var(--text-mid);
  }
  .title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    font-size: 13.5px;
  }
  .project-tag {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: var(--text-dim);
  }
  .meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: var(--text-dim);
    text-align: right;
  }
  .meta.caducada {
    color: var(--danger);
  }
  /* Wide enough for the criteria matrix, which is what phase 2 is for. The
     matrix still scrolls inside itself when the alternatives outgrow it. */
  .detail-pane {
    width: clamp(420px, 52%, 760px);
    flex-shrink: 0;
    min-height: 0;
  }
  .nothing {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 24px;
    background: var(--surface);
    border-left: var(--line-width) solid var(--line);
    color: var(--text-dim);
    font-size: 13.5px;
    text-align: center;
  }
  .empty {
    margin: 0;
    padding: 24px 16px;
    color: var(--text-dim);
    font-size: 13.5px;
    line-height: 1.5;
  }
  .loading {
    padding: 48px 16px;
    text-align: center;
    color: var(--text-dim);
    font-size: 13.5px;
  }
  .unavailable {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    max-width: 560px;
    margin: 48px auto;
    padding: 24px;
    background: var(--tint-danger);
    border: var(--line-width) solid var(--line);
    border-left: 2px solid var(--danger);
    border-radius: 8px;
  }
  .unavailable h2 {
    margin: 0;
    font-size: 18px;
    color: var(--text);
  }
  .reason {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    color: var(--danger);
  }
  .explain {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--text-dim);
  }
</style>
