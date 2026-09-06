<script lang="ts">
  /**
   * One link, as a button big enough to hit without reading (D4).
   *
   * The `5a` family: a 46px badge carrying the link's own gradient with its
   * monogram carved out, the name, one line of description, and the mark that
   * says it leaves. A wide link takes two grid cells, and that is the whole
   * priority language of this application — no ranking, no reordering, just
   * "this one is bigger because I look at it first".
   *
   * A real `<a>` and not a button: middle-click, ⌘-click and "copy link" are
   * things people do to a dashboard, and reimplementing them badly on a `div`
   * is how you find out mid-outage that one of them is missing.
   */
  import { theme } from '../../theme/theme.svelte';
  import { NUMBERED } from '../../links/keyboard';
  import type { Link } from '../../links/model';

  interface Props {
    link: Link;
    /** Position within its area, so the tile can show its number key. */
    index: number;
    focused: boolean;
    onopen: () => void;
    oncustomize: () => void;
    onfocus: () => void;
  }

  let { link, index, focused, onopen, oncustomize, onfocus }: Props = $props();

  let el = $state<HTMLAnchorElement | null>(null);

  const gradient = $derived(
    `linear-gradient(145deg, ${theme.slotColor(link.from)}, ${theme.slotColor(link.to)})`,
  );
  // Over the whole sweep, not over one end: the mark sits across both.
  const ink = $derived(theme.inkForPair(link.from, link.to));
  const numbered = $derived(index < NUMBERED);

  // The store owns the focus, so the DOM follows it rather than the other way
  // round. Guarded, or every unrelated re-render would yank the focus back.
  $effect(() => {
    if (focused && el && document.activeElement !== el) el.focus();
  });
</script>

<a
  bind:this={el}
  class="tile"
  class:wide={link.wide}
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
  {#if numbered}
    <!-- The legend promises the numbers; showing them is what makes the promise
         findable without having to read the legend first. -->
    <span class="key" aria-hidden="true">{index + 1}</span>
  {/if}
  <span class="go" aria-hidden="true">↗</span>
</a>

<style>
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
  .tile.wide {
    grid-column: span 2;
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
  .key,
  .go {
    font-family: var(--mono, ui-monospace, monospace);
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .key {
    margin-left: auto;
    font-size: 11px;
    border: var(--line-width) solid var(--line);
    border-radius: 4px;
    padding: 1px 6px;
  }
  .go {
    font-size: 13px;
  }
  /* Without a number the arrow is what pushes to the right edge. */
  .tile:not(:has(.key)) .go {
    margin-left: auto;
  }
</style>
