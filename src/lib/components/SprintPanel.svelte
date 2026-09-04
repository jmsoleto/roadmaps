<script lang="ts">
  /**
   * El panel de un sprint: qué cae dentro y quién lo lleva.
   *
   * Componente propio y no una quinta rama de `Drawer.svelte`, que ya pasa de
   * las 1150 líneas repartiendo cuatro paneles distintos (D10).
   *
   * No calcula nada: recibe la carga ya hecha del Gantt, que es quien la usa
   * también para apagar las filas que no participan. Un solo cálculo, para que
   * no puedan existir dos respuestas a «¿participa esto?» (D11).
   *
   * Todo lo que rotula habla de **ocupación de calendario** y nunca de esfuerzo
   * ni de capacidad (D12): en cuántos días laborables coinciden un item y el
   * sprint es algo que la aplicación sabe; lo que cuesta de verdad ese item, no.
   */
  import { ui } from '../store/ui.svelte';
  import { theme } from '../theme/theme.svelte';
  import { fmtDate } from '../time/timeline';
  import { getInitials } from '../util/assignees';
  import type { SprintLoad } from '../model/sprint-load';

  const { load }: { load: SprintLoad } = $props();

  const people = $derived(load.byAssignee.filter((r) => r.assigneeId !== null).length);

  /** Cuánto de la barra llena alguien. Se satura al 100%: pasarse ya lo dice el aviso. */
  const fill = (days: number) =>
    load.capacity === 0 ? 0 : Math.min(days / load.capacity, 1) * 100;

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
</script>

<!-- «Ocupación» y no «carga» tampoco aquí: el nombre accesible del panel es una
     etiqueta más, y la promesa tiene que ser la misma se lea como se lea (D12). -->
