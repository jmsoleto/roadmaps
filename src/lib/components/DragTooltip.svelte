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
    background: var(--panel);
    border: 1px solid var(--cyan);
    border-radius: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    font-weight: 600;
    z-index: 200;
    pointer-events: none;
    white-space: nowrap;
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.6),
      0 0 0 3px rgba(34, 211, 238, 0.15);
    opacity: 0;
    transition: opacity 0.1s;
    color: var(--text);
  }
  .drag-tooltip.show {
    opacity: 1;
  }
</style>
