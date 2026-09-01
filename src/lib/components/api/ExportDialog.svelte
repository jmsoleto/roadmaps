<script lang="ts">
  /**
   * The contract, on its way out (D8).
   *
   * Four tabs and not four buttons: what you choose is the format to look at
   * the same thing in.
   *
   * The validator sits **above** the tabs, always visible. It belongs to no
   * output in particular, and the PRD is explicit that it is seen when
   * exporting — hidden in a fifth tab it would exist and be useless. It never
   * blocks: mid-meeting, an incomplete contract handed over beats none, and
   * whoever is exporting is already looking at what is missing.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { apiUi } from '../../api/ui.svelte';
  import { buildOpenApi } from '../../api/openapi';
  import { toYaml } from '../../api/yaml';
  import { briefOf } from '../../api/brief';
  import { validateContract } from '../../api/validate';
  import { exampleOf } from '../../api/example';
  import { downloadText } from '../../hub/download';

  type TabId = 'yaml' | 'json' | 'examples' | 'brief';

  let panelEl = $state<HTMLDivElement | null>(null);
  let tab = $state<TabId>('yaml');
  let copied = $state(false);
  let opener: HTMLElement | null = null;

  const contract = $derived(apiContracts.open);
  const issues = $derived(contract ? validateContract(contract) : []);

  /** A file name that survives being saved: no accents, no spaces. */
  const slug = $derived(
    (contract?.title ?? 'api')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'api',
  );

  /** The examples of the open endpoint, each labelled by what it is. */
  function examplesText(): string {
    const endpoint = apiContracts.openEndpoint;
    if (!endpoint) return '(elige un endpoint para ver sus ejemplos)';
    const parts: string[] = [];
    if (endpoint.body) {
      parts.push(
        `// petición ${endpoint.method} ${endpoint.path}\n${JSON.stringify(exampleOf(endpoint.body), null, 2)}`,
      );
    }
    for (const response of endpoint.responses) {
      if (!response.body) continue;
      parts.push(
        `// respuesta ${response.code}${response.description ? ` — ${response.description}` : ''}\n${JSON.stringify(exampleOf(response.body), null, 2)}`,
      );
    }
    return parts.join('\n\n') || '(este endpoint no tiene ningún cuerpo)';
  }

  const TABS: { id: TabId; label: string; file: string; text: () => string }[] = [
    {
      id: 'yaml',
      label: 'OpenAPI YAML',
      file: 'openapi.yaml',
      text: () => (contract ? toYaml(buildOpenApi(contract)) : ''),
    },
    {
      id: 'json',
      label: 'OpenAPI JSON',
      file: 'openapi.json',
      text: () => (contract ? JSON.stringify(buildOpenApi(contract), null, 2) : ''),
    },
    { id: 'examples', label: 'Ejemplos JSON', file: 'ejemplos.json', text: examplesText },
    {
      id: 'brief',
      label: 'Briefing',
      file: 'contrato-api.md',
      text: () => (contract ? briefOf(contract) : ''),
    },
  ];

  const current = $derived(TABS.find((t) => t.id === tab) ?? TABS[0]);
  const text = $derived(current.text());
  const filename = $derived(`${slug}-${current.file}`);

  function close() {
    apiUi.closeExport();
    tab = 'yaml';
    copied = false;
    opener?.focus();
    opener = null;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1600);
    } catch {
      // A denied clipboard is not worth an error panel: the text is on screen
      // and selectable, which is the fallback anyone reaches for anyway.
      copied = false;
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab' || !panelEl) return;
    const focusables = [
      ...panelEl.querySelectorAll<HTMLElement>('button:not(:disabled), pre[tabindex]'),
    ];
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  $effect(() => {
    if (!apiUi.exporting) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelEl?.querySelector<HTMLElement>('button')?.focus();
  });
</script>

{#if apiUi.exporting && contract}
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="exp-title"
    tabindex="-1"
    onkeydown={onKeydown}
  >
    <button type="button" class="overlay-hit" aria-label="cerrar" tabindex="-1" onclick={close}
    ></button>

    <div class="panel" bind:this={panelEl}>
      <header>
        <h2 id="exp-title">Exportar {contract.title}</h2>
        <span class="spacer"></span>
        <button type="button" class="btn" onclick={close}>cerrar</button>
      </header>

      <!-- Above the tabs, always. It belongs to no output in particular. -->
      {#if issues.length === 0}
        <p class="ok">Sin problemas: no hay claves repetidas, campos sin nombre ni rutas raras.</p>
      {:else}
        <div class="issues" role="status">
          <p class="issues-head">
            {issues.length === 1
              ? 'Hay 1 cosa que revisar. Se puede exportar igual.'
              : `Hay ${issues.length} cosas que revisar. Se puede exportar igual.`}
          </p>
          <ul>
            {#each issues as issue, i (`${issue.where}-${issue.what}-${i}`)}
              <li><span class="where">{issue.where}</span> — {issue.what}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <div class="tabs" role="tablist">
        {#each TABS as t (t.id)}
          <button
            type="button"
            class="tab"
            class:on={t.id === tab}
            role="tab"
            aria-selected={t.id === tab}
            onclick={() => {
              tab = t.id;
              copied = false;
            }}>{t.label}</button
          >
        {/each}
      </div>

      {#if tab === 'yaml'}
        <p class="note">
          Autocontenido: todo lo que hace falta va dentro, sin referencias a otros ficheros, que los
          generadores y los agentes resuelven mal.
        </p>
      {/if}

      <!-- A scrollable region has to be focusable or a keyboard user cannot
           scroll three hundred lines of YAML (WCAG 2.1.1). The rule below is a
           heuristic about non-interactive elements and does not know that. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <pre
        class="out"
        tabindex="0"
        role="region"
        aria-label="salida de {current.label}">{text}</pre>

      <div class="actions">
        <span class="filename">{filename}</span>
        <span class="spacer"></span>
        {#if copied}<span class="copied">copiado ✓</span>{/if}
        <button type="button" class="btn" onclick={copy}>copiar</button>
        <button type="button" class="btn primary" onclick={() => downloadText(filename, text)}
          >descargar</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--shadow-strong);
  }
  .overlay-hit {
    position: absolute;
    inset: 0;
    border: none;
    background: none;
    cursor: default;
  }
  .panel {
    position: relative;
    width: min(880px, calc(100vw - 32px));
    height: min(720px, calc(100vh - 48px));
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px 20px;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
    box-shadow: 0 12px 40px var(--shadow-strong);
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h2 {
    margin: 0;
    font-size: 16px;
    color: var(--text);
  }
  .spacer {
    flex: 1;
  }
  .ok,
  .note {
    margin: 0;
    color: var(--text-dim);
    font-size: 12.5px;
    line-height: 1.5;
  }
  .issues {
    padding: 9px 12px;
    background: var(--tint-danger);
    border-left: 2px solid var(--danger);
    border-radius: 5px;
    max-height: 132px;
    overflow-y: auto;
  }
  .issues-head {
    margin: 0 0 5px;
    font-size: 12.5px;
    color: var(--text);
  }
  .issues ul {
    margin: 0;
    padding-left: 16px;
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.6;
  }
  .where {
    font-family: 'IBM Plex Mono', monospace;
    color: var(--text-mid);
  }
  .tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .tab {
    background: none;
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    height: 30px;
    padding: 0 11px;
    cursor: pointer;
  }
  .tab:hover {
    color: var(--accent);
  }
  .tab.on {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--tint-selected);
  }
  .out {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 12px;
    overflow: auto;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line-weak);
    border-radius: 6px;
    color: var(--text-mid);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    line-height: 1.55;
    white-space: pre;
    outline: none;
  }
  .out:focus {
    border-color: var(--accent);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .filename,
  .copied {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: var(--text-dim);
  }
  .copied {
    color: var(--accent);
  }
  .btn {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    height: 32px;
    padding: 0 12px;
    cursor: pointer;
  }
  .btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--ink-on-accent);
  }
  .btn.primary:hover {
    color: var(--ink-on-accent);
  }
</style>
