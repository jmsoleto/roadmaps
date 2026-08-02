<script lang="ts">
  import { theme } from '../theme/theme.svelte';
  import { PRESETS, PALETTE_PRESETS } from '../theme/presets';
  import { deriveDefaults } from '../theme/resolve';
  import { auditTheme, floorFor } from '../theme/audit';
  import { exportTheme, parseThemeImport } from '../io/theme-portability';
  import {
    BASE_TOKENS,
    BASE_LABELS,
    DERIVED_TOKENS,
    type BaseToken,
    type DerivedToken,
  } from '../theme/tokens';

  const draft = $derived(theme.draft);
  const editing = $derived(!!draft);
  /** Computed values of the derived tokens, so a pinned one can show its default. */
  const defaults = $derived(deriveDefaults(theme.active.base));
  const checks = $derived(auditTheme(theme.active));
  const failures = $derived(checks.filter((c) => !c.passes));

  let showAdvanced = $state(false);
  let showContrast = $state(false);
  let confirmDel = $state<string | null>(null);
  let fileInput: HTMLInputElement;
  let importError = $state<string | null>(null);

  function setBase(token: BaseToken, value: string) {
    theme.edit((d) => (d.base[token] = value));
  }
  function setOverride(token: DerivedToken, value: string) {
    theme.edit((d) => (d.overrides[token] = value));
  }
  function resetOverride(token: DerivedToken) {
    theme.edit((d) => delete d.overrides[token]);
  }
  function setSlot(slot: number, value: string) {
    theme.edit((d) => (d.barPalette[slot] = value));
  }
  function usePalette(colors: string[]) {
    theme.edit((d) => (d.barPalette = [...colors]));
  }
  function setGeometry(key: 'lineWidth' | 'focusRing' | 'barRadius', value: number) {
    theme.edit((d) => (d.geometry[key] = value));
  }

  function remove(id: string) {
    if (confirmDel !== id) {
      confirmDel = id;
      return;
    }
    confirmDel = null;
    theme.remove(id);
  }

  function download() {
    const t = theme.active;
    const json = exportTheme(t);
    const name = t.name.replace(/[^\w.-]+/g, '_');
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      importError = null;
      theme.add(parseThemeImport(await file.text()));
    } catch (err) {
      importError = err instanceof Error ? err.message : 'No se pudo importar el tema.';
      setTimeout(() => (importError = null), 4000);
    }
  }
</script>

