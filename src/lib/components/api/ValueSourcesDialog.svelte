<script lang="ts">
  /**
   * The value sources: what there is, and editing it.
   *
   * A list on the left and one source at a time on the right, because a source
   * is two very different things depending on its class — a block of written
   * values, or a handful of numbers — and a single form that morphed between the
   * two would read as a trick.
   *
   * Editing here reaches every contract's mock at once, which is the one place
   * this application keeps a live link instead of handing out a copy (D10). It
   * can afford to: nothing is stored that could diverge, because the mock is
   * derived every time it is looked at.
   */
  import { apiUi } from '../../api/ui.svelte';
  import { valueSources } from '../../api/sources/store.svelte';
  import {
    defaultRecipe,
    parseValues,
    recipeSummary,
    sourceSummary,
    type ValueSource,
  } from '../../api/sources/types';
  import { RECIPE_KINDS, type Recipe, type RecipeKind } from '../../api/model/types';
  import {
    exportValueSources,
    parseValueSourcesImport,
    VALUE_SOURCES_FILENAME,
  } from '../../api/sources/io';
  import { downloadText } from '../../hub/download';

  let panelEl = $state<HTMLDivElement | null>(null);
  let openerEl: HTMLElement | null = null;
  let selectedId = $state<string | null>(null);
  let removingId = $state<string | null>(null);
  let error = $state<string | null>(null);

  const sources = $derived(valueSources.sources);
  const selected = $derived(sources.find((s) => s.id === selectedId) ?? sources[0] ?? null);

  function close() {
    apiUi.closeSources();
    removingId = null;
    openerEl?.focus();
  }

  function create() {
    const made = valueSources.create('fuente');
    if (made) selectedId = made.id;
  }

  /**
   * Sources live in one profile's IndexedDB, so this is the **only** thing that
   * moves somebody's domain vocabulary between machines — and what repairs a
   * contract imported from one of them.
   */
  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      error = null;
      valueSources.merge(parseValueSourcesImport(await file.text()));
    } catch (err) {
      error = err instanceof Error ? err.message : 'No se pudo importar el archivo.';
    }
  }

  /** A recipe's numeric field, read the way every other number field here is. */
  function num(e: Event, fallback: number): number {
    const n = Number((e.currentTarget as HTMLInputElement).value);
    return Number.isFinite(n) ? n : fallback;
  }

  function setRecipe(source: ValueSource, patch: Partial<Recipe>) {
    if (source.recipe === null) return;
    valueSources.update(source.id, { recipe: { ...source.recipe, ...patch } as Recipe });
  }

  function setKind(source: ValueSource, kind: 'list' | 'recipe') {
    valueSources.update(source.id, {
      kind,
      recipe: kind === 'recipe' ? (source.recipe ?? defaultRecipe('integer')) : null,
    });
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (removingId !== null) {
        removingId = null;
        return;
      }
      close();
      return;
    }
    if (e.key !== 'Tab' || !panelEl) return;
    const focusables = [
      ...panelEl.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select'),
    ];
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  $effect(() => {
    if (!apiUi.sources) return;
    openerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelEl?.querySelector<HTMLElement>('button')?.focus();
  });

  const KIND_LABEL: Record<RecipeKind, string> = {
    integer: 'entero en un rango',
    decimal: 'decimal en un rango',
    text: 'texto de una longitud',
    digits: 'dígitos de una longitud',
    boolean: 'booleano',
    date: 'fecha en un rango',
    pattern: 'patrón',
  };
</script>

