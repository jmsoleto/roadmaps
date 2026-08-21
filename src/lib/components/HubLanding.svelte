<script lang="ts">
  /**
   * The hub landing: the start of the session.
   *
   * It answers "what have I got today" before asking which application to open,
   * and it does so knowing nothing about roadmaps or decisions — it iterates the
   * registry and renders whatever each app reports.
   */
  import { hubApps } from '../hub/registry';
  import { APP_IDENTITIES } from '../hub/identity';
  import { formatLongDate, formatRelative } from '../hub/relative-time';
  import { byToneDescending, type Alert } from '../hub/types';
  import { usage } from '../hub/usage.svelte';
  import AppCard from './AppCard.svelte';
  import AppIcon from './AppIcon.svelte';

  const apps = $derived(hubApps());

  const alerts = $derived<Alert[]>(
    apps
      .filter((a) => a.state === 'live' && a.summary)
      .flatMap((a) => a.summary!().alerts)
      .sort(byToneDescending),
  );

  const now = Date.now();

  /**
   * The headline states what is going on, not how many applications exist (D9).
   *
   * The mock's "Tus dos frentes abiertos" encodes the app count in a sentence;
   * with three apps it lies, and with one it already does.
   */
  const headline = $derived(
    alerts.length === 0
      ? 'Todo va según el plan'
      : alerts.length === 1
        ? 'Hay una cosa que mirar hoy'
        : `Hay ${alerts.length} cosas que mirar hoy`,
  );
</script>

<div class="landing">
  <header class="head">
    <div class="titles">
      <div class="eyebrow">{formatLongDate(now)} · estado de hoy</div>
      <h1>{headline}</h1>
    </div>
    <div class="badges">
      {#if alerts.length > 0}
        <span class="badge">{alerts.length} aviso{alerts.length === 1 ? '' : 's'}</span>
      {/if}
      {#if usage.lastSeen !== null}
        <span class="badge">último acceso · {formatRelative(usage.lastSeen, now)}</span>
      {/if}
    </div>
  </header>

  <div class="grid">
    {#each apps as app (app.id)}
      <AppCard {app} />
    {/each}

    <!-- Not a registry entry: the anonymous claim that more apps fit, and the
         slot the next one lands in. -->
    <div class="future">
      <AppIcon identity={APP_IDENTITIES.future} size={46} muted />
      <div class="future-name">Próximamente…</div>
      <p class="future-text">
        Cada frente recurrente del día a día de un tech lead puede entrar aquí como una aplicación
        más.
      </p>
    </div>
  </div>

  {#if alerts.length > 0}
    <section class="alerts">
      <div class="alerts-label">LO QUE NO PUEDE ESPERAR</div>
      <div class="alerts-grid">
        {#each alerts as alert (alert.id)}
          <div
            class="alert"
            class:warn={alert.tone === 'warn'}
            class:danger={alert.tone === 'danger'}
          >
            <div class="alert-text">{alert.text}</div>
            <div class="alert-source">{alert.source}</div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .landing {
    height: 100%;
    overflow-y: auto;
    /* The page never scrolls sideways; wide content manages its own overflow. */
    overflow-x: hidden;
    padding: 34px 40px 40px;
    display: flex;
    flex-direction: column;
    gap: 34px;
  }
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  .titles {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--text);
    text-wrap: pretty;
  }
  .badges {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .badge {
    padding: 7px 12px;
    border-radius: 6px;
    border: var(--line-width) solid var(--line);
    background: var(--surface-2);
    color: var(--text-mid);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    white-space: nowrap;
  }
  /* Fixed-width columns that flow, and collapse to one when they cannot fit. */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(420px, 100%), 420px));
    gap: 20px;
    justify-content: start;
  }
  .future {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 12px;
    min-height: 260px;
    padding: 22px 24px 20px;
    background: var(--veil);
    border: var(--line-width) dashed var(--line);
    border-radius: 10px;
  }
  .future-name {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-dim);
  }
  .future-text {
    margin: 0;
    max-width: 300px;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--text-dim);
    opacity: 0.8;
    text-wrap: pretty;
  }
  .alerts {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .alerts-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }
  /* `auto-fill` and not `auto-fit`: empty tracks stay, so a lone alert keeps a
     card's width instead of stretching across the whole page. */
  .alerts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
    gap: 12px;
  }
  .alert {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 14px 16px;
    background: var(--hover);
    border: var(--line-width) solid var(--line);
    border-left: 2px solid var(--text-dim);
    border-radius: 6px;
  }
  .alert.warn {
    border-left-color: var(--accent);
  }
  .alert.danger {
    background: var(--tint-danger);
    border-left-color: var(--danger);
  }
  .alert-text {
    font-size: 13px;
    color: var(--text);
    text-wrap: pretty;
  }
  .alert-source {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
</style>
