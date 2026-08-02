<script lang="ts">
  import { ui } from '../store/ui.svelte';
  const t = $derived(ui.tooltip);
</script>

<div class="drag-tooltip" class:show={t.show} style:left="{t.x}px" style:top="{t.y}px">
  {t.text}
</div>

<style>
  .drag-tooltip {
    position: fixed;
    padding: 6px 10px;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    font-weight: 600;
    z-index: 200;
    pointer-events: none;
    white-space: nowrap;
    box-shadow:
      0 6px 20px var(--shadow-strong),
      0 0 0 3px var(--tint-accent-soft);
    opacity: 0;
    transition: opacity 0.1s;
    color: var(--text);
  }
  .drag-tooltip.show {
    opacity: 1;
  }
</style>
