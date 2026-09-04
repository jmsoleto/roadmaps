/** Low-level pointer-drag helper: wires window move/up listeners for one gesture. */
export function onDrag(
  e: PointerEvent,
  handlers: { move: (ev: PointerEvent) => void; up: (ev: PointerEvent) => void },
): void {
  e.preventDefault();
  const move = (ev: PointerEvent) => handlers.move(ev);
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    handlers.up(ev);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

/**
 * Cómo se traduce una coordenada a un día.
 *
 * `round` engancha a la frontera más cercana y `floor` a la columna señalada.
 * No es la misma pregunta: elegir dónde EMPIEZA algo es elegir una frontera —el
 * instante en que arranca—, y elegir dónde TERMINA algo con fin inclusivo es
 * elegir un día —aquel sobre el que está el dedo—.
 */
export type DayMode = 'round' | 'floor';

/**
 * Day offset (integer) of a client X coordinate within a track.
 *
 * `round` por defecto para que las tres llamadas que no cambian de sentido con
 * el fin inclusivo —mover, crear arrastrando y el extremo izquierdo— no se
 * toquen, y para que la única que sí cambia lo diga en el sitio de la llamada
 * (D2).
 */
export function clientToDayOffset(
  clientX: number,
  rectLeft: number,
  dayW: number,
  mode: DayMode = 'round',
): number {
  const days = (clientX - rectLeft) / dayW;
  return mode === 'floor' ? Math.floor(days) : Math.round(days);
}
