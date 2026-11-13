<script lang="ts">
  /**
   * The shape of one metric, in the width of a table cell. Hidden from assistive
   * technology because the row already states the figures it summarises.
   */
  import { pathDe, tramos, aislados, type Punto } from '../../health/chart';

  interface Props {
    puntos: Punto[];
  }

  let { puntos }: Props = $props();

  const W = 120;
  const H = 26;
  const PAD = 3;

  const maximo = $derived(Math.max(1, ...puntos.map((p) => p.valor ?? 0)));
  const x = $derived((i: number) => PAD + (i / Math.max(1, puntos.length - 1)) * (W - PAD * 2));
  const y = $derived((i: number) => H - PAD - ((puntos[i].valor ?? 0) / maximo) * (H - PAD * 2));
  const lineas = $derived(tramos(puntos));
  const solos = $derived(aislados(puntos));
</script>

<svg viewBox="0 0 {W} {H}" width={W} height={H} aria-hidden="true">
  {#each lineas as t (t.desde)}
    <path d={pathDe(t.desde, t.hasta, x, y)} class:estimado={t.estimado} />
  {/each}
  {#each solos as i (i)}
    <circle cx={x(i)} cy={y(i)} r="1.5" />
  {/each}
</svg>

<style>
  svg {
    display: block;
  }
  path {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.25;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  path.estimado {
    stroke-dasharray: 3 2;
  }
  circle {
    fill: var(--accent);
  }
</style>
