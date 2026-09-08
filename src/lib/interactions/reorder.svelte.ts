/**
 * The reactive core of a reorder gesture, shared by every view that lets the
 * user move something to a different position.
 *
 * Two boxes, and the line between them is drawn where the views stop agreeing.
 * `DragReorder` is the state machine and the pointer wiring, which are the same
 * whether the things are stacked in a column or laid out on a grid.
 * `RowReorder` adds the one rule that only holds for a column — a row rests at
 * `index * pitch` — and is what the Gantt, the "Todos" view and the area rail
 * use.
 *
 * Links Hub's grid uses `DragReorder` straight, because it has no pitch to be
 * given: how many positions fit on a line depends on the window's width, and a
 * tile takes one cell or two at the user's choice, so where a tile rests comes
 * from a cell layout and not from arithmetic on its index (design decision D1).
 *
 * The pure arithmetic — `dropIndex`, `dropBlockIndex`, `moveInArray` for the
 * columns, `placeCells` and `dropIndexInGrid` for the grid — stays out of this
 * file and reaches it only through the `target` callback, so each caller
 * decides how pixels become an index.
 */

import { ROW_H } from '../config';
import { onDrag } from './drag';

/** A reorder in flight. `payload` is whatever the view needs to build its preview. */
export type Reorder<T> = {
  /** Identity of the held thing, matched against the key the view places by. */
  key: string;
  payload: T;
  from: number;
  to: number;
  /** Pixels travelled since pointerdown, on both axes. */
  dx: number;
  dy: number;
};

/** Everything any view has to say to start one. */
export type DragSpec<T> = {
  key: string;
  payload: T;
  from: number;
  /**
   * Where the thing would land after travelling this far. Already clamped.
   *
   * The travel arrives as an object and not as two numbers on purpose: a
   * column view reads only `y`, and a positional pair would let a one-argument
   * callback silently receive the wrong axis.
   */
  target: (d: { x: number; y: number }) => number;
  /** Called on release, and only when the position actually changed. */
  drop: (to: number) => void;
};

export class DragReorder<T> {
  gesture = $state<Reorder<T> | null>(null);

  get active(): boolean {
    return this.gesture !== null;
  }

  /** True for the thing being held, which is the only one that leaves the flow. */
  held(key: string): boolean {
    return this.gesture?.key === key;
  }

  start(e: PointerEvent, spec: DragSpec<T>): void {
    const { key, payload, from, target, drop } = spec;
    const startX = e.clientX;
    const startY = e.clientY;
    this.gesture = { key, payload, from, to: from, dx: 0, dy: 0 };

    onDrag(e, {
      move: (ev) => {
        const d = { x: ev.clientX - startX, y: ev.clientY - startY };
        this.gesture = { key, payload, from, to: target(d), dx: d.x, dy: d.y };
      },
      up: () => {
        const g = this.gesture;
        this.gesture = null;
        if (g !== null && g.to !== g.from) drop(g.to);
      },
    });
  }
}

/** What a column view has to say to start one. */
export type ReorderSpec<T> = {
  key: string;
  payload: T;
  from: number;
  /** Resting pixel position of the held row. */
  originY: number;
  /** How far up and down the held row may be drawn. */
  minY: number;
  maxY: number;
  /** Where the row would land after travelling `dy` pixels. Already clamped. */
  target: (dy: number) => number;
  /** Called on release, and only when the position actually changed. */
  drop: (to: number) => void;
};

/**
 * A reorder down a single column of evenly spaced rows.
 *
 * The pitch is how far apart two rows sit — the Gantt's `ROW_H`, the area
 * rail's own. It belongs to the view and not to `config.ts`, which holds the
 * Gantt's row height and would become a house constant by accident if a
 * sidebar of another application filed its number there.
 */
export class RowReorder<T> {
  private core = new DragReorder<T>();
  private pitch: number;
  private frame: { originY: number; minY: number; maxY: number } | null = null;

  constructor(pitch: number = ROW_H) {
    this.pitch = pitch;
  }

  get gesture(): Reorder<T> | null {
    return this.core.gesture;
  }

  get active(): boolean {
    return this.core.active;
  }

  held(key: string): boolean {
    return this.core.held(key);
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
    const g = this.core.gesture;
    const f = this.frame;
    if (g !== null && f !== null && g.key === key) {
      return Math.max(f.minY, Math.min(f.maxY, f.originY + g.dy));
    }
    return index * this.pitch;
  }

  start(e: PointerEvent, spec: ReorderSpec<T>): void {
    this.frame = { originY: spec.originY, minY: spec.minY, maxY: spec.maxY };
    this.core.start(e, {
      key: spec.key,
      payload: spec.payload,
      from: spec.from,
      target: (d) => spec.target(d.y),
      drop: spec.drop,
    });
  }
}
