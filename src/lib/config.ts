/** Visual + interaction constants ported from roadmap_tool_6_6_2.html. */

/** Row height in pixels. */
export const ROW_H = 52;

/**
 * Ancho por defecto de la columna de nombres, en píxeles.
 *
 * Es a la vez el valor inicial y el **mínimo**, y que sean el mismo número es
 * deliberado: el ancho de siempre es el suelo, porque por debajo de él la fila
 * deja de tener sitio para su nombre, su progreso y sus botones. Estrechar no
 * es una necesidad que nadie haya expresado; ensanchar sí.
 */
export const DEFAULT_SIDEBAR_W = 250;

/**
 * Holgura entre el tirador de la columna y el borde de la ventana.
 *
 * La columna es `sticky` a la izquierda y no se desplaza con el scroll
 * horizontal, así que un ancho mayor que la ventana dejaría su tirador
 * permanentemente fuera de alcance. Este margen lo mantiene claramente dentro,
 * no rozando el borde.
 */
export const SIDEBAR_EDGE_MARGIN = 48;

/** Available zoom levels, in pixels per day. */
export const ZOOM_LEVELS = [4, 6, 8, 12, 18, 26] as const;

/** Default zoom level (8 px/day), matching the original. */
export const DEFAULT_DAY_W = 8;

/*
 * The bar/dot palette used to live here as absolute hex colors. It now belongs
 * to the theme (`theme/presets.ts`), since each theme carries its own palette
 * and phases/items store a slot into it rather than a color.
 */

/** Sprint length in days (bi-weekly). */
export const SPRINT_LEN = 14;

/**
 * Absolute sprint anchor: Sprint 09 starts Monday 2026-06-29.
 * Sprints are always 14 days with no renumbering, so this anchor fixes the
 * numbering for every roadmap regardless of its own start date.
 */
export const SPRINT_ANCHOR_DATE = '2026-06-29';
export const SPRINT_ANCHOR_NUM = 9;
