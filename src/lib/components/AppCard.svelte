<script lang="ts">
  /**
   * One application on the hub landing, in whichever of its three states it is.
   *
   * A single component fed by data (D4), not a card each app ships: the
   * restriction is what keeps the grid reading as one system when the fourth
   * and fifth apps arrive.
   *
   * A card that is not live shows **no figures at all** — never zeroes, which
   * would assert something is being counted.
   */
  import type { HubApp } from '../hub/types';
  import AppIcon from './AppIcon.svelte';

  interface Props {
    app: HubApp;
  }

  let { app }: Props = $props();

  const live = $derived(app.state === 'live');
  const summary = $derived(live && app.summary ? app.summary() : null);
</script>

<div class="card" class:dashed={!live}>
  <div class="head">
    <AppIcon identity={app.identity} size={46} muted={!live} />
    <div class="titles">
      <div class="name">{app.name}</div>
      <div class="tagline">{app.tagline}</div>
    </div>
  </div>

  {#if summary}
    <div class="stats">
      {#each summary.stats as stat (stat.label)}
        <div class="stat">
          <div
            class="value"
            class:warn={stat.tone === 'warn'}
            class:danger={stat.tone === 'danger'}
          >
            {stat.value}
          </div>
          <div class="stat-label">{stat.label}</div>
        </div>
      {/each}
    </div>

    <div class="list">
      <div class="list-label">{summary.list.label}</div>
      {#if summary.list.rows.length > 0}
        <div class="rows">
          {#each summary.list.rows as row (row.id)}
            <button type="button" class="row" onclick={() => app.openRow?.(row.id)}>
              <span class="swatch" style:background={row.color}></span>
              <span class="row-label">{row.label}</span>
              <span
                class="row-meta"
                class:warn={row.metaTone === 'warn'}
                class:danger={row.metaTone === 'danger'}>{row.meta}</span
              >
            </button>
          {/each}
        </div>
      {:else}
        <!-- The empty list never swallows the rest of the card: the figures and
             the way in stay exactly where they are. -->
        <div class="empty">{summary.list.emptyLabel}</div>
      {/if}
    </div>

    <div class="actions">
      <button type="button" class="primary" onclick={() => app.open?.()}>
        abrir {app.name.replace(/\s+Hub$/, '')} →
      </button>
      {#if app.create}
        <button type="button" class="secondary" onclick={() => app.create?.()}>+ nuevo</button>
      {/if}
    </div>
  {:else}
    <div class="soon">próximamente</div>
  {/if}
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px 24px 20px;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
  }
  .card.dashed {
    background: var(--veil);
    border-style: dashed;
  }
  .head {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .titles {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
  }
  .dashed .name {
    color: var(--text-dim);
  }
  .tagline {
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--text-dim);
    text-wrap: pretty;
  }
  .stats {
    display: flex;
    gap: 28px;
    padding: 16px 0;
    border-top: var(--line-width) solid var(--line-weak);
    border-bottom: var(--line-width) solid var(--line-weak);
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 26px;
    line-height: 1.1;
    color: var(--text);
  }
  .value.warn {
    color: var(--accent);
  }
  .value.danger {
    color: var(--danger);
  }
  .stat-label,
  .list-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .list-label {
    font-size: 10.5px;
    letter-spacing: 0.1em;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 32px;
    padding: 0 8px;
    border: none;
    border-radius: 5px;
    background: none;
    color: var(--text-mid);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    background: var(--hover);
  }
  .swatch {
    width: 10px;
    height: 10px;
    flex-shrink: 0;
    border-radius: 3px;
    border: var(--line-width) solid var(--bar-border);
  }
  .row-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-meta {
    flex-shrink: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .row-meta.warn {
    color: var(--accent);
  }
  .row-meta.danger {
    color: var(--danger);
  }
  .empty {
    padding: 6px 8px 8px;
    font-size: 13px;
    color: var(--text-dim);
    opacity: 0.8;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 2px;
  }
  .actions button {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    padding: 8px 14px;
    border-radius: 6px;
    cursor: pointer;
  }
  .primary {
    background: var(--accent);
    border: var(--line-width) solid var(--accent);
    color: var(--ink-on-accent);
    font-weight: 500;
  }
  .secondary {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    color: var(--text);
  }
  .secondary:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .soon {
    align-self: flex-start;
    padding: 5px 10px;
    border: var(--line-width) dashed var(--line);
    border-radius: 5px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--text-dim);
  }
</style>
