<script lang="ts">
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import { fmtDate } from '../time/timeline';
  import { effectiveStart, effectiveEnd } from '../model/derive';
  import { wouldCreateCycle } from '../model/constraints';
  import { getInitials } from '../util/assignees';
  import { theme } from '../theme/theme.svelte';
  import ThemeEditor from './ThemeEditor.svelte';

  const drawer = $derived(ui.drawer);
  const rm = $derived(store.activeRoadmap);

  const phase = $derived(
    drawer.kind === 'detail' ? rm?.rows.find((p) => p.id === drawer.phaseId) : undefined,
  );
  const item = $derived(
    drawer.kind === 'detail' && drawer.itemId
      ? phase?.children.find((c) => c.id === drawer.itemId)
      : undefined,
  );

  const isItem = $derived(!!item);
  const title = $derived(
    drawer.kind === 'theme'
      ? 'TEMA'
      : drawer.kind === 'assignees'
        ? 'RESPONSABLES'
        : item
          ? item.isMilestone
            ? 'DETALLE DE HITO'
            : 'DETALLE DE ITEM'
          : 'DETALLE DE FASE',
  );

  const rangeText = $derived.by(() => {
    if (!phase) return '';
    if (item)
      return item.isMilestone
        ? `◆ ${fmtDate(item.startDate)}`
        : `${fmtDate(item.startDate)} → ${fmtDate(item.endDate)}`;
    const s = effectiveStart(phase);
    const e = effectiveEnd(phase);
    return s && e ? `${fmtDate(s)} → ${fmtDate(e)}` : 'sin fechas';
  });

  const depCandidates = $derived.by(() => {
    if (!phase || !item) return [];
    return phase.children.filter(
      (c) =>
        c.id !== item.id && !item.dependsOn.includes(c.id) && !wouldCreateCycle(phase, item, c),
    );
  });

  const name = $derived(item ? item.label : (phase?.name ?? ''));
  const assigneeId = $derived((item ? item.assigneeId : phase?.assigneeId) ?? '');
  const notes = $derived((item ? item.notes : phase?.notes) ?? '');

  function setName(v: string) {
    if (!phase) return;
    if (item) store.renameItem(phase.id, item.id, v);
    else store.renamePhase(phase.id, v);
  }
  function setAssignee(v: string) {
    if (phase) store.setAssignee(phase.id, item ? item.id : null, v || null);
  }
  function setNotes(v: string) {
    if (phase) store.setNotes(phase.id, item ? item.id : null, v);
  }

  let confirmDelAssignee = $state<string | null>(null);
  function delAssignee(id: string) {
    if (confirmDelAssignee !== id) {
      confirmDelAssignee = id;
      return;
    }
    confirmDelAssignee = null;
    store.deleteAssignee(id);
  }
</script>

<div
  class="backdrop"
  class:show={drawer.kind !== 'none'}
  onclick={() => ui.closeDrawer()}
  role="presentation"
></div>

