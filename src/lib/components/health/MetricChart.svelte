<script lang="ts">
  /**
   * One metric through time: one series and one axis.
   *
   * The daily line stays thin and quiet because it is mostly noise, with its
   * weekends; the 7-day mean is what carries the reading. A day not measured cuts
   * both, since drawing through it would claim a value nobody saw. Estimates are
   * dashed, and every day can be read as text under the chart.
   */
  import {
    aislados,
    escalaY,
    formatoEje,
    formatoNumero,
    pathDe,
    ticksMes,
    tramos,
    tramosMedia,
    type Punto,
  } from '../../health/chart';
  import type { VersionSubida } from '../../health/model';
  import type { IsoDate } from '../../model/types';
  import { dayIndex, fmtDate } from '../../time/timeline';

  interface Props {
    titulo: string;
    puntos: Punto[];
    versiones: VersionSubida[];
    seleccionada: string | null;
    onseleccion: (id: string) => void;
  }

  let { titulo, puntos, versiones, seleccionada, onseleccion }: Props = $props();

  const H = 170;
  const PAD = { top: 30, right: 12, bottom: 22, left: 48 };

  let ancho = $state(720);
  let hover = $state<number | null>(null);

  const plotW = $derived(Math.max(60, ancho - PAD.left - PAD.right));
  const plotH = H - PAD.top - PAD.bottom;

  const maximo = $derived(Math.max(0, ...puntos.map((p) => p.valor ?? 0)));
  const escala = $derived(escalaY(maximo));
  const x = $derived((i: number) => PAD.left + (i / Math.max(1, puntos.length - 1)) * plotW);
  const yDe = $derived((v: number) => PAD.top + plotH - (v / escala.tope) * plotH);
  const yValor = $derived((i: number) => yDe(puntos[i].valor ?? 0));
  const yMedia = $derived((i: number) => yDe(puntos[i].media ?? 0));

  const lineas = $derived(tramos(puntos));
  const solos = $derived(aislados(puntos));
  const medias = $derived(tramosMedia(puntos));
  const meses = $derived(ticksMes(puntos, Math.max(2, Math.floor(plotW / 70))));
  const hayDatos = $derived(puntos.some((p) => p.valor !== null));

  /** Releases by day, so two on the same day show together. */
  const marcas = $derived.by(() => {
    if (puntos.length === 0) return [];
    const desde = puntos[0].dia;
    const hasta = puntos[puntos.length - 1].dia;
    const porDia = new Map<IsoDate, VersionSubida[]>();
    for (const v of versiones) {
      if (v.dia < desde || v.dia > hasta) continue;
      const lista = porDia.get(v.dia);
      if (lista) lista.push(v);
      else porDia.set(v.dia, [v]);
    }
    const ordenadas = [...porDia.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    let previa = -Infinity;
    let fila = 0;
    return ordenadas.map(([dia, lista]) => {
      const px = x(dayIndex(desde, dia));
      // Alternate the row of labels that would land on top of each other.
      fila = px - previa < 64 ? (fila + 1) % 2 : 0;
      previa = px;
      return {
        dia,
        lista,
        px,
        fila,
        etiqueta: lista.map((v) => v.version).join(' · '),
        activa: lista.some((v) => v.id === seleccionada),
      };
    });
  });

  function mover(e: PointerEvent) {
    const caja = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = e.clientX - caja.left - PAD.left;
    const i = Math.round((px / plotW) * (puntos.length - 1));
    hover = i >= 0 && i < puntos.length ? i : null;
  }

  function teclaMarca(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onseleccion(id);
    }
  }

  const punto = $derived(hover === null ? null : (puntos[hover] ?? null));
  const tooltipIzquierda = $derived(hover !== null && x(hover) > ancho / 2);
</script>

