<script lang="ts">
  /**
   * Creating or personalising one link.
   *
   * The colour is picked as a **pair** and stored as two palette slots, never as
   * hex (D3): a link's colour is decoration of the user's own data, like a Gantt
   * bar, so it follows the theme. Ten pairs rather than two free colour pickers,
   * because what is being chosen here is a look, not two coordinates — and the
   * ten come out of the theme's own palette, so they are right in every theme.
   */
  import { theme } from '../../theme/theme.svelte';
  import { links } from '../../links/store.svelte';
  import { linksUi } from '../../links/ui.svelte';
  import {
    defaultPair,
    deriveMonogram,
    monogramProblem,
    urlProblem,
    MONOGRAM_MAX,
  } from '../../links/model';

  const editing = $derived(linksUi.editing);
  const existing = $derived(editing !== null && editing !== 'new' ? links.link(editing) : null);

  let name = $state('');
  let description = $state('');
  let url = $state('');
  let monogram = $state('');
  let from = $state(0);
  let to = $state(3);
  let wide = $state(false);
  let position = $state(1);
  let touched = $state(false);
  let nameEl = $state<HTMLInputElement | null>(null);

  // Reload the fields whenever the form points at something else, so opening a
  // second link never shows the first one's half-typed values.
  $effect(() => {
    const link = existing;
    const pair = defaultPair(links.data.links.length);
    name = link?.name ?? '';
    description = link?.description ?? '';
    url = link?.url ?? '';
    monogram = link?.monogram ?? '';
    from = link?.from ?? pair.from;
    to = link?.to ?? pair.to;
    wide = link?.wide ?? false;
    // 1-based, because it is the number key that opens it — the whole reason
    // the order of a grid matters here rather than being decoration.
    position = link
      ? links.visibleLinks.findIndex((l) => l.id === link.id) + 1
      : links.visibleLinks.length + 1;
    touched = false;
    queueMicrotask(() => nameEl?.focus());
  });

  const urlError = $derived(touched ? urlProblem(url) : null);
  const monogramError = $derived(touched ? monogramProblem(monogram) : null);
  const nameError = $derived(
    touched && name.trim() === '' ? 'El enlace necesita un nombre.' : null,
  );
  const preview = $derived(monogram.trim() === '' ? deriveMonogram(name) : monogram.trim());
  const pairs = $derived(Array.from({ length: 10 }, (_, i) => defaultPair(i)));

  function save() {
    touched = true;
    if (urlProblem(url) || monogramProblem(monogram) || name.trim() === '') return;
    const patch = {
      name: name.trim(),
      description: description.trim(),
      url: url.trim(),
      monogram: preview,
      from,
      to,
      wide,
    };
    if (existing) {
      links.updateLink(existing.id, patch);
      links.moveLink(existing.id, position - 1);
    } else {
      const created = links.addLink({ ...patch });
      if (created) links.moveLink(created.id, position - 1);
    }
    linksUi.closeForm();
  }

  function remove() {
    if (existing) links.deleteLink(existing.id);
    linksUi.closeForm();
  }
</script>

<div
  class="scrim"
  role="presentation"
  onclick={(e) => {
    if (e.target === e.currentTarget) linksUi.closeForm();
  }}
>
  <div class="panel" role="dialog" aria-label={existing ? 'Personalizar enlace' : 'Nuevo enlace'}>
    <header>
      <span
        class="badge"
        style:background="linear-gradient(145deg, {theme.slotColor(from)}, {theme.slotColor(to)})"
        style:color={theme.inkForPair(from, to)}>{preview}</span
      >
      <h2>{existing ? 'Personalizar enlace' : 'Nuevo enlace'}</h2>
    </header>

    <label>
      <span>Nombre</span>
      <input bind:this={nameEl} bind:value={name} placeholder="Grafana" />
    </label>
    {#if nameError}<p class="error">{nameError}</p>{/if}

    <label>
      <span>Descripción</span>
      <input bind:value={description} placeholder="Checkout · latencia y pedidos/min" />
    </label>

    <label>
      <span>Dirección</span>
      <input bind:value={url} placeholder="https://grafana.interno/d/checkout" />
    </label>
    {#if urlError}<p class="error">{urlError}</p>{/if}

    <div class="pair">
      <label class="short">
        <span>Monograma</span>
        <input bind:value={monogram} maxlength={MONOGRAM_MAX} placeholder={deriveMonogram(name)} />
      </label>
      <label class="short">
        <span>Posición — la tecla que lo abre</span>
        <input
          type="number"
          min="1"
          max={existing ? links.visibleLinks.length : links.visibleLinks.length + 1}
          bind:value={position}
        />
      </label>
    </div>
    {#if monogramError}<p class="error">{monogramError}</p>{/if}

    <fieldset>
      <legend>Color</legend>
      <div class="pairs">
        {#each pairs as pair (pair.from)}
          <button
            type="button"
            class="swatch"
            class:picked={pair.from === from && pair.to === to}
            title="par {pair.from + 1}"
            aria-label="par de colores {pair.from + 1}"
            style:background="linear-gradient(145deg, {theme.slotColor(pair.from)}, {theme.slotColor(
              pair.to,
            )})"
            onclick={() => {
              from = pair.from;
              to = pair.to;
            }}
          ></button>
        {/each}
      </div>
    </fieldset>

    <label class="check">
      <input type="checkbox" bind:checked={wide} />
      <span>Doble de ancho — de los que miro primero</span>
    </label>

    <footer>
      {#if existing}
        <button type="button" class="danger" onclick={remove}>eliminar</button>
      {/if}
      <span class="spacer"></span>
      <button type="button" onclick={() => linksUi.closeForm()}>cancelar</button>
      <button type="button" class="primary" onclick={save}>guardar</button>
    </footer>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: var(--scrim);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 40;
  }
  .panel {
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    overflow: auto;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }
  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
  }
  .badge {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 17px;
    font-weight: 600;
    flex-shrink: 0;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .pair {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }
  label.short {
    max-width: 180px;
  }
  input:not([type='checkbox']) {
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: var(--line-width) solid var(--line);
    background: var(--surface);
    color: var(--text);
    font: inherit;
  }
  input:focus-visible {
    outline: var(--focus-ring, 2px) solid var(--accent);
    outline-offset: 1px;
  }
  .check {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    color: var(--text-mid);
  }
  fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }
  legend {
    padding: 0 0 4px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .pairs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .swatch {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    border: var(--line-width) solid var(--line);
    cursor: pointer;
    padding: 0;
  }
  .swatch.picked {
    box-shadow: 0 0 0 var(--focus-ring, 2px) var(--accent);
  }
  .error {
    margin: 0;
    font-size: 12px;
    color: var(--danger);
  }
  footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .spacer {
    flex: 1;
  }
  footer button {
    height: 32px;
    padding: 0 14px;
    border-radius: 6px;
    border: var(--line-width) solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font: inherit;
  }
  footer .primary {
    background: var(--accent);
    color: var(--ink-on-accent);
    border-color: var(--accent);
  }
  footer .danger {
    color: var(--danger);
  }
</style>