<div class="drawer" class:show={drawer.kind !== 'none'}>
  {#if drawer.kind === 'theme'}
    <div class="drawer-head">
      <div class="drawer-title">{title}</div>
      <button type="button" class="drawer-close" onclick={() => ui.closeDrawer()}>✕</button>
    </div>
    <ThemeEditor />
  {:else if drawer.kind === 'assignees'}
    <div class="drawer-head">
      <div class="drawer-title">{title}</div>
      <button type="button" class="drawer-close" onclick={() => ui.closeDrawer()}>✕</button>
    </div>
    <p class="hint">
      Este catálogo es compartido entre todos tus roadmaps. Los responsables aparecen como badge en
      cada barra.
    </p>
    <div class="assignees-list">
      {#each store.data.assignees as a (a.id)}
        <div class="assignee-row">
          <button
            type="button"
            class="swatch"
            style:background={theme.slotColor(a.colorSlot)}
            style:--bar-ink={theme.inkFor(a.colorSlot)}
            onclick={() => store.cycleAssigneeColor(a.id)}
            title="click para cambiar color">{getInitials(a.name)}</button
          >
          <input
            class="name-input"
            value={a.name}
            oninput={(e) => store.renameAssignee(a.id, e.currentTarget.value)}
          />
          <button
            type="button"
            class="del"
            class:confirm={confirmDelAssignee === a.id}
            onclick={() => delAssignee(a.id)}
            >{confirmDelAssignee === a.id ? 'borrar?' : '✕'}</button
          >
        </div>
      {:else}
        <div class="empty-msg">Aún no hay responsables. Añade uno para empezar.</div>
      {/each}
    </div>
    <button type="button" class="add-assignee" onclick={() => store.addAssignee()}
      >+ añadir responsable</button
    >
  {:else if drawer.kind === 'detail' && phase}
    <div class="drawer-head">
      <div class="drawer-title">{title}</div>
      <button type="button" class="drawer-close" onclick={() => ui.closeDrawer()}>✕</button>
    </div>

    <div class="section">
      <label class="label" for="dName">Nombre</label>
      <input
        id="dName"
        class="input"
        value={name}
        oninput={(e) => setName(e.currentTarget.value)}
      />
    </div>

    <div class="section"><div class="meta">📅 {rangeText}</div></div>

    <div class="section">
      <label class="label" for="dAssignee">Responsable</label>
      <select
        id="dAssignee"
        class="select"
        value={assigneeId}
        onchange={(e) => setAssignee(e.currentTarget.value)}
      >
        <option value="">— sin asignar —</option>
        {#each store.data.assignees as a (a.id)}
          <option value={a.id}>{a.name}</option>
        {/each}
      </select>
      <button type="button" class="link" onclick={() => ui.openAssignees()}
        >gestionar responsables →</button
      >
    </div>

    {#if isItem && item}
      <div class="section">
        <label class="label" for="dAddDep">Depende de</label>
        <div class="deps-list">
          {#each item.dependsOn as depId (depId)}
            {@const dep = phase.children.find((c) => c.id === depId)}
            <div class="dep-chip">
              <span>{dep ? dep.label : depId}</span>
              <button type="button" onclick={() => store.removeDependency(phase.id, item.id, depId)}
                >✕</button
              >
            </div>
          {/each}
        </div>
        <select
          id="dAddDep"
          class="select"
          value=""
          onchange={(e) => {
            if (e.currentTarget.value)
              store.addDependency(phase.id, item.id, e.currentTarget.value);
            e.currentTarget.value = '';
          }}
        >
          <option value="">+ añadir dependencia…</option>
          {#each depCandidates as c (c.id)}
            <option value={c.id}>{c.label}</option>
          {/each}
        </select>
        <div class="hint sm">
          {item.isMilestone
            ? 'este hito ocurre cuando terminen todas sus dependencias'
            : 'este item empieza cuando terminen todas sus dependencias'}
        </div>
      </div>
    {/if}

    <div class="section">
      <label class="label" for="dNotes">Notas</label>
      <textarea
        id="dNotes"
        class="textarea"
        placeholder="anota dependencias, riesgos, contexto…"
        value={notes}
        oninput={(e) => setNotes(e.currentTarget.value)}
      ></textarea>
    </div>

    {#if isItem && item}
      <div class="section">
        <button
          type="button"
          class="btn-wide"
          onclick={() => store.toggleMilestone(phase.id, item.id)}
        >
          {item.isMilestone
            ? '→ convertir en item con duración'
            : '→ convertir en hito (fecha única)'}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--scrim);
    z-index: 49;
    display: none;
  }
  .backdrop.show {
    display: block;
  }
  .drawer {
    position: fixed;
    top: 0;
    right: -460px;
    width: 420px;
    height: 100vh;
    background: var(--surface);
    border-left: 1px solid var(--line);
    z-index: 50;
    transition: right 0.22s ease;
    padding: 20px 22px;
    overflow-y: auto;
    box-shadow: -20px 0 40px var(--shadow-medium);
  }
  .drawer.show {
    right: 0;
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
    margin-bottom: 7px;
  }
  .input,
  .textarea,
  .select {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--line);
    color: var(--text);
    padding: 9px 11px;
    border-radius: 5px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
  }
  .input:focus,
  .textarea:focus,
  .select:focus {
    border-color: var(--accent);
  }
  .textarea {
    min-height: 90px;
    resize: vertical;
  }
  .meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--text);
  }
  .link {
    display: inline-block;
    margin-top: 8px;
    color: var(--accent);
    font-size: 12px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: 'IBM Plex Mono', monospace;
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
  .deps-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
  }
  .dep-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
  }
  .dep-chip button {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0;
  }
  .dep-chip button:hover {
    color: var(--danger);
  }
  .btn-wide {
    width: 100%;
    padding: 8px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    border-radius: 6px;
    cursor: pointer;
  }
  .btn-wide:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .assignees-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .assignee-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 6px;
    border: 1px solid transparent;
  }
  .assignee-row:hover {
    border-color: var(--line);
  }
  .swatch {
    width: 34px;
    height: 34px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 600;
    color: var(--bar-ink);
    cursor: pointer;
    border: none;
    flex-shrink: 0;
  }
  .name-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text);
    font-size: 14px;
    outline: none;
    min-width: 0;
  }
  .del {
    cursor: pointer;
    color: var(--text-dim);
    padding: 4px 8px;
    border-radius: 4px;
    background: none;
    border: none;
  }
  .del:hover {
    color: var(--danger);
    background: var(--tint-danger);
  }
  .del.confirm {
    color: var(--ink-on-danger);
    background: var(--danger);
    font-size: 10px;
    font-family: 'IBM Plex Mono', monospace;
  }
  .add-assignee {
    display: block;
    width: 100%;
    margin-top: 10px;
    padding: 9px;
    border: 1px dashed var(--line);
    background: none;
    color: var(--text-dim);
    border-radius: 6px;
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
  }
  .add-assignee:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .empty-msg {
    color: var(--text-dim);
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', monospace;
  }
</style>
