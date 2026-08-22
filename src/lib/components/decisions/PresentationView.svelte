<script lang="ts">
  /**
   * Phase 3: the decision in front of the business side.
   *
   * The only screen in this app someone other than the tech lead looks at, so it
   * is built from `presentableOf` and not from the decision itself. The technical
   * doubt, the internal note and the written argument for the recommendation are
   * **not in the tree** — projecting them would take a code change, not a slip
   * (design decision D3).
   *
   * The recommendation is marked, because whoever decides has a right to know
   * what you think. The argument is spoken, not printed.
   */
  import { decisions } from '../../decisions/store.svelte';
  import { effortBenefit, presentableOf, timeline } from '../../decisions/present';
  import { todayIso, fmtDate } from '../../time/timeline';
  import type { Decision } from '../../decisions/model/types';
  import EffortBenefitChart from './EffortBenefitChart.svelte';
  import TimelineChart from './TimelineChart.svelte';

  interface Props {
    decision: Decision;
    onClose: () => void;
  }

  let { decision, onClose }: Props = $props();

  const today = todayIso();
  const shown = $derived(presentableOf(decision));
  const scatter = $derived(effortBenefit(decision));
  const line = $derived(timeline(decision, today));

  let root = $state<HTMLElement | null>(null);
  let freeText = $state('');

  function close() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onClose();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  // Ask for the browser's fullscreen, and carry on without it. The view already
  // covers the window, so the presentation never depends on a permission (D4).
  $effect(() => {
    if (!root) return;
    void root.requestFullscreen?.().catch(() => {});
  });
</script>

<svelte:window on:keydown={onKeydown} />

<div class="present" bind:this={root}>
  <header class="top">
    <div class="where">
      {#if shown.project}<span class="project">{shown.project}</span>{/if}
      <span class="phase">FASE 3 · DECISIÓN</span>
      {#if shown.stakeholder}<span class="who">{shown.stakeholder}</span>{/if}
      {#if shown.deadline}<span class="when">{fmtDate(shown.deadline)}</span>{/if}
    </div>
    <button type="button" class="exit" onclick={close}>salir ✕</button>
  </header>

  <h1 class="question">{shown.question}</h1>

  <div class="options">
    {#each shown.options as o (o.id)}
      <article
        class="option"
        class:recommended={o.recommended}
        class:chosen={shown.resolution?.optionId === o.id}
      >
        <div class="option-head">
          <span class="letter">{o.letter}</span>
          <span class="option-text">{o.text || 'sin describir'}</span>
          {#if o.recommended}<span class="badge">recomendada</span>{/if}
        </div>
        <dl class="criteria">
          {#each o.assessments as a (a.criterion)}
            <div class="criterion">
              <dt>{a.label}</dt>
              <dd>
                {#if a.value}<span class="value">{a.value}</span>{/if}
                {#if a.text}<span class="text">{a.text}</span>{/if}
              </dd>
            </div>
          {/each}
          {#if o.assessments.length === 0}
            <div class="criterion"><dd class="text">Sin valorar.</dd></div>
          {/if}
        </dl>
      </article>
    {/each}
  </div>

  <div class="charts">
    <EffortBenefitChart data={scatter} />
    <TimelineChart data={line} {today} />
  </div>

  {#if shown.resolution}
    <!-- The minute: what was decided, when, and who was deciding. No signature:
         in an app with no accounts it would attest nothing (D6). -->
    <section class="acta">
      <span class="acta-label">DECISIÓN TOMADA</span>
      <p class="acta-text">
        {shown.options.find((o) => o.id === shown.resolution?.optionId)?.text ||
          shown.resolution.text}
      </p>
      <p class="acta-meta">
        {fmtDate(shown.resolution.at)}{shown.stakeholder ? ` · decide ${shown.stakeholder}` : ''}
      </p>
      <button type="button" class="secondary" onclick={() => decisions.reopen(decision.id)}>
        reabrir
      </button>
    </section>
  {:else}
    <section class="decide">
      <span class="acta-label">DECISIÓN EN ESTA REUNIÓN</span>
      <div class="picks">
        {#each shown.options as o (o.id)}
          <button
            type="button"
            class="pick"
            onclick={() => decisions.resolveWithOption(decision.id, o.id)}
          >
            {o.letter} · {o.text || 'sin describir'}
          </button>
        {/each}
      </div>
      <div class="free">
        <input
          bind:value={freeText}
          type="text"
          placeholder="…o algo que no estaba entre las alternativas"
          aria-label="resolución fuera de las alternativas"
        />
        <button
          type="button"
          class="secondary"
          disabled={freeText.trim() === ''}
          onclick={() => decisions.resolveWithText(decision.id, freeText)}>registrar</button
        >
      </div>
    </section>
  {/if}
</div>

<style>
  /* Covers the window on its own, so it looks the same with or without the
     browser's fullscreen. */
  .present {
    position: fixed;
    inset: 0;
    z-index: 80;
    overflow-y: auto;
    padding: 28px 40px 48px;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .where {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--text-dim);
  }
  .project {
    color: var(--text-mid);
  }
  .phase {
    letter-spacing: 0.12em;
    color: var(--accent);
  }
  .exit {
    flex-shrink: 0;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    padding: 8px 14px;
    cursor: pointer;
  }
  .exit:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  /* Read at a metre and a half, not at arm's length. */
  .question {
    margin: 0;
    font-size: clamp(24px, 3.2vw, 40px);
    line-height: 1.25;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--text);
    text-wrap: balance;
    max-width: 22ch;
  }
  .options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
  }
  .option {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
  }
  .option.recommended {
    border-color: var(--accent);
  }
  .option.chosen {
    background: var(--tint-accent);
  }
  .option-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .letter {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .recommended .letter {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--ink-on-accent);
  }
  .option-text {
    flex: 1;
    min-width: 0;
    font-size: 18px;
    font-weight: 500;
    color: var(--text);
    text-wrap: pretty;
  }
  .badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.06em;
    padding: 3px 8px;
    border-radius: 5px;
    border: var(--line-width) solid var(--accent);
    color: var(--accent);
  }
  .criteria {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .criterion {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  dt {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--text-dim);
  }
  dd {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 17px;
    color: var(--text);
  }
  .text {
    font-size: 14px;
    line-height: 1.4;
    color: var(--text-mid);
    text-wrap: pretty;
  }
  .charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 28px;
    align-items: start;
  }
  .acta,
  .decide {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
    padding: 18px;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 10px;
  }
  .acta {
    border-left: 3px solid var(--accent);
  }
  .acta-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }
  .acta-text {
    margin: 0;
    font-size: 20px;
    line-height: 1.35;
    color: var(--text);
    text-wrap: pretty;
  }
  .acta-meta {
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    color: var(--text-dim);
  }
  .picks {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .pick {
    padding: 12px 18px;
    border: var(--line-width) solid var(--line);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--text);
    font-size: 15px;
    cursor: pointer;
  }
  .pick:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .free {
    display: flex;
    gap: 8px;
    width: min(560px, 100%);
  }
  .free input {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    outline: none;
  }
  .free input:focus {
    border-color: var(--accent);
  }
  .secondary {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    padding: 9px 14px;
    border-radius: 6px;
    cursor: pointer;
  }
  .secondary:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .secondary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
