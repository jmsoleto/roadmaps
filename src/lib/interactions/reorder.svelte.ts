/**
 * The reactive core of a vertical reorder gesture, shared by the two views that
 * list rows: the Gantt and the "Todos" view.
 *
 * What lives here is what the two have in common — the state of the gesture,
 * the pointer wiring, and the clamped position of the held row. What does not
 * is the preview index map, because that is exactly where they differ: one has
 * a hierarchy of phase blocks and the other a flat list, and folding both into
 * one place would need a parameter that reintroduced the hierarchy into the
 * view that has none (design decision D6).
 *
 * The pure arithmetic — `dropIndex`, `dropBlockIndex`, `moveInArray` — stays in
 * `model/derive.ts` and reaches this file only through the `target` callback,
 * so each caller decides how pixels become an index.
 */

import { ROW_H } from '../config';
import { onDrag } from './drag';

/** A reorder in flight. `payload` is whatever the view needs to build its preview. */
export type Reorder<T> = {
  /** Identity of the held row, matched against the key the view places rows by. */
  key: string;
  payload: T;
  from: number;
  to: number;
  /** Pixels travelled since pointerdown. */
  dy: number;
  /** Resting pixel position of the held row. */
  originY: number;
  /** How far up and down the held row may be drawn. */
  minY: number;
  maxY: number;
};

/** Everything a view has to say to start one. */
export type ReorderSpec<T> = {
  key: string;
  payload: T;
  from: number;
  originY: number;
  minY: number;
  maxY: number;
  /** Where the row would land after travelling `dy` pixels. Already clamped. */
  target: (dy: number) => number;
  /** Called on release, and only when the position actually changed. */
  drop: (to: number) => void;
};

export class RowReorder<T> {
  gesture = $state<Reorder<T> | null>(null);

  get active(): boolean {
    return this.gesture !== null;
  }

  /** True for the row being held, which is the only one that leaves the grid. */
  held(key: string): boolean {
    return this.gesture?.key === key;
  }

  /**
   * Where a row sits right now: its slot in the preview list, or — for the row
   * in hand — the pointer, clamped.
   *
   * The clamp is what makes containment visible. The drop index is already
   * restricted to positions the row can actually take, so without it the held
   * row would sail past its neighbours to somewhere it can never land. Past the
   * last position the pointer keeps going and the row stops, which is how the
   * limit gets taught rather than explained.
   */
  y(key: string, index: number): number {
    const g = this.gesture;
    if (g !== null && g.key === key) {
      return Math.max(g.minY, Math.min(g.maxY, g.originY + g.dy));
    }
    return index * ROW_H;
  }

  start(e: PointerEvent, spec: ReorderSpec<T>): void {
    const { key, payload, from, originY, minY, maxY, target, drop } = spec;
    const startY = e.clientY;
    this.gesture = { key, payload, from, to: from, dy: 0, originY, minY, maxY };

    onDrag(e, {
      move: (ev) => {
        const dy = ev.clientY - startY;
        this.gesture = { key, payload, from, to: target(dy), dy, originY, minY, maxY };
      },
      up: () => {
        const g = this.gesture;
        this.gesture = null;
        if (g !== null && g.to !== g.from) drop(g.to);
      },
    });
  }
}
