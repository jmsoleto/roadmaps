<script lang="ts">
  /**
   * The alternatives, as a grid you can read across (design decision D5).
   *
   * The grid is the point: the same axes down every row is what lets you point
   * with a finger and say "esta te cuesta más pero te quita este riesgo". A list
   * of paragraphs would hide exactly the comparison the conversation needs.
   */
  import { decisions } from '../../decisions/store.svelte';
  import { AXES, DIRECTION_GLYPH, type EffectDirection } from '../../decisions/model/axes';
  import { recommendationIsFrozen } from '../../decisions/model/state';
  import type { Decision, Option } from '../../decisions/model/types';

  interface Props {
    decision: Decision;
  }

  let { decision }: Props = $props();

  const frozen = $derived(recommendationIsFrozen(decision));
  const resolved = $derived(decision.resolution !== null);

  const DIRECTIONS: (EffectDirection | null)[] = [null, 'sube', 'igual', 'baja'];

  function effectOf(o: Option, axis: string) {
    return o.effects.find((e) => e.axis === axis) ?? null;
  }

  /** Cycle through: undeclared → sube → igual → baja → undeclared. */
  function cycle(o: Option, axis: (typeof AXES)[number]['id']) {
    const current = effectOf(o, axis)?.direction ?? null;
    const next = DIRECTIONS[(DIRECTIONS.indexOf(current) + 1) % DIRECTIONS.length];
    decisions.setEffect(decision.id, o.id, axis, next, effectOf(o, axis)?.note ?? '');
  }

  function isRecommended(o: Option): boolean {
    return decision.recommendation?.optionId === o.id;
  }

  function isResolved(o: Option): boolean {
    return decision.resolution?.optionId === o.id;
  }
</script>

<div class="options">
  <div class="head">
    <span class="label">ALTERNATIVAS</span>
  </div>
  {#if decision.options.length > 0}
    <!-- Sits directly over the first row's axis buttons, so the column each
         glyph belongs to is named without repeating it on every row. -->
    <div class="axes legend">
      {#each AXES as axis (axis.id)}<span class="axis">{axis.label}</span>{/each}
    </div>
  {/if}

  {#each decision.options as option (option.id)}
    <div class="row" class:recommended={isRecommended(option)} class:resolved={isResolved(option)}>
      <div class="line text-line">
        <input
          value={option.text}
          class="option-text"
          type="text"
          placeholder="describe la alternativa…"
          aria-label="alternativa"
          disabled={resolved}
          oninput={(e) => decisions.setOptionText(decision.id, option.id, e.currentTarget.value)}
        />
        <div class="marks">
          {#if isRecommended(option)}
            <span class="mark rec">recomendada</span>
          {/if}
          {#if isResolved(option)}
            <span class="mark res">elegida</span>
          {/if}
        </div>
      </div>

      <div class="line controls">
        <div class="axes">
          {#each AXES as axis (axis.id)}
            {@const effect = effectOf(option, axis.id)}
            <button
              type="button"
              class="effect"
              class:set={effect !== null}
              disabled={resolved}
              title="{axis.label}: {effect ? effect.direction : 'sin declarar'}"
              aria-label="{axis.label} de {option.text || 'esta alternativa'}"
              onclick={() => cycle(option, axis.id)}
            >
              {effect ? DIRECTION_GLYPH[effect.direction] : '·'}
            </button>
          {/each}
        </div>

        <div class="tools">
          {#if !frozen && !resolved}
            <button
              type="button"
              class="tool"
              title="recomendar esta"
              onclick={() =>
                decisions.recommend(decision.id, option.id, decision.recommendation?.why ?? '')}
              >★</button
            >
          {/if}
          {#if !resolved}
            <button
              type="button"
              class="tool"
              title="subir"
              onclick={() => decisions.moveOption(decision.id, option.id, -1)}>↑</button
            >
            <button
              type="button"
              class="tool"
              title="bajar"
              onclick={() => decisions.moveOption(decision.id, option.id, 1)}>↓</button
            >
            <button
              type="button"
              class="tool danger"
              title="quitar"
              onclick={() => decisions.removeOption(decision.id, option.id)}>✕</button
            >
          {/if}
        </div>
      </div>
    </div>

    {#each option.effects.filter((e) => e.note.trim() !== '') as effect (effect.axis)}
      <div class="note">{effect.axis}: {effect.note}</div>
    {/each}
  {/each}

  {#if decision.options.length === 0}
    <p class="empty">
      Sin alternativas todavía. Son lo que hace visible el intercambio que negocio está eligiendo.
    </p>
  {/if}

  {#if !resolved}
    <button type="button" class="add" onclick={() => decisions.addOption(decision.id)}>
      + alternativa
    </button>
  {/if}
</div>

<style>
  .options {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .label,
  .axis {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }
  .axes {
    display: grid;
    grid-template-columns: repeat(3, 34px);
    gap: 4px;
    flex-shrink: 0;
    text-align: center;
  }
  .axis {
    letter-spacing: 0.04em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 7px 8px;
    border: var(--line-width) solid transparent;
    border-radius: 6px;
  }
  .line {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  /* The text gets the whole width — reading the alternatives is the point. */
  .text-line {
    width: 100%;
  }
  .controls {
    justify-content: space-between;
  }
  /* Same track and the row's own left padding, so each label lands on its
     column of glyphs. */
  .legend {
    margin-left: 8px;
  }
  .row:hover {
    background: var(--hover);
  }
  .row.recommended {
    border-color: var(--accent);
  }
  .row.resolved {
    background: var(--tint-accent);
  }
  .option-text {
    flex: 1;
    min-width: 0;
    height: 30px;
    padding: 0 8px;
    border: var(--line-width) solid transparent;
    border-radius: 5px;
    background: none;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    outline: none;
  }
  .option-text:hover:not(:disabled),
  .option-text:focus {
    border-color: var(--line);
    background: var(--surface-2);
  }
  .option-text:disabled {
    cursor: default;
  }
  .marks {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .mark {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .mark.rec {
    color: var(--accent);
    border: var(--line-width) solid var(--accent);
  }
  .mark.res {
    color: var(--ink-on-accent);
    background: var(--accent);
  }
  .effect {
    width: 34px;
    height: 30px;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    background: var(--surface-2);
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    cursor: pointer;
  }
  .effect.set {
    color: var(--text);
    border-color: var(--text-dim);
  }
  .effect:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .tools {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    width: 92px;
    justify-content: flex-end;
  }
  .tool {
    width: 22px;
    height: 26px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
  }
  .tool:hover {
    background: var(--surface-2);
    color: var(--text);
  }
  .tool.danger:hover {
    color: var(--danger);
  }
  .note {
    margin-left: 8px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .empty {
    margin: 0;
    padding: 4px 8px;
    font-size: 13px;
    color: var(--text-dim);
    opacity: 0.85;
  }
  .add {
    align-self: flex-start;
    margin-top: 2px;
    background: none;
    border: var(--line-width) dashed var(--line);
    border-radius: 6px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    padding: 7px 12px;
    cursor: pointer;
  }
  .add:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