<aside class="drawer show" aria-label="Ocupación del sprint {load.num}">
  <div class="drawer-head">
    <div class="drawer-title">SPRINT {String(load.num).padStart(2, '0')}</div>
    <button
      type="button"
      class="drawer-close"
      title="soltar el sprint"
      aria-label="soltar el sprint"
      onclick={() => ui.clearSprint()}>✕</button
    >
  </div>

  <div class="section">
    <div class="meta">{fmtDate(load.start)} → {fmtDate(load.end)}</div>
    <!-- Los días laborables del sprint completo, no los que esta ventana deje
         ver: el mismo sprint vale lo mismo en todos los roadmaps (D5). -->
    <p class="hint sm">
      {plural(load.capacity, 'día laborable', 'días laborables')} · {plural(
        people,
        'persona',
        'personas',
      )} · {plural(load.itemCount, 'item', 'items')}
      {#if load.completedCount > 0}
        · {load.completedCount} {load.completedCount === 1 ? 'cerrado' : 'cerrados'}
      {/if}
    </p>
  </div>

  {#if load.itemCount === 0}
    <!-- Un sprint vacío se dice, no se finge con un reparto de cero personas. -->
    <p class="empty">
      No hay nada dentro de este sprint. Ninguna fase de este roadmap tiene trabajo entre el {fmtDate(
        load.start,
      )} y el {fmtDate(load.end)}.
    </p>
  {:else}
    <div class="section">
      <span class="label">Días laborables ocupados</span>
      {#each load.byAssignee as row (row.assigneeId ?? '—')}
        <div class="who" class:orphan={row.assigneeId === null}>
          <div class="who-head">
            {#if row.colorSlot !== null}
              <span
                class="badge"
                style:background={theme.slotColor(row.colorSlot)}
                style:--bar-ink={theme.inkFor(row.colorSlot)}>{getInitials(row.name)}</span
              >
            {:else}
              <span class="badge none" title="trabajo sin responsable">?</span>
            {/if}
            <span class="who-name">{row.name}</span>
            <!-- La rejilla pinta el badge del item y solo el del item, así que un
                 responsable heredado de la fase aparece aquí y no allí. Se dice,
                 para que la diferencia no haya que descubrirla. -->
            {#if row.anyInherited}
              <span class="tag" title="alguno de sus items hereda el responsable de su fase"
                >heredado</span
              >
            {/if}
            <span class="who-days" class:over={row.over}
              >{row.days} <span class="of">/ {load.capacity} d</span></span
            >
          </div>
          <div class="track" role="presentation">
            <div class="fill" class:over={row.over} style:width="{fill(row.days)}%"></div>
          </div>
          {#if row.over}
            <p class="warn">
              Ocupa {row.days} días laborables en un sprint de {load.capacity}: hay solape entre sus
              {plural(row.itemCount, 'item', 'items')}.
            </p>
          {/if}
        </div>
      {/each}
    </div>

    <div class="section">
      <span class="label">Trabajo dentro del sprint</span>
      {#each load.phases as ph (ph.phaseId)}
        <div class="phase">
          <div class="phase-head">
            <span class="dot" style:background={theme.slotColor(ph.colorSlot)}></span>
            <span class="phase-name">{ph.name}</span>
          </div>
          {#each ph.items as it (it.itemId)}
            <!-- Abrir el detalle desde aquí tapa este panel pero no toca el foco:
                 el velo sigue puesto y al cerrar el detalle el panel vuelve donde
                 estaba (D10). -->
            <button
              type="button"
              class="item"
              class:done={it.completed}
              onclick={() => ui.openDetail(it.phaseId, it.itemId)}
            >
              <span class="item-glyph">{it.isMilestone ? '◆' : '▬'}</span>
              <span class="item-label">{it.label}</span>
              {#if it.inherited}
                <span class="tag" title="responsable heredado de la fase">heredado</span>
              {/if}
              {#if it.offWindow}
                <span
                  class="tag"
                  title="está en el sprint, pero fuera de la ventana temporal visible"
                  >fuera de la vista</span
                >
              {/if}
              {#if it.completed}<span class="tag done-tag">cerrado</span>{/if}
              <span class="item-days">{it.days} d</span>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Lo que el número no dice, dicho donde se lee el número. -->
  <p class="hint foot">
    Mide ocupación de calendario: los días laborables en que un item y el sprint coinciden. No es
    una estimación de esfuerzo, que es algo que esta aplicación no sabe. Laborable es de lunes a
    viernes; no se descuentan festivos.
  </p>
</aside>

<style>
  /* La misma caja que `Drawer.svelte`, porque es el mismo sitio de la pantalla y
     tiene que sentirse el mismo panel. Sin transición de entrada: el drawer
     desliza porque tapa lo que había, y este aparece con el foco, a la vez que
     la banda. */
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 420px;
    height: 100vh;
    background: var(--surface);
    border-left: 1px solid var(--line);
    z-index: 50;
    padding: 20px 22px;
    overflow-y: auto;
    box-sizing: border-box;
    box-shadow: -20px 0 40px var(--shadow-medium);
  }
  .drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .drawer-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.14em;
    color: var(--accent);
    font-weight: 600;
  }
  .drawer-close {
    cursor: pointer;
    color: var(--text-dim);
    font-size: 18px;
    line-height: 1;
    padding: 4px 6px;
    border-radius: 4px;
    background: none;
    border: none;
  }
  .drawer-close:hover {
    color: var(--danger);
    background: var(--surface-2);
  }
  .section {
    margin-bottom: 18px;
  }
  .label {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 9px;
  }
  .meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--text);
  }
  .hint {
    font-size: 11.5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    line-height: 1.5;
    margin: 0 0 14px;
  }
  .hint.sm {
    margin: 6px 0 0;
    font-size: 11px;
  }
  .hint.foot {
    margin: 22px 0 0;
    padding-top: 12px;
    border-top: 1px solid var(--line-weak);
    font-family: 'Inter', sans-serif;
    font-size: 11.5px;
  }
  .empty {
    font-size: 13px;
    color: var(--text-mid);
    line-height: 1.5;
    margin: 0 0 4px;
  }

  /* ---- el reparto ---- */
  .who {
    margin-bottom: 13px;
  }
  .who-head {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 5px;
  }
  .badge {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 600;
    color: var(--bar-ink);
    flex-shrink: 0;
  }
  /* El trabajo sin responsable no toma prestado el color de nadie: no es una
     persona más al final de la lista, es una pregunta sin respuesta. */
  .badge.none {
    background: transparent;
    border: 1px dashed var(--line);
    color: var(--text-dim);
  }
  .who-name {
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who.orphan .who-name {
    color: var(--text-mid);
    font-style: italic;
  }
  .who-days {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--text);
    flex-shrink: 0;
  }
  .who-days .of {
    color: var(--text-dim);
    font-size: 11px;
  }
  .who-days.over {
    color: var(--danger);
    font-weight: 700;
  }
  .track {
    height: 6px;
    border-radius: 3px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--accent);
  }
  .fill.over {
    background: var(--danger);
  }
  .warn {
    margin: 5px 0 0;
    font-size: 11.5px;
    line-height: 1.45;
    color: var(--danger);
  }

  /* ---- los items, por fase ---- */
  .phase {
    margin-bottom: 12px;
  }
  .phase-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    flex-shrink: 0;
    border: var(--line-width) solid var(--bar-border);
  }
  .phase-name {
    font-size: 12px;
    color: var(--text-mid);
    font-weight: 600;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 5px 7px 5px 15px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 12.5px;
    text-align: left;
    cursor: pointer;
  }
  .item:hover {
    background: var(--hover);
  }
  /* Cerrado, no ausente: un sprint pasado se mide igual que uno que viene, así
     que el item sigue ahí y sigue sumando, solo que más bajo de tono. */
  .item.done {
    opacity: 0.55;
  }
  .item-glyph {
    color: var(--text-dim);
    font-size: 9px;
    flex-shrink: 0;
  }
  .item-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item-days {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9.5px;
    letter-spacing: 0.04em;
    color: var(--text-dim);
    border: 1px solid var(--line);
    border-radius: 3px;
    padding: 1px 4px;
    flex-shrink: 0;
    cursor: help;
  }
  .done-tag {
    cursor: default;
  }
</style>
