<script lang="ts">
  /**
   * One link, as a button big enough to hit without reading (D4).
   *
   * The `5a` family: a 46px badge carrying the link's own gradient with its
   * monogram carved out, the name, one line of description, and the mark that
   * says it leaves. A wide link takes two grid cells, and that is the whole
   * priority language of this application — no ranking, no reordering by usage,
   * just "this one is bigger because I look at it first".
   *
   * A real `<a>` and not a button: middle-click, ⌘-click and "copy link" are
   * things people do to a dashboard, and reimplementing them badly on a `div`
   * is how you find out mid-outage that one of them is missing.
   *
   * Which is why the anchor is no longer the grid item (D6). An anchor may not
   * contain interactive descendants, and — worse than validity — a grip inside
   * it would have to keep every gesture from ending in a navigation, which
   * `preventDefault()` on a pointerdown does not reliably do. The `.cell`
   * wrapper removes the problem instead of managing it: the grip, the pencil
   * and the two nudge buttons are the anchor's siblings, so no click on it is
   * ever made.
   *
   * What a tile can do sits in a bar along its bottom edge, and that edge is
   * the one place it fits: the badge is 46px centred in 104, and the text
   * block is centred too, so below ~75px the whole width is empty. The pencil
   * goes at one end and the nudges at the other because they answer different
   * questions — what this link is, and what number it holds — and three 12px
   * glyphs in a row would have to be read one by one (D1).
   */
  import { theme } from '../../theme/theme.svelte';
  import { NUMBERED } from '../../links/keyboard';
  import type { Link } from '../../links/model';

  interface Props {
    link: Link;
    /** Position within its area. What a nudge moves it from. */
    index: number;
    /**
     * The position it would hold if the gesture in flight ended now, which is
     * the one it shows. The two are the same except while something is being
     * dragged, and there they must differ: a tile that has already slid into
     * the second slot but still shows the number it is leaving behind puts two
     * of the same number on screen at once — its own and the one the waiting
     * slot is promising.
     */
    slot: number;
    /** How many links the area holds, so the last one cannot be nudged further. */
    count: number;
    focused: boolean;
    /** The tile in hand: it follows the pointer instead of its cell. */
    held: boolean;
    /** A gesture is in flight, so the tiles that are not held slide. */
    reordering: boolean;
    /** How far from its own cell this tile is drawn right now. */
    offset: { x: number; y: number };
    onopen: () => void;
    oncustomize: () => void;
    onfocus: () => void;
    ongrab: (e: PointerEvent) => void;
    onmove: (to: number) => void;
  }

  let {
    link,
    index,
    slot,
    count,
    focused,
    held,
    reordering,
    offset,
    onopen,
    oncustomize,
    onfocus,
    ongrab,
    onmove,
  }: Props = $props();

  let el = $state<HTMLAnchorElement | null>(null);

  const gradient = $derived(
    `linear-gradient(145deg, ${theme.slotColor(link.from)}, ${theme.slotColor(link.to)})`,
  );
  // Over the whole sweep, not over one end: the mark sits across both.
  const ink = $derived(theme.inkForPair(link.from, link.to));
  const numbered = $derived(slot < NUMBERED);

  // The store owns the focus, so the DOM follows it rather than the other way
  // round. Guarded, or every unrelated re-render would yank the focus back.
  $effect(() => {
    if (focused && el && document.activeElement !== el) el.focus();
  });
</script>

<div
  class="cell"
  class:wide={link.wide}
  class:held
  class:sliding={reordering && !held}
  style:transform="translate({offset.x}px, {offset.y}px)"
