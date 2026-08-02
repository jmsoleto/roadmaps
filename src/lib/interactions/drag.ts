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

/** Day offset (integer) of a client X coordinate within a track. */
export function clientToDayOffset(clientX: number, rectLeft: number, dayW: number): number {
  return Math.round((clientX - rectLeft) / dayW);
}