<div class="section">
  <span class="label">Temas</span>
  <div class="theme-list">
    {#each theme.all as t (t.id)}
      <div class="theme-row" class:active={t.id === theme.activeId}>
        <button type="button" class="theme-pick" onclick={() => theme.select(t.id)}>
          <span class="swatches">
            {#each t.barPalette.slice(0, 5) as c, i (i)}
              <span class="mini" style:background={c}></span>
            {/each}
          </span>
          <span class="theme-name">{t.name}</span>
          {#if t.builtin}<span class="badge">fijo</span>{/if}
        </button>
        {#if !t.builtin}
          <button
            type="button"
            class="del"
            class:confirm={confirmDel === t.id}
            onclick={() => remove(t.id)}>{confirmDel === t.id ? 'borrar?' : '✕'}</button
          >
        {/if}
      </div>
    {/each}
  </div>
  <p class="hint">
    Los {PRESETS.length} temas fijos no se editan. Para partir de uno, duplícalo.
  </p>
</div>

{#if !editing}
  <div class="actions">
    <button type="button" class="btn" onclick={() => theme.beginEdit()}>editar</button>
    <button type="button" class="btn" onclick={() => theme.duplicate()}>duplicar</button>
    <button type="button" class="btn" onclick={() => fileInput.click()}>↓ importar</button>
    <button type="button" class="btn" onclick={download}>↑ exportar</button>
  </div>
  {#if importError}<p class="error">{importError}</p>{/if}
{/if}

<input
  bind:this={fileInput}
  type="file"
  accept="application/json,.json"
  class="hidden-file"
  onchange={onImportFile}
/>

{#if draft}
  <div class="section">
    <span class="label">Nombre</span>
    <input
      class="input"
      value={draft.name}
      oninput={(e) => theme.edit((d) => (d.name = e.currentTarget.value))}
    />
  </div>

  <div class="section">
    <span class="label">Colores base</span>
    <p class="hint">
      Con estos ocho se calcula el resto de la interfaz. Cámbialos y todo lo demás sigue.
    </p>
    {#each BASE_TOKENS as token (token)}
      <div class="token-row">
        <input
          type="color"
          class="picker"
          value={draft.base[token]}
          oninput={(e) => setBase(token, e.currentTarget.value)}
          aria-label={BASE_LABELS[token]}
        />
        <span class="token-name">{BASE_LABELS[token]}</span>
        <code class="value">{draft.base[token]}</code>
      </div>
    {/each}
  </div>

  <div class="section">
    <span class="label">Paleta de barras</span>
    <div class="palette-presets">
      {#each PALETTE_PRESETS as p (p.id)}
        <button type="button" class="btn small" onclick={() => usePalette(p.colors)}
          >{p.name}</button
        >
      {/each}
    </div>
    <div class="slots">
      {#each draft.barPalette as slotColor, slot (slot)}
        <input
          type="color"
          class="slot"
          value={slotColor}
          oninput={(e) => setSlot(slot, e.currentTarget.value)}
          aria-label="Color {slot + 1}"
        />
      {/each}
    </div>
  </div>

  <div class="section">
    <span class="label">Geometría</span>
    <div class="token-row">
      <span class="token-name">Grosor de línea</span>
      <input
        type="number"
        class="num"
        min="1"
        max="4"
        value={draft.geometry.lineWidth}
        oninput={(e) => setGeometry('lineWidth', Number(e.currentTarget.value))}
      />
    </div>
    <div class="token-row">
      <span class="token-name">Anillo de foco</span>
      <input
        type="number"
        class="num"
        min="1"
        max="6"
        value={draft.geometry.focusRing}
        oninput={(e) => setGeometry('focusRing', Number(e.currentTarget.value))}
      />
    </div>
    <div class="token-row">
      <span class="token-name">Redondeo de barras</span>
      <input
        type="number"
        class="num"
        min="0"
        max="18"
        value={draft.geometry.barRadius}
        oninput={(e) => setGeometry('barRadius', Number(e.currentTarget.value))}
      />
    </div>
  </div>

  <div class="section">
    <button type="button" class="disclosure" onclick={() => (showAdvanced = !showAdvanced)}>
      {showAdvanced ? '▾' : '▸'} Avanzado · {DERIVED_TOKENS.length} colores calculados
    </button>
    {#if showAdvanced}
      <p class="hint">
        Se calculan a partir de los colores base. Si tocas uno, deja de seguirlos hasta que lo
        restablezcas.
      </p>
      {#each DERIVED_TOKENS as token (token)}
        {@const pinned = draft.overrides[token]}
        <div class="token-row">
          <span class="chip" style:background={pinned ?? defaults[token]}></span>
          <span class="token-name" class:pinned={!!pinned}>{token}</span>
          <input
            class="value-input"
            value={pinned ?? defaults[token]}
            oninput={(e) => setOverride(token, e.currentTarget.value)}
          />
          {#if pinned}
            <button
              type="button"
              class="reset"
              title="volver al valor calculado"
              onclick={() => resetOverride(token)}>↺</button
            >
          {/if}
        </div>
      {/each}
    {/if}
  </div>
{/if}

<div class="section">
  <button type="button" class="disclosure" onclick={() => (showContrast = !showContrast)}>
    {showContrast ? '▾' : '▸'} Contraste
    {#if failures.length}
      <span class="warn-count">{failures.length}</span>
    {:else}
      <span class="ok-count">✓</span>
    {/if}
  </button>
  {#if showContrast}
    <p class="hint">Objetivo de este tema: {floorFor(theme.active)}:1.</p>
    {#each checks as c (c.label)}
      <div class="check" class:fail={!c.passes}>
        <span class="sample" style:background={c.bg} style:color={c.fg}>Aa</span>
        <span class="check-label">{c.label}</span>
        <span class="ratio">{c.ratio.toFixed(2)}:1</span>
      </div>
    {/each}
  {:else if failures.length}
    <p class="warn">
      {failures.length}
      {failures.length === 1 ? 'par no alcanza' : 'pares no alcanzan'} el contraste objetivo.
    </p>
  {/if}
</div>

{#if editing}
  <div class="actions sticky">
    <button type="button" class="btn primary" onclick={() => theme.save()}>guardar</button>
    <button type="button" class="btn" onclick={() => theme.cancel()}>cancelar</button>
  </div>
{/if}

<style>
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
  .hint {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.5;
    margin: 0 0 10px;
  }
  .theme-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .theme-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .theme-pick {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--surface-2);
    border: var(--line-width) solid transparent;
    color: var(--text);
    cursor: pointer;
    font-size: 13px;
    text-align: left;
  }
  .theme-row.active .theme-pick {
    border-color: var(--accent);
    background: var(--tint-accent);
  }
  .swatches {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }
  .mini {
    width: 8px;
    height: 16px;
    border-radius: 2px;
  }
  .theme-name {
    flex: 1;
  }
  .badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: var(--text-dim);
    border: var(--line-width) solid var(--line);
    border-radius: 4px;
    padding: 1px 5px;
  }
  .del {
    background: none;
    border: var(--line-width) solid var(--line);
    color: var(--text-dim);
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    padding: 4px 7px;
  }
  .del.confirm {
    background: var(--danger);
    color: var(--ink-on-danger);
    border-color: var(--danger);
  }
  .actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .actions.sticky {
    position: sticky;
    bottom: 0;
    background: var(--surface);
    padding: 10px 0;
    border-top: var(--line-width) solid var(--line);
  }
  .btn {
    background: none;
    border: var(--line-width) dashed var(--line);
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    border-radius: 6px;
    height: 30px;
    padding: 0 11px;
    cursor: pointer;
  }
  .btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .btn.small {
    height: 26px;
    font-size: 11px;
  }
  .btn.primary {
    background: var(--accent);
    color: var(--ink-on-accent);
    border-style: solid;
    border-color: var(--accent);
    font-weight: 600;
  }
  .input,
  .value-input {
    width: 100%;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    color: var(--text);
    padding: 8px 10px;
    border-radius: 5px;
    font-size: 13px;
    outline: none;
  }
  .token-row {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 6px;
  }
  .token-name {
    flex: 1;
    font-size: 12.5px;
  }
  .token-name.pinned {
    color: var(--accent);
  }
  .value,
  .ratio {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .value-input {
    flex: 1;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    padding: 5px 7px;
  }
  .picker,
  .slot {
    width: 30px;
    height: 26px;
    padding: 0;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    background: none;
    cursor: pointer;
    flex-shrink: 0;
  }
  .chip {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: var(--line-width) solid var(--line);
    flex-shrink: 0;
  }
  .num {
    width: 62px;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    color: var(--text);
    padding: 5px 7px;
    border-radius: 5px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    outline: none;
  }
  .palette-presets {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-bottom: 9px;
  }
  .slots {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
  }
  .slots .slot {
    width: 100%;
  }
  .disclosure {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    background: none;
    border: none;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0 0 8px;
    text-align: left;
  }
  .reset {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 13px;
    padding: 2px 4px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 4px;
  }
  .sample {
    width: 30px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    border: var(--line-width) solid var(--line);
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .check-label {
    flex: 1;
    font-size: 12px;
  }
  .check.fail .check-label,
  .check.fail .ratio {
    color: var(--danger);
  }
  .warn,
  .error {
    font-size: 12px;
    color: var(--danger);
    margin: 0;
  }
  .warn-count {
    background: var(--tint-danger);
    color: var(--danger);
    border-radius: 9px;
    padding: 1px 7px;
    font-size: 10px;
  }
  .ok-count {
    color: var(--accent);
  }
  .hidden-file {
    display: none;
  }
</style>
