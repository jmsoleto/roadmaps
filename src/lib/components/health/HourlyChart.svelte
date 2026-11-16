<script lang="ts">
  /**
   * One metric hour by hour, over the 7 days that end at «datos hasta»
   * (health-colector-kibana, «Vista por horas»).
   *
   * The same reading as the daily chart, at a closer range: one series, one
   * axis, an hour without data cuts the line, and every hour can be read as
   * text. There is no moving mean: at this range the hours are the point. A
   * manual release has only a day, so its mark sits at the start of that day; a
   * deployment sits at the hour it finished in, and stands out when an error
   * metric rose in the 24 hours after it (health-despliegues, D5).
   */
  import {
    aislados,
    escalaY,
    formatoEje,
    formatoInstante,
    formatoNumero,
    indiceBajoPuntero,
    formatoTasa,
    indiceDeDia,
    pathDe,
    ticksDia,
    tramos,
    type PuntoHora,
  } from '../../health/chart';
  import { describir, glifo, horaLocal } from '../../health/despliegue-texto';
  import type { Marca } from '../../health/marcas';

  interface Props {
    titulo: string;
    puntos: PuntoHora[];
    /** `tasa`: values are rates (0–1) and read as percentages. */
    modo: 'recuento' | 'tasa';
    zona: string;
    /** Manual releases and deployments, already filtered. */
    marcas: Marca[];
    /** Ids of the deployments after which some error metric rose. */
    resaltadas: ReadonlySet<string>;
    seleccionada: string | null;
    onseleccion: (id: string) => void;
  }

  let {
    titulo,
    puntos,
    modo,
    zona,
    marcas: todas,
    resaltadas,
    seleccionada,
    onseleccion,
  }: Props = $props();
  const HORA_MS = 3_600_000;

  const H = 170;
  const PAD = { top: 30, right: 12, bottom: 22, left: 52 };

  let ancho = $state(720);
  let hover = $state<number | null>(null);

  const plotW = $derived(Math.max(60, ancho - PAD.left - PAD.right));
  const plotH = H - PAD.top - PAD.bottom;

  // Rates are drawn in percent so the axis reads like the text does.
  const factor = $derived(modo === 'tasa' ? 100 : 1);
  const maximo = $derived(Math.max(0, ...puntos.map((p) => (p.valor ?? 0) * factor)));
  const escala = $derived(escalaY(maximo));
  const x = $derived((i: number) => PAD.left + (i / Math.max(1, puntos.length - 1)) * plotW);
  const yDe = $derived((v: number) => PAD.top + plotH - ((v * factor) / escala.tope) * plotH);
  const yValor = $derived((i: number) => yDe(puntos[i].valor ?? 0));

  const lineas = $derived(tramos(puntos));
  const solos = $derived(aislados(puntos));
  const dias = $derived(ticksDia(puntos, zona, Math.max(2, Math.floor(plotW / 60))));
  const hayDatos = $derived(puntos.some((p) => p.valor !== null));

  const manuales = $derived.by(() => {
    const porDia = new Map<string, Marca[]>();
    for (const m of todas) {
      if (m.origen !== 'manual') continue;
      const lista = porDia.get(m.dia);
      if (lista) lista.push(m);
      else porDia.set(m.dia, [m]);
    }
    return [...porDia].flatMap(([dia, lista]) => {
      const i = indiceDeDia(puntos, dia, zona);
      return i === null
        ? []
        : [{ dia, px: x(i), id: lista[0].id, etiqueta: lista.map((v) => v.version).join(' · ') }];
    });
  });

  /** Each deployment at the hour it finished in, inside the 7 days on screen. */
  const despliegues = $derived.by(() => {
    if (puntos.length === 0) return [];
    const inicio = puntos[0].t;
    return todas.flatMap((m) => {
      if (m.origen !== 'despliegue') return [];
      const i = Math.floor((m.instante - inicio) / HORA_MS);
      if (i < 0 || i >= puntos.length) return [];
      const resaltada = resaltadas.has(m.id);
      return [
        {
          m,
          px: x(i),
          glifo: glifo(m.d),
          resaltada,
          fallida: m.d.result !== 'success',
          descripcion: `${describir(m.d)}, ${horaLocal(m.instante)}${resaltada ? '; algún error sube en las 24 horas siguientes' : ''}`,
        },
      ];
    });
  });

  function teclaMarca(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onseleccion(id);
    }
  }

  const texto = (v: number | null) =>
    v === null
      ? modo === 'tasa'
        ? 'sin tasa'
        : 'sin dato'
      : modo === 'tasa'
        ? formatoTasa(v)
        : formatoNumero(v);
  const eje = (t: number) => (modo === 'tasa' ? `${formatoEje(t)} %` : formatoEje(t));

  function mover(e: PointerEvent) {
    // The listener is the plot rect, which already starts at PAD.left.
    const caja = (e.currentTarget as SVGElement).getBoundingClientRect();
    hover = indiceBajoPuntero(e.clientX - caja.left, plotW, puntos.length);
  }

  const punto = $derived(hover === null ? null : (puntos[hover] ?? null));
  const tooltipIzquierda = $derived(hover !== null && x(hover) > ancho / 2);
