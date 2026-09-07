<script lang="ts">
  /**
   * The container's bar. It names no application (design decision D1).
   *
   * Three things sit here, in this order: what belongs to the container (the
   * wordmark, the app switcher, the theme), what the open application declares
   * (its breadcrumb control and its actions), and what says where the data is.
   *
   * The application's half arrives as data, not markup, so the bar stays one
   * bar: an app says it has an action called "↑ exportar" that is disabled when
   * there is nothing to export, and this file decides that an action is a
   * `.add-tab` button.
   */
  import { store } from '../store/app.svelte';
  import { ui } from '../store/ui.svelte';
  import { location } from '../hub/location.svelte';
  import { hubApp } from '../hub/registry';
  import type { AppAction } from '../hub/types';
  import AppSwitcher from './AppSwitcher.svelte';

  let fileInput: HTMLInputElement;
  let importError = $state<string | null>(null);
  /**
   * The neutral half of what the bar can say.
   *
   * Separate from `importError` and not a tone on top of it: the red one means
   * something did not happen, and sharing a slot between that and "7 enlaces
   * importados" would make red a colour that sometimes means nothing.
   */
  let notice = $state<string | null>(null);
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;
  let errorTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * The file action whose picker is open.
   *
   * One hidden input for the whole bar, pointed at whichever action asked for
   * it (D2). One input per application is what this replaced, and it did not
   * survive contact with a third app.
   */
  let pending: Extract<AppAction, { kind: 'file' }> | null = null;

  /** A notice outlasts an error: it is longer, and nothing went wrong. */
  const NOTICE_MS = 6000;
  const ERROR_MS = 4000;

  const app = $derived(location.appId !== null ? (hubApp(location.appId) ?? null) : null);
  /** The application's own breadcrumb control, when it has one. */
  const Context = $derived(app?.context ?? null);
  const actions = $derived(app?.actions?.() ?? []);

  /**
   * Say what an action handed back, if it handed back anything.
   *
   * An action that returns nothing leaves the bar silent rather than showing an
   * empty notice — the check is on the value being a non-empty string, so the
   * silence is the truth about the action and not an artefact of the markup.
   */
  function show(message: string | void): void {
    if (noticeTimer) clearTimeout(noticeTimer);
    notice = typeof message === 'string' && message.trim() !== '' ? message : null;
    if (notice !== null) noticeTimer = setTimeout(() => (notice = null), NOTICE_MS);
  }

  function fail(message: string): void {
    if (errorTimer) clearTimeout(errorTimer);
    importError = message;
    errorTimer = setTimeout(() => (importError = null), ERROR_MS);
  }

  /** Wipe both, so a new action never speaks over the last one's leftovers. */
  function silence(): void {
    if (noticeTimer) clearTimeout(noticeTimer);
    if (errorTimer) clearTimeout(errorTimer);
    notice = null;
    importError = null;
  }

  /**
   * A message belongs to the bar that produced it.
   *
   * Changing application changes the actions, so anything they said stops being
   * about what is on screen — and a notice about an import left hanging over
   * another application's bar reads as that application's.
   */
  let spokenFor: string | null = null;
  $effect(() => {
    const here = location.appId;
    if (here === spokenFor) return;
    spokenFor = here;
    silence();
  });

  function run(action: AppAction) {
    if (action.disabled) return;
    if (action.kind === 'button') {
      silence();
      show(action.run());
      return;
    }
    pending = action;
    fileInput.accept = action.accept;
    fileInput.click();
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const action = pending;
    pending = null;
    if (!file || !action) return;
    silence();
    try {
      show(action.run(await file.text()));
    } catch (err) {
      fail(err instanceof Error ? err.message : 'No se pudo importar el archivo.');
    }
  }
</script>

<div class="topbar">
  <div class="brand">TECH LEAD HUB</div>
  <AppSwitcher />
  {#if Context}
    <span class="sep" aria-hidden="true">▸</span>
    <Context />
  {:else}
    <div class="spacer"></div>
  {/if}
  {#each actions as action (action.label)}
    <button
      class="add-tab"
      onclick={() => run(action)}
      disabled={action.disabled}
      title={action.title}>{action.label}</button
    >
  {/each}
  <button class="add-tab" onclick={() => ui.openTheme()} title="tema de colores">◐ tema</button>
  <input bind:this={fileInput} type="file" class="hidden-file" onchange={onFile} />
  {#if importError}<span class="import-error">{importError}</span>{/if}
  {#if notice}<span class="notice">{notice}</span>{/if}
  <!-- Not a user name (D10): there are no accounts, and suggesting a session in
       an app whose data dies with the site's storage is the expensive
       misunderstanding. It says where the data is. -->
  <span class="scope">local</span>
  <span class="save-indicator" class:show={store.justSaved}>guardado ✓</span>
</div>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 16px;
    height: 48px;
    background: var(--surface);
    border-bottom: 1px solid var(--line-weak);
    flex-shrink: 0;
  }
  .brand {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.14em;
    color: var(--accent);
    font-weight: 600;
  }
  .sep {
    flex-shrink: 0;
    color: var(--text-dim);
    opacity: 0.6;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }
  /* Stands in for the breadcrumb control's `flex: 1` so the trailing controls
     keep their place when the open application has no second level. */
  .spacer {
    flex: 1;
  }
  .scope {
    flex-shrink: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .add-tab {
    flex-shrink: 0;
    background: none;
    border: 1px dashed var(--line);
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    border-radius: 6px;
    height: 32px;
    padding: 0 12px;
    cursor: pointer;
  }
  .add-tab:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }
  .add-tab:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .hidden-file {
    display: none;
  }
  .import-error {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--danger);
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .notice {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    /* The tint of `guardado ✓`, not of the error: this one informs. */
    color: var(--text-dim);
    /* Wide enough for the longest sentence an action has: the export warning.
       A truncated warning is not a warning. */
    max-width: 440px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .save-indicator {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .save-indicator.show {
    opacity: 1;
  }
</style>