{#if !hayDatos}
  <p class="sin-datos">Sin datos en este periodo.</p>
{:else}
  <div class="chart" bind:clientWidth={ancho}>
    <svg width={ancho} height={H} role="img" aria-label="Evolución de {titulo}">
      {#each escala.ticks as t (t)}
        <line class="grid" x1={PAD.left} x2={PAD.left + plotW} y1={yDe(t)} y2={yDe(t)} />
        <text class="eje" x={PAD.left - 8} y={yDe(t) + 4} text-anchor="end">{formatoEje(t)}</text>
      {/each}
      {#each meses as m (m.indice)}
        <text class="eje" x={x(m.indice)} y={H - 6} text-anchor="middle">{m.etiqueta}</text>
      {/each}

      {#each lineas as t (t.desde)}
        <path class="diaria" class:estimado={t.estimado} d={pathDe(t.desde, t.hasta, x, yValor)} />
      {/each}
      {#each solos as i (i)}
        <circle class="solo" class:estimado={puntos[i].estimado} cx={x(i)} cy={yValor(i)} r="3" />
      {/each}
      {#each medias as t (t.desde)}
        <path class="media" d={pathDe(t.desde, t.hasta, x, yMedia)} />
      {/each}

      <!-- Beneath the marks, so a release stays clickable: the whole plot answers the pointer. -->
      <rect
        class="hit"
        x={PAD.left}
        y={PAD.top}
        width={plotW}
        height={plotH}
        role="presentation"
        onpointermove={mover}
        onpointerleave={() => (hover = null)}
      />

      {#if punto && hover !== null}
        <line class="cruz" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} />
        {#if punto.valor !== null}
          <circle class="foco" cx={x(hover)} cy={yValor(hover)} r="4" />
        {/if}
      {/if}

      {#each marcas as m (m.dia)}
        <g
          class="marca"
          class:activa={m.activa}
          role="button"
          tabindex="0"
          aria-label="Subida {m.etiqueta} el {fmtDate(m.dia)}: comparar antes y después"
          onclick={() => onseleccion(m.lista[0].id)}
          onkeydown={(e) => teclaMarca(e, m.lista[0].id)}
        >
          <line x1={m.px} x2={m.px} y1={PAD.top - 4} y2={PAD.top + plotH} />
          <rect class="marca-hit" x={m.px - 6} y={4} width="12" height={PAD.top + plotH - 4} />
          <text
            x={m.px}
            y={m.fila === 0 ? 12 : 23}
            text-anchor={m.px > ancho - 60 ? 'end' : m.px < PAD.left + 30 ? 'start' : 'middle'}
          >
            {m.etiqueta}
          </text>
        </g>
      {/each}
    </svg>

    {#if punto}
      <div
        class="tooltip"
        style:left={tooltipIzquierda ? 'auto' : `${x(hover ?? 0) + 12}px`}
        style:right={tooltipIzquierda ? `${ancho - x(hover ?? 0) + 12}px` : 'auto'}
      >
        <div class="t-dia">{fmtDate(punto.dia)}</div>
        {#if punto.valor === null}
          <div>no medido</div>
        {:else}
          <div>
            {formatoNumero(punto.valor)}
            {#if punto.estimado}<span class="t-est">estimado</span>{/if}
          </div>
        {/if}
        {#if punto.media !== null}
          <div class="t-media">media 7 días: {formatoNumero(punto.media)}</div>
        {/if}
      </div>
    {/if}
  </div>

  <details class="tabla">
    <summary>ver como tabla</summary>
    <div class="tabla-scroll">
      <table>
        <thead>
          <tr
            ><th scope="col">Día</th><th scope="col">Valor</th><th scope="col">Media 7 días</th></tr
          >
        </thead>
        <tbody>
          {#each [...puntos].reverse() as p (p.dia)}
            <tr>
              <th scope="row">{p.dia}</th>
              <td>
                {p.valor === null ? 'no medido' : formatoNumero(p.valor)}{p.estimado
                  ? ' (estimado)'
                  : ''}
              </td>
              <td>{p.media === null ? '—' : formatoNumero(p.media)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
{/if}

<style>
  .chart {
    position: relative;
    width: 100%;
  }
  svg {
    display: block;
  }
  .sin-datos {
    margin: 0;
    padding: 16px 0;
    color: var(--text-dim);
    font-size: 13px;
  }
  .grid {
    stroke: var(--line-weak);
    stroke-width: 1;
  }
  .eje {
    fill: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
  }
  path {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .diaria {
    stroke: var(--text-dim);
    stroke-width: 1;
    opacity: 0.75;
  }
  .diaria.estimado {
    stroke-dasharray: 3 3;
  }
  .media {
    stroke: var(--accent);
    stroke-width: 2;
  }
  .solo {
    fill: var(--text-dim);
  }
  .solo.estimado {
    fill: var(--surface);
    stroke: var(--text-dim);
    stroke-width: 1.5;
  }
  .hit {
    fill: transparent;
  }
  .cruz {
    stroke: var(--text-dim);
    stroke-width: 1;
    pointer-events: none;
  }
  .foco {
    fill: var(--accent);
    stroke: var(--surface);
    stroke-width: 2;
    pointer-events: none;
  }
  .marca {
    cursor: pointer;
    outline: none;
  }
  .marca line {
    stroke: var(--text-mid);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .marca text {
    fill: var(--text-mid);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
  }
  .marca-hit {
    fill: transparent;
  }
  .marca:hover text,
  .marca:focus-visible text,
  .marca.activa text {
    fill: var(--accent);
    font-weight: 600;
  }
  .marca:hover line,
  .marca:focus-visible line,
  .marca.activa line {
    stroke: var(--accent);
    stroke-dasharray: none;
  }
  .tooltip {
    position: absolute;
    top: 30px;
    z-index: 5;
    padding: 6px 10px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    box-shadow: 0 6px 18px var(--shadow-medium);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text);
    pointer-events: none;
    white-space: nowrap;
  }
  .t-dia,
  .t-media {
    color: var(--text-dim);
    font-size: 11px;
  }
  .t-est {
    color: var(--text-dim);
    font-size: 11px;
  }
  .tabla {
    margin-top: 4px;
    font-size: 12px;
  }
  .tabla summary {
    cursor: pointer;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .tabla-scroll {
    max-height: 220px;
    overflow-y: auto;
    margin-top: 6px;
  }
  table {
    border-collapse: collapse;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-mid);
  }
  .tabla th,
  .tabla td {
    padding: 2px 16px 2px 0;
    text-align: left;
    font-weight: 400;
  }
</style>
