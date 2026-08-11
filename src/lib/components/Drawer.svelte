<script lang="ts">
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import { fmtDate } from '../time/timeline';
  import { effectiveStart, effectiveEnd } from '../model/derive';
  import { wouldCreateCycle } from '../model/constraints';
  import { findBlocker } from '../model/blockers';
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
        : drawer.kind === 'blockers'
          ? 'DEPENDENCIAS EXTERNAS'
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

  // ---- blockers ----

  // Deleting a catalog entry destroys hand-written feature names across every
  // roadmap, so the confirmation carries the reach (D7). Two steps like the
  // assignee list, but never silent about what goes.
  let confirmDelBlocker = $state<string | null>(null);
  function delBlocker(id: string) {
    if (confirmDelBlocker !== id) {
      confirmDelBlocker = id;
      return;
    }
    confirmDelBlocker = null;
    store.deleteBlocker(id);
  }

  $effect(() => {
    if (confirmDelBlocker === null) return;
    const cancel = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-blocker-del]')) return;
      confirmDelBlocker = null;
    };
    window.addEventListener('pointerdown', cancel, true);
    return () => window.removeEventListener('pointerdown', cancel, true);
  });

  /** Blockers not yet assigned to this item, offered in the "add" picker. */
  const blockerCandidates = $derived(item ? store.data.blockers : []);

  // The feature typed for the new assignment, and which blocker it is for. Kept
  // together so switching blocker re-targets the suggestions without stale text.
  let newBlockerId = $state('');
  let newFeature = $state('');
  const featureOptions = $derived(
    newBlockerId ? store.blockerFeatureSuggestions(newBlockerId) : [],
  );

  function addBlockerToItem() {
    if (!phase || !item || !newBlockerId) return;
    store.addItemBlocker(phase.id, item.id, newBlockerId, newFeature.trim());
    newBlockerId = '';
    newFeature = '';
  }

  // The assignment whose resolution just offered to spread, and how far it
  // reaches. Cleared on any other action so a stale offer can never fire (D3).
  let spread = $state<{ assignmentId: string; count: number } | null>(null);

  function toggleResolved(assignmentId: string, resolved: boolean) {
    if (!phase || !item) return;
    store.setItemBlockerResolved(phase.id, item.id, assignmentId, resolved);
    const a = item.blockers.find((x) => x.id === assignmentId);
    // Only ever offered on resolve: propagating "blocked again" into roadmaps
    // the user isn't looking at is a bigger move than the one they made.
    if (resolved && a) {
      const count = store.unresolvedEquivalents(a.blockerId, a.feature, a.id);
      spread = count > 0 ? { assignmentId, count } : null;
    } else {
      spread = null;
    }
  }

  function applySpread(blockerId: string, feature: string) {
    store.resolveEquivalentBlockers(blockerId, feature);
    spread = null;
  }

  // A different item means a different set of assignments; an offer aimed at the
  // previous one must not survive the switch.
  $effect(() => {
    void drawer;
    spread = null;
    newBlockerId = '';
    newFeature = '';
  });
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
  {:else if drawer.kind === 'blockers'}
    <div class="drawer-head">
      <div class="drawer-title">{title}</div>
      <button type="button" class="drawer-close" onclick={() => ui.closeDrawer()}>✕</button>
    </div>
    <p class="hint">
      Una dependencia externa es algo ajeno al roadmap que impide completar un item. El catálogo es
      compartido entre todos tus roadmaps: dala de alta una vez y asígnala donde haga falta.
    </p>
    <div class="blockers-list">
      {#each store.data.blockers as b (b.id)}
        {@const usage = store.blockerUsage(b.id)}
        <div class="blocker-card">
          <div class="blocker-row">
            <input
              class="name-input strong"
              value={b.name}
              placeholder="nombre de la dependencia"
              oninput={(e) => store.updateBlocker(b.id, { name: e.currentTarget.value })}
            />
            <button
              type="button"
              class="del"
              class:confirm={confirmDelBlocker === b.id}
              data-blocker-del
              onclick={() => delBlocker(b.id)}
              title="borrar dependencia externa"
              >{confirmDelBlocker === b.id
                ? usage > 0
                  ? `borrar? (${usage} item${usage === 1 ? '' : 's'})`
                  : 'borrar?'
                : '✕'}</button
            >
          </div>
          <div class="blocker-fields">
            <input
              class="sub-input"
              value={b.owner}
              placeholder="responsable"
              oninput={(e) => store.updateBlocker(b.id, { owner: e.currentTarget.value })}
            />
            <input
              class="sub-input"
              type="email"
              value={b.email}
              placeholder="correo (opcional)"
              oninput={(e) => store.updateBlocker(b.id, { email: e.currentTarget.value })}
            />
          </div>
          {#if usage > 0}
            <div class="blocker-usage">afecta a {usage} item{usage === 1 ? '' : 's'}</div>
          {/if}
        </div>
      {:else}
        <div class="empty-msg">Aún no hay dependencias externas. Añade una para empezar.</div>
      {/each}
    </div>
    <button type="button" class="add-assignee" onclick={() => store.addBlocker()}
      >+ añadir dependencia externa</button
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

      <!-- Separate from "Depende de" above, and deliberately different in shape:
           that one moves dates between items of this phase, this one records
           something outside the roadmap that stops the work finishing. -->
      <div class="section blockers-section">
        <span class="label">Dependencias externas</span>
        <div class="blk-list">
          {#each item.blockers as a (a.id)}
            {@const b = findBlocker(store.data.blockers, a.blockerId)}
            <div class="blk" class:resolved={a.resolved}>
              <label class="blk-check">
                <input
                  type="checkbox"
                  checked={a.resolved}
                  onchange={(e) => toggleResolved(a.id, e.currentTarget.checked)}
                />
                <span class="blk-body">
                  <span class="blk-name">{b ? b.name : '—'}</span>
                  <span class="blk-feature">{a.feature || 'sin funcionalidad indicada'}</span>
                  {#if b}
                    <span class="blk-owner"
                      >{b.owner || 'sin responsable'}{b.email ? ` · ${b.email}` : ''}</span
                    >
                  {/if}
                </span>
              </label>
              <button
                type="button"
                class="blk-del"
                title="retirar dependencia externa"
                onclick={() => store.removeItemBlocker(phase.id, item.id, a.id)}>✕</button
              >
            </div>
            {#if spread && spread.assignmentId === a.id}
              <div class="blk-spread">
                <span>sin resolver en {spread.count} item{spread.count === 1 ? '' : 's'} más</span>
                <button type="button" onclick={() => applySpread(a.blockerId, a.feature)}
                  >marcar todas</button
                >
              </div>
            {/if}
          {/each}
        </div>

        {#if store.data.blockers.length > 0}
          <div class="blk-add">
            <select
              class="select"
              value={newBlockerId}
              onchange={(e) => {
                newBlockerId = e.currentTarget.value;
                newFeature = '';
              }}
            >
              <option value="">+ añadir dependencia externa…</option>
              {#each blockerCandidates as b (b.id)}
                <option value={b.id}>{b.name}{b.owner ? ` · ${b.owner}` : ''}</option>
              {/each}
            </select>
            {#if newBlockerId}
              <input
                class="input"
                list="blk-features"
                placeholder="¿qué se espera? p. ej. formulario de compra"
                value={newFeature}
                oninput={(e) => (newFeature = e.currentTarget.value)}
                onkeydown={(e) => e.key === 'Enter' && addBlockerToItem()}
              />
              <!-- Suggestions are the feature names already recorded against this
                   blocker anywhere in the app: nudges toward one wording without
                   preventing a new one (D3). -->
              <datalist id="blk-features">
                {#each featureOptions as f (f)}
                  <option value={f}></option>
                {/each}
              </datalist>
              <button type="button" class="btn-wide" onclick={addBlockerToItem}>añadir</button>
            {/if}
          </div>
        {/if}

        <button type="button" class="link" onclick={() => ui.openBlockers()}
          >gestionar dependencias externas →</button
        >
        <div class="hint sm">
          no cambian las fechas: marcan que el item no puede cerrarse hasta que lleguen
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

  /* ---- blockers ---- */

  .blockers-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .blocker-card {
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .blocker-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .name-input.strong {
    font-weight: 600;
  }
  .blocker-fields {
    display: flex;
    gap: 7px;
  }
  .sub-input {
    flex: 1;
    min-width: 0;
    background: var(--surface-2);
    border: 1px solid var(--line);
    color: var(--text-mid);
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 12.5px;
    outline: none;
  }
  .sub-input:focus {
    border-color: var(--accent);
  }
  .blocker-usage {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }

  /* Both sections now carry the word "dependencia", so the separation has to do
     more work than a hairline: a full rule and real breathing room, backed by
     the two hint texts, which say opposite things — one moves dates, the other
     explicitly does not. */
  .blockers-section {
    border-top: 1px solid var(--line);
    padding-top: 18px;
    margin-top: 22px;
  }
  .blk-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
  }
  .blk {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 7px 9px;
  }
  /* Resolved stays on the list as a record of who blocked what (D4) — dimmed,
     not removed. */
  .blk.resolved {
    opacity: 0.6;
  }
  .blk.resolved .blk-feature {
    text-decoration: line-through;
  }
  .blk-check {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
  }
  .blk-check input {
    margin-top: 2px;
    accent-color: var(--accent);
    flex-shrink: 0;
  }
  .blk-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .blk-name {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
  }
  .blk-feature {
    font-size: 12.5px;
    color: var(--text-mid);
  }
  .blk-owner {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    color: var(--text-dim);
  }
  .blk-del {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0 2px;
    flex-shrink: 0;
  }
  .blk-del:hover {
    color: var(--danger);
  }
  .blk-spread {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: -2px 0 2px 9px;
    padding: 5px 8px;
    border-left: 2px solid var(--accent);
    background: var(--wash-accent);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-mid);
  }
  .blk-spread button {
    background: none;
    border: none;
    color: var(--accent);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    white-space: nowrap;
  }
  .blk-add {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
