<script lang="ts">
  /**
   * An application's icon: the `3a` family — a rounded tile carrying the app's
   * own gradient, with its mark carved out in fixed dark ink.
   *
   * The mark is carved rather than drawn in colour so the same shape survives
   * the shrink from the 46px card tile to the 18px switcher tile, where a
   * gradient-on-dark mark would turn to mush.
   *
   * Everything scales off `size`, so the two call sites are one prop apart.
   */
  import { GLYPH_INK, tileGradient, type AppIdentity } from '../hub/identity';

  interface Props {
    identity: AppIdentity;
    /** Tile edge in px. 46 on the cards, 18 in the switcher. */
    size?: number;
    /** Dims the whole tile; used by the states that are not live yet. */
    muted?: boolean;
  }

  let { identity, size = 46, muted = false }: Props = $props();

  // The tile's radius and its mark track the tile, so the silhouette is the
  // same shape at every size rather than a small tile with a big mark.
  const radius = $derived(Math.round(size * 0.24));
  const glyph = $derived(Math.round(size * 0.565));
  // The inner highlight and drop shadow are hairlines at 46px and would smear
  // the 18px tile, so they only apply above a threshold.
  const raised = $derived(size >= 28);
</script>

<span
  class="tile"
  class:muted
  class:raised
  style:width="{size}px"
  style:height="{size}px"
  style:border-radius="{radius}px"
  style:background={tileGradient(identity)}
  aria-hidden="true"
>
  <svg width={glyph} height={glyph} viewBox="0 0 24 24">
    {#if identity.glyph === 'roadmaps'}
      <!-- Three staggered bars: the shape a Gantt makes. -->
      <rect x="2" y="4" width="12" height="4.5" rx="2.2" fill={GLYPH_INK} />
      <rect x="6" y="10" width="16" height="4.5" rx="2.2" fill={GLYPH_INK} opacity="0.72" />
      <rect x="4" y="16" width="9" height="4.5" rx="2.2" fill={GLYPH_INK} opacity="0.48" />
    {:else if identity.glyph === 'decisions'}
      <!-- One question branching into the options it has to choose between. -->
      <circle cx="6" cy="12" r="3.6" fill={GLYPH_INK} />
      <circle cx="18" cy="6" r="3.6" fill={GLYPH_INK} opacity="0.48" />
      <circle cx="18" cy="18" r="3.6" fill={GLYPH_INK} opacity="0.72" />
      <path
        d="M8.6 10.6 L15.2 7.2 M8.6 13.4 L15.2 16.8"
        stroke={GLYPH_INK}
        stroke-width="1.6"
        stroke-linecap="round"
      />
    {:else if identity.glyph === 'api'}
      <!-- Two braces around a value: the shape of a contract. Thick strokes and
           a solid centre, because thin braces turn to mush at 18px. -->
      <path
        d="M9.4 4.4 C6.6 4.4 7.4 10.4 4.6 10.4 C7.4 10.4 6.6 19.6 9.4 19.6"
        fill="none"
        stroke={GLYPH_INK}
        stroke-width="2.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M14.6 4.4 C17.4 4.4 16.6 10.4 19.4 10.4 C16.6 10.4 17.4 19.6 14.6 19.6"
        fill="none"
        stroke={GLYPH_INK}
        stroke-width="2.3"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.72"
      />
      <circle cx="12" cy="12" r="1.9" fill={GLYPH_INK} />
    {:else}
      <path d="M12 4 V20 M4 12 H20" stroke={GLYPH_INK} stroke-width="2.6" stroke-linecap="round" />
    {/if}
  </svg>
</span>

<style>
  .tile {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 0;
  }
  .tile.raised {
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.22) inset,
      0 4px 12px var(--shadow-medium);
  }
  .tile.muted {
    opacity: 0.45;
    box-shadow: none;
  }
</style>
