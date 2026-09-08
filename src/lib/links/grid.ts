/**
 * Where the tiles of an area sit, and where the one in hand would land.
 *
 * Pure but for `columnsOf`, which is the single thing that has to be measured.
 * Everything else is a function of the widths and the column count, so the
 * arithmetic of a two-axis reorder can be tested without a browser — same
 * reason the rest of this application's rules live outside its screens.
 *
 * The one fact that makes all of this cheap: CSS Grid's automatic flow is
 * *sparse*, so the placement cursor never goes backwards. A double that does
 * not fit in what is left of a line jumps to the next one and leaves the hole
 * behind it, and no later single backfills it. That means **the visual order is
 * always the array order** — there is no separate placement to represent, and
 * dropping is a question about a sequence rather than about a canvas (D2).
 */

/** Track width, tile height and the gutter between them, in pixels. */
export interface GridMetrics {
  cellW: number;
  cellH: number;
  gap: number;
}

/**
 * The cell each tile lands on, given how many cells each one takes.
 *
 * A tile takes one cell or two; anything wider than the grid is impossible, and
 * at a single column a double is cut down to one by the grid itself, so the
 * arithmetic says the same thing the screen does.
 */
export function placeCells(widths: readonly number[], cols: number): number[] {
  const columns = Math.max(1, cols);
  const cells: number[] = [];
  let cursor = 0;
  for (const raw of widths) {
    const w = Math.min(Math.max(1, raw), columns);
    // The jump: a double at the last column of a line cannot start there.
    if (w === 2 && cursor % columns === columns - 1) cursor++;
    cells.push(cursor);
    cursor += w;
  }
  return cells;
}

/**
 * How wide a run of `span` cells is, gutter included.
 *
 * One cell is one track; two are two tracks and the gutter between them, which
 * is not the same as twice a track and is exactly the kind of arithmetic that
 * goes wrong by 14px if it is done at the call site.
 */
export function spanWidth(span: number, m: GridMetrics): number {
  const cells = Math.max(1, span);
  return cells * m.cellW + (cells - 1) * m.gap;
}

/** The top-left corner of a cell, relative to the grid's own origin. */
export function cellRect(cell: number, cols: number, m: GridMetrics): { x: number; y: number } {
  const columns = Math.max(1, cols);
  return {
    x: (cell % columns) * (m.cellW + m.gap),
    y: Math.floor(cell / columns) * (m.cellH + m.gap),
  };
}

/**
 * Where the tile held at `from` would land after travelling `dx, dy`.
 *
 * Asked forwards and not backwards (D3). Going from a point to an index would
 * need the inverse of `placeCells`, and there is no clean one — two different
 * indices can put a tile on the same cell once doubles and holes are in play.
 * So every candidate position is tried, the reordered array is placed, and the
 * winner is the one that puts the tile nearest the pointer.
 *
 * It is quadratic on the handful of tiles an area holds, and it buys a property
 * no formula gives: **the preview is the placement**. What is on screen during
 * the drag is literally the result of letting go, not an approximation of it.
 *
 * "Nearest" is measured **in reading order and not in a straight line**, which
 * is not a detail. A grid's last line is usually a short one, so a pointer
 * dragged far past the bottom-right corner is in plain distance closer to the
 * end of a full line above than to the last tile — and the gesture would refuse
 * to reach the end of the list, which is exactly where a tile is most often
 * being sent. Reducing the pointer to a cell of the flow makes going further
 * always mean going later, and makes the far corner clamp to the last position
 * the way the column views clamp to the last row.
 */
export function dropIndexInGrid(
  from: number,
  dx: number,
  dy: number,
  widths: readonly number[],
  cols: number,
  m: GridMetrics,
): number {
  const n = widths.length;
  if (n === 0 || from < 0 || from >= n) return from;

  const columns = Math.max(1, cols);
  const resting = cellRect(placeCells(widths, cols)[from], cols, m);

  // The pointer as a cell of the flow. The column is clamped so that dragging
  // off the right edge stops at the end of that line instead of wrapping onto
  // the next one; the row is only floored at zero, so dragging below the last
  // line keeps counting and reaches the end.
  const col = Math.round((resting.x + dx) / (m.cellW + m.gap));
  const row = Math.round((resting.y + dy) / (m.cellH + m.gap));
  const at = Math.max(0, Math.min(columns - 1, col)) + Math.max(0, row) * columns;

  let best = from;
  let bestDistance = Infinity;
  for (let to = 0; to < n; to++) {
    const order = widths.slice();
    const [w] = order.splice(from, 1);
    order.splice(to, 0, w);
    const distance = Math.abs(placeCells(order, cols)[to] - at);
    // Strictly closer, so a tie leaves the tile at the lower index and the
    // preview does not flicker between two equally good answers.
    if (distance < bestDistance) {
      bestDistance = distance;
      best = to;
    }
  }
  return best;
}

/**
 * What the grid is doing right now: how many columns, and how wide a track is.
 *
 * The only impure thing in this file, and it is one call. The track count and
 * the track width are read off the resolved `grid-template-columns` rather than
 * worked out from `auto-fill` over `minmax()`, which would be duplicating a
 * formula CSS has already resolved — and would have to be kept in step with the
 * stylesheet by hand.
 *
 * Read once when the gesture starts and not again: resizing the window with a
 * finger down on a tile is not a case worth code.
 */
export function measureGrid(
  grid: HTMLElement,
  gap: number,
  cellH: number,
): { cols: number; metrics: GridMetrics } {
  const tracks = getComputedStyle(grid)
    .gridTemplateColumns.trim()
    .split(/\s+/)
    .filter((t) => t !== '' && t !== 'none');
  const cols = Math.max(1, tracks.length);

  const first = Number.parseFloat(tracks[0] ?? '');
  const cellW =
    Number.isFinite(first) && first > 0
      ? first
      : // A grid that has not been laid out yet reports nothing usable. Falling
        // back to its own width keeps the gesture honest instead of dividing by
        // a zero-width track.
        Math.max(1, (grid.clientWidth - (cols - 1) * gap) / cols);

  return { cols, metrics: { cellW, cellH, gap } };
}
