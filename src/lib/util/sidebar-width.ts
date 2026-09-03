/**
 * Los dos límites del ancho de la columna de nombres, que no son la misma cosa.
 *
 * `clampSidebarDrag` es la **regla de producto**: mientras se arrastra, la
 * columna no pasa de la mitad de la pantalla ni baja del ancho de siempre. La
 * línea de tiempo es la razón de ser de la vista, así que la columna puede
 * llegar a compartir el sitio a partes iguales, nunca a ser la mayoría.
 *
 * `fitSidebarToWindow` es un límite **físico**, y solo eso: al pintar, la
 * columna no se sale de la ventana, porque es `sticky` a la izquierda y una
 * columna más ancha que la ventana dejaría su tirador inalcanzable para
 * siempre. No vuelve a aplicar «la mitad» y no toca el valor guardado, de modo
 * que volver a una pantalla ancha devuelve el ancho intacto (D3).
 *
 * Las dos reciben el ancho disponible en lugar de mirar la ventana por su
 * cuenta: así el store se sigue probando sin navegador, como todo lo demás.
 */

import { DEFAULT_SIDEBAR_W, SIDEBAR_EDGE_MARGIN } from '../config';

/** Un ancho utilizable, o el de siempre si lo que llega no lo es. */
function usable(px: number): number {
  return Number.isFinite(px) ? px : DEFAULT_SIDEBAR_W;
}

/** El ancho que puede fijar un arrastre: entre el mínimo y media pantalla. */
export function clampSidebarDrag(px: number, portW: number): number {
  // El mínimo se aplica el último a propósito: en una ventana tan estrecha que
  // su mitad cae por debajo del ancho de siempre, gana el ancho de siempre. Una
  // columna por debajo de su mínimo no es media vista, es una vista rota.
  return Math.max(DEFAULT_SIDEBAR_W, Math.min(usable(px), Math.floor(portW / 2)));
}

/** El ancho con el que se pinta: el guardado, sin salirse de la ventana. */
export function fitSidebarToWindow(px: number, portW: number): number {
  // `portW` es 0 antes de la primera medida del contenedor. Ahí no hay ventana
  // contra la que ajustar todavía, así que se pinta el valor tal cual.
  if (portW <= 0) return usable(px);
  return Math.max(DEFAULT_SIDEBAR_W, Math.min(usable(px), portW - SIDEBAR_EDGE_MARGIN));
}

/** Un ancho leído del almacén: utilizable, o el de siempre. */
export function readSidebarPref(raw: string | null): number {
  const px = Number(raw);
  // Se comprueba que sea usable, no que quepa: un ancho fijado en una pantalla
  // grande debe sobrevivir a abrirse en una pequeña (D3).
  return Number.isFinite(px) && px >= DEFAULT_SIDEBAR_W ? px : DEFAULT_SIDEBAR_W;
}
