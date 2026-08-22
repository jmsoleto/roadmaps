<script lang="ts">
  /**
   * When the customer would have it (design decision D1).
   *
   * One axis of months with today marked, and a point per alternative. The axis
   * always contains today, so "how far off is this" is readable without anyone
   * having to find the present on it.
   */
  import { monthTicks, positionOn, type Timeline } from '../../decisions/present';

  interface Props {
    data: Timeline;
    today: string;
  }

  let { data, today }: Props = $props();

  const W = 520;
  const H = 150;
  const PAD = { left: 26, right: 26 };
  const AXIS_Y = 96;

  const plotW = W - PAD.left - PAD.right;
  const at = (date: string) => PAD.left + positionOn(data.from, data.to, date) * plotW;

  const ticks = $derived(monthTicks(data.from, data.to));

  /**
   * Stagger the labels of points that fall close together.
   *
   * Two alternatives a fortnight apart would otherwise print on top of each
   * other, which is exactly when the reader most needs to tell them apart.
   */
  const rows = $derived(
    data.points
      .map((p) => ({ ...p, x: at(p.date) }))
      .sort((a, b) => a.x - b.x)
      .map((p, i, all) => ({ ...p, row: i > 0 && p.x - all[i - 1].x < 70 ? 1 : 0 })),
  );
</script>

{#if data.points.length === 0}
  <div class="empty">
    <span class="title">cuándo lo tendría el cliente</span>
    <p>Ninguna alternativa declara cuándo entregaría valor, así que no hay línea que dibujar.</p>
  </div>
{:else}
  <figure class="chart">
    <figcaption class="title">cuándo lo tendría el cliente</figcaption>

    <svg viewBox="0 0 {W} {H}" role="img" aria-label="cuándo lo tendría el cliente">
      <line x1={PAD.left} y1={AXIS_Y} x2={PAD.left + plotW} y2={AXIS_Y} class="axis" />

      {#each ticks as t (t.date)}
        <g class="tick">
          <line x1={at(t.date)} y1={AXIS_Y - 5} x2={at(t.date)} y2={AXIS_Y + 5} />
          <text x={at(t.date)} y={AXIS_Y + 24}>{t.label}</text>
        </g>
      {/each}

      <!-- Today, so every distance on the axis is read from somewhere real. -->
      <g class="today">
        <line x1={at(today)} y1={AXIS_Y - 34} x2={at(today)} y2={AXIS_Y + 10} />
        <text x={at(today)} y={AXIS_Y - 42}>HOY</text>
      </g>

      {#each rows as p (p.id)}
        <g class="point" class:recommended={p.recommended}>
          <circle cx={p.x} cy={AXIS_Y} r={p.recommended ? 11 : 9} />
          <text x={p.x} y={AXIS_Y + 4} class="letter">{p.letter}</text>
          <text x={p.x} y={AXIS_Y + (p.row === 0 ? 48 : 66)} class="when">
            {p.date.slice(8, 10)}/{p.date.slice(5, 7)}/{p.date.slice(2, 4)}
          </text>
        </g>
      {/each}
    </svg>

    {#if data.unplotted.length > 0}
      <p class="unplotted">
        Sin fecha declarada:
        {#each data.unplotted as u, i (u.letter)}<span class="u"
            >{u.letter} · {u.text || 'sin texto'}</span
          >{i < data.unplotted.length - 1 ? ' · ' : ''}{/each}
      </p>
    {/if}
  </figure>
{/if}

<style>
  .chart,
  .empty {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .axis {
    stroke: var(--line);
    stroke-width: 1.5;
  }
  .tick line {
    stroke: var(--line);
    stroke-width: 1;
  }
  .tick text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    text-anchor: middle;
    fill: var(--text-dim);
  }
  .today line {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .today text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-anchor: middle;
    fill: var(--accent);
  }
  .point circle {
    fill: var(--surface-2);
    stroke: var(--text-dim);
    stroke-width: 2;
  }
  .point.recommended circle {
    fill: var(--accent);
    stroke: var(--accent);
  }
  .letter {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    text-anchor: middle;
    fill: var(--text);
  }
  .point.recommended .letter {
    fill: var(--ink-on-accent);
  }
  .when {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    text-anchor: middle;
    fill: var(--text-mid);
  }
  .unplotted,
  .empty p {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-dim);
  }
  .u {
    color: var(--text-mid);
  }
</style>