>
  <a
    bind:this={el}
    class="tile"
    class:focused
    href={link.url}
    target="_blank"
    rel="noopener noreferrer"
    title={link.description === '' ? link.name : `${link.name} — ${link.description}`}
    onclick={onopen}
    {onfocus}
    onkeydown={(e) => {
      // `E` on the tile itself, so the shortcut works whether the focus came
      // from the keyboard or from a click.
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        oncustomize();
      }
    }}
  >
    <span class="badge" style:background={gradient} style:color={ink}>{link.monogram}</span>
    <div class="text">
      <span class="name">{link.name}</span>
      {#if link.description !== ''}<span class="desc">{link.description}</span>{/if}
    </div>
    <span class="go" aria-hidden="true">↗</span>
  </a>

  <!-- The badge is the position, so the badge is what you grab (D5): you take
       hold of the 4 and drop it where you want the 4 to be. Past the ninth
       there is no key, and the handle glyph is what teaches where the numbered
       range ends — which until now could only be found by pressing `9` and
       seeing that the next one does nothing. Not a tab stop: the two nudge
       buttons below are the way in without a mouse. -->
  <button
    type="button"
    class="grip"
    class:plain={!numbered}
    tabindex={-1}
    title="mover el enlace"
    aria-label="mover {link.name}"
    onpointerdown={ongrab}>{numbered ? slot + 1 : '⠿'}</button
  >

  <!-- Shown on hover *or* focus, and the pair is the point (D2). With a mouse a
       link's focus arrives by clicking it, and clicking it opens a tab — so
       actions that appear only on focus are actions you can only discover
       after opening the panel. That is how editing ended up reachable solely
       through the `E` key, and how the nudges ended up costing a navigation.

       Always in the DOM and hidden with CSS, with a roving `tabindex` instead
       of an `{#if}` (D3). The `{#if focused}` this replaces did two jobs at
       once: it hid them, and it kept them out of every other tile's tab order.
       Mounting them all unconditionally would turn a nine-link area into
       thirty-six tab stops, so only the focused tile's actions are stops —
       which leaves the tab order exactly as it was. -->
  <div class="actions" class:shown={focused}>
    <button
      type="button"
      class="act"
      tabindex={focused ? 0 : -1}
      title="editar el enlace"
      aria-label="editar {link.name}"
      onclick={oncustomize}>✎ editar</button
    >
    <span class="nudge">
      <button
        type="button"
        class="act step"
        tabindex={focused ? 0 : -1}
        title="mover a la izquierda"
        aria-label="mover {link.name} una posición antes"
        disabled={index === 0}
        onclick={() => onmove(index - 1)}>◂</button
      >
      <button
        type="button"
        class="act step"
        tabindex={focused ? 0 : -1}
        title="mover a la derecha"
        aria-label="mover {link.name} una posición después"
        disabled={index === count - 1}
        onclick={() => onmove(index + 1)}>▸</button
      >
    </span>
  </div>
</div>

<style>
  .cell {
    position: relative;
    min-width: 0;
  }
  .cell.wide {
    grid-column: span 2;
  }
  /* The held tile leaves the grid; the rest slide under it. */
  .cell.sliding {
    transition: transform 120ms ease;
  }
  .cell.held {
    z-index: 3;
  }
  .cell.held .tile {
    box-shadow: 0 8px 24px rgb(0 0 0 / 26%);
    border-color: var(--accent);
    /* Translucent while it is in hand, and not for effect: the tile rides under
       the pointer and the slot it is heading for is drawn at the pointer too,
       so at full opacity the tile covers the very thing it is being aimed at.
       Letting the slot read through is what makes the destination visible. */
    opacity: 0.72;
  }
  .tile {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 13px;
    height: 104px;
    padding: 16px;
    border-radius: 10px;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    color: var(--text);
    text-decoration: none;
    min-width: 0;
  }
  .tile:hover {
    background: var(--hover);
    border-color: var(--accent);
  }
  .tile.focused,
  .tile:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 var(--focus-ring, 2px) var(--accent);
  }
  .badge {
    width: 46px;
    height: 46px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 21px;
    font-weight: 600;
    flex-shrink: 0;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.22) inset;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.01em;
  }
  .desc {
    font-size: 12px;
    color: var(--text-dim);
  }
  .name,
  .desc {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .go {
    /* Now that the number lives outside the anchor, the arrow always is what
       pushes to the right edge. */
    margin-left: auto;
    font-family: var(--mono, ui-monospace, monospace);
    color: var(--text-dim);
    flex-shrink: 0;
    font-size: 13px;
  }
  .grip {
    position: absolute;
    top: 12px;
    right: 12px;
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 11px;
    line-height: 1;
    color: var(--text-dim);
    background: none;
    border: var(--line-width) solid var(--line);
    border-radius: 4px;
    padding: 2px 6px;
    cursor: grab;
    touch-action: none;
  }
  /* Past the ninth there is no key to show, so the handle stops pretending to
     be one and is only a handle. */
  .grip.plain {
    border-color: transparent;
    opacity: 0;
  }
  .cell:hover .grip.plain,
  .cell.held .grip.plain {
    opacity: 1;
  }
  /* While a tile is in hand its own number is the one it is leaving behind, and
     it lands a few pixels from the number the slot underneath is promising —
     close enough for a `1` over a `7` to read as seventeen. The only number
     worth showing during the gesture is the one in the slot. */
  .cell.held .grip {
    opacity: 0;
  }
  .grip:hover {
    color: var(--text);
    border-color: var(--accent);
  }
  .grip:active {
    cursor: grabbing;
  }
  /* The bar spans the tile so the pencil and the nudges can sit at opposite
     ends, and that span is exactly why it must not take the pointer itself
     (D4): an invisible strip across the bottom would turn the edge of the tile
     into a place where clicking opens nothing — a fault the middle of the tile
     hides, because the middle keeps working. `visibility` and not opacity
     alone, so the buttons are unclickable while the bar is away. */
  .actions {
    position: absolute;
    left: 12px;
    right: 10px;
    bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
    visibility: hidden;
    opacity: 0;
    transition:
      opacity 90ms ease,
      visibility 90ms;
  }
  .cell:hover .actions,
  .actions.shown {
    visibility: visible;
    opacity: 1;
  }
  /* Nothing to offer while something is in flight: the tiles under the pointer
     are sliding, and a button that slides away as it is aimed at is worse than
     no button. Same reason the grip hides on the held tile. */
  .cell.held .actions,
  .cell.sliding .actions {
    visibility: hidden;
    opacity: 0;
  }
  .nudge {
    display: flex;
    gap: 2px;
  }
  .act {
    pointer-events: auto;
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 2px 5px;
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 11px;
    line-height: 1;
  }
  .act:hover:not(:disabled) {
    color: var(--accent);
  }
  .act:focus-visible {
    outline: var(--focus-ring, 2px) solid var(--accent);
    outline-offset: 1px;
    border-radius: 3px;
  }
  .step {
    font-size: 12px;
  }
  .step:hover:not(:disabled) {
    color: var(--text);
  }
  .step:disabled {
    opacity: 0.3;
    cursor: default;
  }
</style>
