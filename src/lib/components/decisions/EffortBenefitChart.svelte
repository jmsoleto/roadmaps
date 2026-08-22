<script lang="ts">
  /**
   * Effort against benefit: "qué me llevo por lo que cuesta" (design decision D1).
   *
   * Effort grows to the right, benefit upwards, so the favourable corner is the
   * top left — much benefit, little effort. That corner is shaded and labelled,
   * because the reading is only obvious to whoever has seen the chart before.
   *
   * Plain SVG, no library: the app declares no runtime dependency and two charts
   * do not justify starting that count.
   */
  import { APPRAISAL_MAX, APPRAISAL_MIN } from '../../decisions/model/criteria';
  import type { EffortBenefit } from '../../decisions/present';

  interface Props {
    data: EffortBenefit;
  }

  let { data }: Props = $props();

  const W = 520;
  const H = 300;
  const PAD = { top: 26, right: 26, bottom: 44, left: 52 };

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Effort runs from zero, so the distance between two points is the real
  // difference in weeks and not an artefact of where the axis starts.
  const x = (weeks: number) => PAD.left + (weeks / data.maxWeeks) * plotW;
  const y = (score: number) =>
    PAD.top + plotH - ((score - APPRAISAL_MIN) / (APPRAISAL_MAX - APPRAISAL_MIN)) * plotH;
</script>

{#if data.points.length === 0}
  <div class="empty">
    <span class="title">esfuerzo frente a beneficio</span>
    <p>
      Ninguna alternativa tiene declarados a la vez su esfuerzo y su beneficio, así que no hay nada
      que situar.
    </p>
  </div>
{:else}
  <figure class="chart">
    <figcaption class="title">esfuerzo frente a beneficio</figcaption>

    <svg viewBox="0 0 {W} {H}" role="img" aria-label="esfuerzo frente a beneficio">
      <!-- The favourable corner, named. Without it the chart needs explaining
           at the exact moment nobody wants an explanation. -->
      <rect x={PAD.left} y={PAD.top} width={plotW / 2} height={plotH / 2} class="good" rx="6" />
      <text x={PAD.left + 10} y={PAD.top + 20} class="good-label">
        mucho beneficio, poco esfuerzo
      </text>

      <line
        x1={PAD.left}
        y1={PAD.top + plotH}
        x2={PAD.left + plotW}
        y2={PAD.top + plotH}
        class="axis"
      />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} class="axis" />

      <text x={PAD.left + plotW} y={PAD.top + plotH + 30} class="axis-label end">
        esfuerzo → {data.maxWeeks} sem
      </text>
      <!-- No arrow here: rotating the label rotates the glyph with it, and an
           upward arrow ends up pointing left. The words carry the direction. -->
      <text x={-(PAD.top + plotH / 2)} y="14" transform="rotate(-90)" class="axis-label middle">
        más beneficio arriba
      </text>

      {#each data.points as p (p.id)}
        <g class="point" class:recommended={p.recommended}>
          <circle cx={x(p.weeks)} cy={y(p.score)} r={p.recommended ? 13 : 11} />
          <text x={x(p.weeks)} y={y(p.score) + 5} class="letter">{p.letter}</text>
        </g>
      {/each}
    </svg>

    <p class="note">El beneficio es una apreciación de quien preparó la decisión, no una medida.</p>

    {#if data.unplotted.length > 0}
      <!-- Named rather than dropped: a point at zero effort would read as
           "this one is free", which is a lie the room would believe. -->
      <p class="unplotted">
        Sin cuantificar, fuera del gráfico:
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
  .good {
    fill: var(--tint-accent);
  }
  .good-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    fill: var(--accent);
  }
  .axis {
    stroke: var(--line);
    stroke-width: 1.5;
  }
  .axis-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    fill: var(--text-dim);
  }
  .end {
    text-anchor: end;
  }
  .middle {
    text-anchor: middle;
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
    font-size: 13px;
    font-weight: 600;
    text-anchor: middle;
    fill: var(--text);
  }
  .point.recommended .letter {
    fill: var(--ink-on-accent);
  }
  .note,
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
