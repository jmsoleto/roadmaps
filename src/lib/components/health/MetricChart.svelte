<script lang="ts">
  /**
   * One metric through time: one series and one axis.
   *
   * The daily line stays thin and quiet because it is mostly noise, with its
   * weekends; the 7-day mean is what carries the reading. A day not measured cuts
   * both, since drawing through it would claim a value nobody saw. Estimates are
   * dashed, and every day can be read as text under the chart.
   *
   * Releases registered by hand are a dashed mark; deployments read from the
   * source, a solid one with a glyph per result (health-despliegues, D4). Each
   * day has at most one of each, saying how many there were.
   */
  import {
    aislados,
    escalaY,
    formatoEje,
    formatoNumero,
    indiceBajoPuntero,
    pathDe,
    ticksMes,
    tramos,
    tramosMedia,
    type Punto,
  } from '../../health/chart';
  import { describir, resumenGlifos } from '../../health/despliegue-texto';
  import { abreComparacion, type Marca } from '../../health/marcas';
  import type { IsoDate } from '../../model/types';
  import { dayIndex, fmtDate } from '../../time/timeline';

  interface Props {
    titulo: string;
    puntos: Punto[];
    /** Manual releases and deployments, already filtered. */
    marcas: Marca[];
    seleccionada: string | null;
    onseleccion: (id: string) => void;
  }

  let { titulo, puntos, marcas: todas, seleccionada, onseleccion }: Props = $props();

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

  /**
   * Marks by day and by origin, so two on the same day show together. The one
   * a click selects is the first that opens a comparison, if any.
   */
  const marcas = $derived.by(() => {
    if (puntos.length === 0) return [];
    const desde = puntos[0].dia;
    const hasta = puntos[puntos.length - 1].dia;
    const grupos = new Map<string, { dia: IsoDate; origen: Marca['origen']; lista: Marca[] }>();
    for (const m of todas) {
      if (m.dia < desde || m.dia > hasta) continue;
      const clave = `${m.dia}|${m.origen}`;
      const g = grupos.get(clave);
      if (g) g.lista.push(m);
      else grupos.set(clave, { dia: m.dia, origen: m.origen, lista: [m] });
    }
    const ordenados = [...grupos.values()].sort((a, b) =>
      a.dia !== b.dia ? (a.dia < b.dia ? -1 : 1) : a.origen === 'manual' ? -1 : 1,
    );
    // Where the last label of each row ends, so a label goes to a row it fits in.
    const finDeFila = [-Infinity, -Infinity];
    return ordenados.map(({ dia, origen, lista }) => {
      const px = x(dayIndex(desde, dia));
      const despliegues = lista.flatMap((m) => (m.origen === 'despliegue' ? [m.d] : []));
      const exito = despliegues.find((d) => d.result === 'success');
      const etiqueta =
        origen === 'manual'
          ? lista.map((m) => m.version).join(' · ')
          : `${resumenGlifos(despliegues)}${exito?.version ? ` ${exito.version}` : ''}`;
      const descripcion =
        origen === 'manual'
          ? `Subida ${etiqueta} el ${fmtDate(dia)}: comparar antes y después`
          : `${despliegues.length === 1 ? 'Despliegue' : `${despliegues.length} despliegues`} el ${fmtDate(dia)}: ${despliegues.map(describir).join('; ')}`;
      // About 6.5 px a character at 10.5 px monospace. Near an edge the label
      // hangs to one side of its mark, centred elsewhere.
      const largo = etiqueta.length * 6.5 + 8;
      const anclaje: 'start' | 'middle' | 'end' =
        px > ancho - 60 ? 'end' : px < PAD.left + 30 ? 'start' : 'middle';
      const inicio = anclaje === 'end' ? px - largo : anclaje === 'start' ? px : px - largo / 2;
      const libre = finDeFila.findIndex((fin) => fin <= inicio);
      const fila = libre !== -1 ? libre : finDeFila[0] <= finDeFila[1] ? 0 : 1;
      finDeFila[fila] = inicio + largo;
      return {
        clave: `${dia}|${origen}`,
        dia,
        origen,
        px,
        fila,
        anclaje,
        etiqueta,
        descripcion,
        destino: (lista.find(abreComparacion) ?? lista[0]).id,
        activa: lista.some((m) => m.id === seleccionada),
        fallida: origen === 'despliegue' && !exito,
      };
    });
  });

  function mover(e: PointerEvent) {
    // The listener is the plot rect, which already starts at PAD.left.
    const caja = (e.currentTarget as SVGElement).getBoundingClientRect();
    hover = indiceBajoPuntero(e.clientX - caja.left, plotW, puntos.length);
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

      {#each marcas as m (m.clave)}
        <g
          class="marca"
          class:despliegue={m.origen === 'despliegue'}
          class:fallida={m.fallida}
          class:activa={m.activa}
          role="button"
          tabindex="0"
          aria-label={m.descripcion}
          onclick={() => onseleccion(m.destino)}
          onkeydown={(e) => teclaMarca(e, m.destino)}
        >
          <title>{m.descripcion}</title>
          <line x1={m.px} x2={m.px} y1={PAD.top - 4} y2={PAD.top + plotH} />
          <rect class="marca-hit" x={m.px - 6} y={4} width="12" height={PAD.top + plotH - 4} />
          <text x={m.px} y={m.fila === 0 ? 12 : 23} text-anchor={m.anclaje}>
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
  .marca.despliegue line {
    stroke: var(--accent);
    stroke-dasharray: none;
    opacity: 0.7;
  }
  .marca.despliegue text {
    fill: var(--accent);
  }
  .marca.despliegue.fallida line {
    stroke: var(--danger);
    opacity: 0.45;
  }
  .marca.despliegue.fallida text {
    fill: var(--danger);
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
