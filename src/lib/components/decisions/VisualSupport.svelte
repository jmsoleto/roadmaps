<script lang="ts">
  /**
   * Visual support for the study: the diagrams and screenshots that a decision
   * cannot be explained without.
   *
   * Pasting is the primary way in (design decision D2) — capture the screen and
   * press ⌘V, no disk, no file name. Dropping and the file picker are there for
   * a diagram that already exists.
   *
   * A fiche whose bytes are not on this machine is drawn as a **declared
   * absence** rather than hidden: it is what an imported document produces, and
   * the record of the image is worth more than a tidy panel.
   */
  import { decisions } from '../../decisions/store.svelte';
  import { formatBytes, totalBytes } from '../../decisions/model/attachments';
  import type { Decision } from '../../decisions/model/types';

  interface Props {
    decision: Decision;
  }

  let { decision }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let dragging = $state(false);
  let error = $state<string | null>(null);
  let viewing = $state<{ name: string; url: string } | null>(null);

  /**
   * Object URLs for the thumbnails, by attachment id.
   *
   * Held in a map rather than created per render, so each one is created once
   * and revoked exactly once. Leaking these is the only resource leak this
   * component can have.
   */
  let urls = $state<Record<string, string | null>>({});

  const closed = $derived(decision.resolution !== null);
  const total = $derived(totalBytes(decision.attachments));

  function report(message: string | null) {
    error = message;
    if (message) setTimeout(() => (error = null), 4000);
  }

  async function add(files: Iterable<File | Blob>) {
    for (const file of files) report(await decisions.attach(decision.id, file));
  }

  function onPaste(e: ClipboardEvent) {
    if (closed) return;
    const items = [...(e.clipboardData?.items ?? [])]
      .filter((i) => i.kind === 'file')
      .map((i) => i.getAsFile())
      .filter((f): f is File => f !== null);
    if (items.length === 0) return;
    e.preventDefault();
    void add(items);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (closed) return;
    void add(e.dataTransfer?.files ?? []);
  }

  async function view(id: string, name: string) {
    const url = urls[id];
    if (!url) return;
    viewing = { name, url };
  }

  // Load the bytes of anything showing that we do not already have a URL for.
  // `null` in the map means "asked and there were none" — a declared absence,
  // distinct from "not asked yet".
  $effect(() => {
    for (const a of decision.attachments) {
      if (a.id in urls) continue;
      urls[a.id] = null;
      void decisions.blobFor(a.id).then((blob) => {
        if (blob) urls[a.id] = URL.createObjectURL(blob);
      });
    }
  });

  // Revoke every URL this component created, whichever decision it belonged to.
  $effect(() => {
    return () => {
      for (const url of Object.values(urls)) if (url) URL.revokeObjectURL(url);
    };
  });
</script>

<svelte:window onpaste={onPaste} />

<section class="support">
  <div class="head">
    <span class="label">APOYO VISUAL</span>
    {#if decision.attachments.length > 0}
      <span class="total">{decision.attachments.length} · {formatBytes(total)}</span>
    {/if}
  </div>

  {#if decision.attachments.length > 0}
    <div class="thumbs">
      {#each decision.attachments as a (a.id)}
        {@const url = urls[a.id]}
        <figure class="thumb" class:absent={!url}>
          {#if url}
            <button type="button" class="open" onclick={() => view(a.id, a.name)}>
              <img src={url} alt={a.name} />
            </button>
          {:else}
            <!-- Declared absence: the fiche travelled, the bytes did not. -->
            <div class="missing" title="no viene en este export">
              <span class="missing-glyph" aria-hidden="true">▨</span>
              <span class="missing-text">no está en esta máquina</span>
            </div>
          {/if}
          <figcaption>
            <span class="name" title={a.name}>{a.name}</span>
            <span class="size">{formatBytes(a.size)}</span>
            {#if !closed}
              <button
                type="button"
                class="remove"
                title="quitar"
                onclick={() => decisions.detach(decision.id, a.id)}>✕</button
              >
            {/if}
          </figcaption>
        </figure>
      {/each}
    </div>
  {/if}

  {#if !closed}
    <div
      class="drop"
      class:over={dragging}
      role="button"
      tabindex="0"
      ondragover={(e) => {
        e.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={onDrop}
      onclick={() => fileInput?.click()}
      onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
    >
      arrastra un diagrama, pega una captura con ⌘V, o haz clic para elegir
    </div>
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      multiple
      class="hidden-file"
      onchange={(e) => {
        void add(e.currentTarget.files ?? []);
        e.currentTarget.value = '';
      }}
    />
  {/if}

  {#if error}<p class="error">{error}</p>{/if}
</section>

{#if viewing}
  <div class="lightbox" role="presentation" onclick={() => (viewing = null)}>
    <img src={viewing.url} alt={viewing.name} />
    <span class="lightbox-name">{viewing.name} · clic para cerrar</span>
  </div>
{/if}

<style>
  .support {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .label,
  .total,
  .size {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }
  .total,
  .size {
    letter-spacing: 0.02em;
  }
  .thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .thumb {
    margin: 0;
    width: 132px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .open {
    display: block;
    width: 100%;
    height: 84px;
    padding: 0;
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    overflow: hidden;
    cursor: zoom-in;
  }
  .open:hover {
    border-color: var(--accent);
  }
  .open img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .missing {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 84px;
    border: var(--line-width) dashed var(--line);
    border-radius: 6px;
    background: var(--veil);
    color: var(--text-dim);
    text-align: center;
  }
  .missing-glyph {
    font-size: 18px;
    opacity: 0.5;
  }
  .missing-text {
    font-size: 10px;
    line-height: 1.2;
    padding: 0 6px;
  }
  figcaption {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: var(--text-mid);
  }
  .remove {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text-dim);
    font-size: 10px;
    cursor: pointer;
  }
  .remove:hover {
    color: var(--danger);
    background: var(--tint-danger);
  }
  .drop {
    padding: 12px;
    border: var(--line-width) dashed var(--line);
    border-radius: 6px;
    background: var(--veil);
    color: var(--text-dim);
    font-size: 12.5px;
    text-align: center;
    cursor: pointer;
  }
  .drop:hover,
  .drop.over {
    border-color: var(--accent);
    color: var(--accent);
  }
  .hidden-file {
    display: none;
  }
  .error {
    margin: 0;
    font-size: 12.5px;
    color: var(--danger);
  }
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 32px;
    background: var(--scrim);
    cursor: zoom-out;
  }
  .lightbox img {
    max-width: 100%;
    max-height: calc(100% - 40px);
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 16px 48px var(--shadow-strong);
  }
  .lightbox-name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-mid);
  }
</style>