</script>

{#if !hayDatos}
  <p class="sin-datos">Sin datos por horas en estos 7 días.</p>
{:else}
  <div class="chart" bind:clientWidth={ancho}>
    <svg width={ancho} height={H} role="img" aria-label="{titulo} por horas, últimos 7 días">
      {#each escala.ticks as t (t)}
        <line
          class="grid"
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={yDe(t / factor)}
          y2={yDe(t / factor)}
        />
        <text class="eje" x={PAD.left - 8} y={yDe(t / factor) + 4} text-anchor="end">{eje(t)}</text>
      {/each}
      {#each dias as d (d.indice)}
        <line class="dia" x1={x(d.indice)} x2={x(d.indice)} y1={PAD.top} y2={PAD.top + plotH} />
        <text class="eje" x={x(d.indice)} y={H - 6} text-anchor="start">{d.etiqueta}</text>
      {/each}

      {#each lineas as t (t.desde)}
        <path class="linea" d={pathDe(t.desde, t.hasta, x, yValor)} />
      {/each}
      {#each solos as i (i)}
        <circle class="solo" cx={x(i)} cy={yValor(i)} r="3" />
      {/each}

      {#each manuales as m (m.dia)}
        <g class="marca" class:activa={m.id === seleccionada}>
          <line x1={m.px} x2={m.px} y1={PAD.top - 4} y2={PAD.top + plotH} />
          <text x={m.px} y={12} text-anchor={m.px > ancho - 60 ? 'end' : 'middle'}
            >{m.etiqueta}</text
          >
        </g>
      {/each}

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

      {#each despliegues as d (d.m.id)}
        <g
          class="marca despliegue"
          class:fallida={d.fallida}
          class:resaltada={d.resaltada}
          class:activa={d.m.id === seleccionada}
          role="button"
          tabindex="0"
          aria-label={d.descripcion}
          onclick={() => onseleccion(d.m.id)}
          onkeydown={(e) => teclaMarca(e, d.m.id)}
        >
          <title>{d.descripcion}</title>
          <line x1={d.px} x2={d.px} y1={PAD.top - 4} y2={PAD.top + plotH} />
          <rect class="marca-hit" x={d.px - 6} y={14} width="12" height={PAD.top + plotH - 14} />
          <text x={d.px} y={24} text-anchor={d.px > ancho - 60 ? 'end' : 'middle'}>
            {d.resaltada ? '▲' : ''}{d.glifo}
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
        <div class="t-dia">{formatoInstante(punto.t, zona)}</div>
        <div>{texto(punto.valor)}</div>
      </div>
    {/if}
  </div>

  <details class="tabla">
    <summary>ver como tabla</summary>
    <div class="tabla-scroll">
      <table>
        <thead>
          <tr><th scope="col">Hora</th><th scope="col">{modo === 'tasa' ? 'Tasa' : 'Valor'}</th></tr
          >
        </thead>
        <tbody>
          {#each [...puntos].reverse() as p (p.t)}
            <tr>
              <th scope="row">{formatoInstante(p.t, zona)}</th>
              <td>{texto(p.valor)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if despliegues.length > 0}
        <p class="tabla-despliegues">Despliegues en estos 7 días:</p>
        <ul class="tabla-despliegues">
          {#each despliegues as d (d.m.id)}<li>{d.glifo} {d.descripcion}</li>{/each}
        </ul>
      {/if}
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
  .dia {
    stroke: var(--line-weak);
    stroke-width: 1;
    stroke-dasharray: 1 3;
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
  .linea {
    stroke: var(--accent);
    stroke-width: 1.5;
  }
  .solo {
    fill: var(--accent);
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
  .marca {
    outline: none;
  }
  .marca.despliegue {
    cursor: pointer;
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
  .marca.despliegue.resaltada line {
    stroke: var(--danger);
    stroke-width: 2.5;
    opacity: 1;
  }
  .marca.despliegue.resaltada text {
    fill: var(--danger);
    font-weight: 600;
  }
  .marca.activa line,
  .marca.despliegue:focus-visible line {
    stroke-width: 2.5;
    opacity: 1;
  }
  .marca-hit {
    fill: transparent;
  }
  .tabla-despliegues {
    margin: 8px 0 0;
    padding-left: 0;
    list-style: none;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-mid);
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
  .t-dia {
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
