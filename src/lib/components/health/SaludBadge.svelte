<script lang="ts">
  /** A health state: a word and a mark, so it never depends on the colour alone. */
  import { ETIQUETA_SALUD, TONO_SALUD, type EstadoSalud } from '../../health/trends';

  interface Props {
    estado: EstadoSalud;
  }

  let { estado }: Props = $props();

  const MARCA: Record<EstadoSalud, string> = {
    empeora: '▲',
    'sin-captura': '!',
    vigilar: '◆',
    'sin-datos': '○',
    estable: '=',
    mejora: '▼',
  };

  const tono = $derived(TONO_SALUD[estado]);
</script>

<span class="badge {tono}">
  <span aria-hidden="true">{MARCA[estado]}</span>
  {ETIQUETA_SALUD[estado]}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--line);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    white-space: nowrap;
    color: var(--text-mid);
  }
  .badge.danger {
    border-color: var(--danger);
    background: var(--tint-danger);
    color: var(--danger);
  }
  .badge.warn {
    border-color: var(--accent);
    background: var(--tint-accent);
    color: var(--accent);
  }
</style>