{#if apiUi.sources}
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="vsr-title"
    tabindex="-1"
    onkeydown={onKeydown}
  >
    <button type="button" class="overlay-hit" aria-label="cerrar" tabindex="-1" onclick={close}
    ></button>

    <div class="panel" bind:this={panelEl}>
      <header>
        <h2 id="vsr-title">Fuentes de valores</h2>
        <span class="spacer"></span>
        <label class="btn file">
          ↓ importar
          <input type="file" accept="application/json,.json" onchange={onImport} />
        </label>
        <button
          type="button"
          class="btn"
          disabled={sources.length === 0}
          onclick={() => downloadText(VALUE_SOURCES_FILENAME, exportValueSources(sources))}
          >↑ exportar</button
        >
        <button type="button" class="btn" onclick={close}>cerrar</button>
      </header>

      {#if error !== null}
        <p class="warn">{error}</p>
      {/if}

      <p class="why">
        De aquí salen los valores de un campo al generar un mock. Una <strong>lista</strong> trae el
        vocabulario de vuestro dominio —los estados reales de un pedido, los nombres de las
        sucursales—; una <strong>receta</strong> es para lo que nadie quiere escribir cuarenta veces.
        Lo que cambies aquí lo ven todos los contratos.
      </p>

      {#if valueSources.unavailable}
        <p class="warn">
          No se pudieron abrir las fuentes: {valueSources.unavailable.reason}. No se guardará nada
          mientras siga así.
        </p>
      {/if}

      <div class="cols">
        <div class="list">
          <button type="button" class="btn" onclick={create}>+ nueva fuente</button>
          {#if sources.length === 0}
            <p class="empty">Ninguna todavía.</p>
          {:else}
            <ul>
              {#each sources as source (source.id)}
                <li>
                  <button
                    type="button"
                    class="row"
                    class:on={selected?.id === source.id}
                    onclick={() => (selectedId = source.id)}
                  >
                    <span class="name">{source.name}</span>
                    <span class="sum">{sourceSummary(source)}</span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <div class="detail">
          {#if selected === null}
            <p class="empty">Crea una fuente para empezar.</p>
          {:else}
            <label class="field">
              <span>Nombre</span>
              <input
                class="in"
                value={selected.name}
                onchange={(e) =>
                  valueSources.update(selected.id, { name: e.currentTarget.value.trim() })}
              />
            </label>

            <label class="field">
              <span>Para qué es</span>
              <input
                class="in"
                placeholder="los estados que devuelve pedidos"
                value={selected.description}
                onchange={(e) =>
                  valueSources.update(selected.id, { description: e.currentTarget.value })}
              />
            </label>

            <div class="kinds" role="group" aria-label="clase de fuente">
              <button
                type="button"
                class="kind"
                class:on={selected.kind === 'list'}
                aria-pressed={selected.kind === 'list'}
                onclick={() => setKind(selected, 'list')}>lista</button
              >
              <button
                type="button"
                class="kind"
                class:on={selected.kind === 'recipe'}
                aria-pressed={selected.kind === 'recipe'}
                onclick={() => setKind(selected, 'recipe')}>receta</button
              >
            </div>

            {#if selected.kind === 'list'}
              <label class="field">
                <span>Valores — uno por línea, o separados por comas</span>
                <textarea
                  class="area"
                  rows="8"
                  spellcheck="false"
                  placeholder={'pendiente\nenviado\nentregado'}
                  value={selected.values.join('\n')}
                  onchange={(e) =>
                    valueSources.update(selected.id, {
                      values: parseValues(e.currentTarget.value),
                    })}
                ></textarea>
              </label>
              <p class="count">{sourceSummary(selected)}</p>
            {:else if selected.recipe !== null}
              {@const recipe = selected.recipe}
              <label class="field">
                <span>Qué genera</span>
                <select
                  class="in"
                  value={recipe.kind}
                  onchange={(e) =>
                    valueSources.update(selected.id, {
                      recipe: defaultRecipe(e.currentTarget.value as RecipeKind),
                    })}
                >
                  {#each RECIPE_KINDS as kind (kind)}
                    <option value={kind}>{KIND_LABEL[kind]}</option>
                  {/each}
                </select>
              </label>

              <div class="knobs">
                {#if recipe.kind === 'integer' || recipe.kind === 'decimal'}
                  <label class="knob"
                    ><span>desde</span>
                    <input
                      class="in"
                      type="number"
                      value={recipe.min}
                      onchange={(e) => setRecipe(selected, { min: num(e, recipe.min) })}
                    /></label
                  >
                  <label class="knob"
                    ><span>hasta</span>
                    <input
                      class="in"
                      type="number"
                      value={recipe.max}
                      onchange={(e) => setRecipe(selected, { max: num(e, recipe.max) })}
                    /></label
                  >
                {/if}
                {#if recipe.kind === 'decimal'}
                  <label class="knob"
                    ><span>decimales</span>
                    <input
                      class="in"
                      type="number"
                      min="0"
                      max="6"
                      value={recipe.decimals}
                      onchange={(e) => setRecipe(selected, { decimals: num(e, recipe.decimals) })}
                    /></label
                  >
                {/if}
                {#if recipe.kind === 'text' || recipe.kind === 'digits'}
                  <label class="knob"
                    ><span>longitud</span>
                    <input
                      class="in"
                      type="number"
                      min="1"
                      value={recipe.length}
                      onchange={(e) => setRecipe(selected, { length: num(e, recipe.length) })}
                    /></label
                  >
                {/if}
                {#if recipe.kind === 'boolean'}
                  <label class="knob"
                    ><span>% cierto</span>
                    <input
                      class="in"
                      type="number"
                      min="0"
                      max="100"
                      value={Math.round(recipe.trueRatio * 100)}
                      onchange={(e) =>
                        setRecipe(selected, {
                          trueRatio: Math.min(1, Math.max(0, num(e, 50) / 100)),
                        })}
                    /></label
                  >
                {/if}
                {#if recipe.kind === 'date'}
                  <label class="knob"
                    ><span>desde</span>
                    <input
                      class="in"
                      value={recipe.from}
                      onchange={(e) => setRecipe(selected, { from: e.currentTarget.value })}
                    /></label
                  >
                  <label class="knob"
                    ><span>hasta</span>
                    <input
                      class="in"
                      value={recipe.to}
                      onchange={(e) => setRecipe(selected, { to: e.currentTarget.value })}
                    /></label
                  >
                {/if}
                {#if recipe.kind === 'pattern'}
                  <label class="knob wide"
                    ><span># dígito · A letra · el resto, literal</span>
                    <input
                      class="in"
                      value={recipe.pattern}
                      onchange={(e) => setRecipe(selected, { pattern: e.currentTarget.value })}
                    /></label
                  >
                {/if}
              </div>
              <p class="count">{recipeSummary(recipe)}</p>
            {/if}

            <div class="foot">
              <span class="spacer"></span>
              {#if removingId === selected.id}
                <span class="confirm">Borrarla no toca ningún contrato.</span>
                <button
                  type="button"
                  class="btn danger"
                  onclick={() => {
                    valueSources.remove(selected.id);
                    removingId = null;
                    selectedId = null;
                  }}>borrar</button
                >
                <button type="button" class="btn" onclick={() => (removingId = null)}>no</button>
              {:else}
                <button type="button" class="btn" onclick={() => (removingId = selected.id)}
                  >borrar</button
                >
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--bg) 70%, transparent);
    z-index: 60;
  }
  .overlay-hit {
    position: absolute;
    inset: 0;
    background: none;
    border: none;
    cursor: default;
  }
  .panel {
    position: relative;
    width: min(760px, 92vw);
    max-height: 86vh;
    overflow-y: auto;
    padding: 18px;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h2 {
    margin: 0;
    font-size: 15px;
    color: var(--text);
  }
  .spacer {
    flex: 1;
  }
  .why {
    margin: 0;
    color: var(--text-dim);
    font-size: 12.5px;
    line-height: 1.55;
  }
  .warn {
    margin: 0;
    padding: 8px 10px;
    border: var(--line-width) solid var(--danger, var(--accent));
    border-radius: 6px;
    color: var(--text-mid);
    font-size: 12.5px;
  }
  .cols {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 14px;
    align-items: start;
  }
  .list,
  .detail {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .row {
    width: 100%;
    text-align: left;
    background: none;
    border: var(--line-width) solid transparent;
    border-radius: 6px;
    padding: 6px 8px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .row:hover {
    border-color: var(--line);
  }
  .row.on {
    border-color: var(--accent);
    background: var(--surface-2);
  }
  .name {
    color: var(--text);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sum,
  .count {
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    margin: 0;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field > span,
  .knob > span {
    color: var(--text-dim);
    font-size: 11px;
  }
  .in {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text);
    font-family: inherit;
    font-size: 13px;
    padding: 5px 7px;
    width: 100%;
  }
  .in:focus-visible {
    outline: none;
    border-color: var(--accent);
  }
  .area {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
    padding: 7px;
    resize: vertical;
    width: 100%;
  }
  .kinds {
    display: inline-flex;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    overflow: hidden;
    align-self: flex-start;
  }
  .kind {
    background: none;
    border: none;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 5px 10px;
    cursor: pointer;
  }
  .kind.on {
    background: var(--surface-2);
    color: var(--accent);
  }
  .knobs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .knob {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 110px;
  }
  .knob.wide {
    width: 100%;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 6px;
    border-top: var(--line-width) solid var(--line-weak);
  }
  .confirm {
    color: var(--text-dim);
    font-size: 12px;
  }
  .empty {
    margin: 0;
    color: var(--text-dim);
    font-size: 12.5px;
  }
  .btn {
    background: none;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text-mid);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    padding: 5px 9px;
    cursor: pointer;
  }
  .btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .btn:disabled:hover {
    color: var(--text-mid);
    border-color: var(--line);
  }
  /* A file input is unstyleable, so the label is the button and the input is
     hidden inside it, written exactly as the model library's importer is. The
     two importers do the same thing and should not be two different tricks. */
  .file {
    display: inline-flex;
    align-items: center;
  }
  .file input {
    display: none;
  }
  .btn.danger:hover {
    color: var(--danger, var(--accent));
    border-color: var(--danger, var(--accent));
  }
</style>
