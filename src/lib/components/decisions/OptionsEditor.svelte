<script lang="ts">
  /**
   * The alternatives, criterion by criterion (design decision D3).
   *
   * Alternatives across the top, criteria down the side. The grid is the point:
   * the same row read across is what lets you say "esta te cuesta el doble pero
   * te quita este riesgo". A list of paragraphs per alternative would hide
   * exactly the comparison the conversation needs.
   *
   * Every cell takes a sentence, and the ones whose criterion has a magnitude
   * take that too. The sentence is what gets read out loud; the value only
   * exists so the presentation phase can draw it.
   */
  import { decisions } from '../../decisions/store.svelte';
  import {
    CRITERIA,
    RISK_LEVELS,
    APPRAISAL_MAX,
    APPRAISAL_MIN,
    type CriterionId,
  } from '../../decisions/model/criteria';
  import { recommendationIsFrozen } from '../../decisions/model/state';
  import type { AssessmentValue, Decision, Option } from '../../decisions/model/types';

  interface Props {
    decision: Decision;
  }

  let { decision }: Props = $props();

  const frozen = $derived(recommendationIsFrozen(decision));
  const closed = $derived(decision.resolution !== null);

  function assessment(o: Option, criterion: CriterionId) {
    return o.assessments.find((a) => a.criterion === criterion) ?? null;
  }

  function setText(o: Option, criterion: CriterionId, text: string) {
    decisions.setAssessment(decision.id, o.id, criterion, { text });
  }

  function setValue(o: Option, criterion: CriterionId, value: AssessmentValue | null) {
    decisions.setAssessment(decision.id, o.id, criterion, { value });
  }

  const num = (v: string): number | null => {
    const n = Number(v.replace(',', '.'));
    return v.trim() !== '' && Number.isFinite(n) ? n : null;
  };

  const scores = Array.from(
    { length: APPRAISAL_MAX - APPRAISAL_MIN + 1 },
    (_, i) => i + APPRAISAL_MIN,
  );

  const isRecommended = (o: Option) => decision.recommendation?.optionId === o.id;
  const isChosen = (o: Option) => decision.resolution?.optionId === o.id;
</script>

<div class="matrix">
  <div class="head">
    <span class="label">ALTERNATIVAS · CRITERIO A CRITERIO</span>
    {#if !closed}
      <button type="button" class="add" onclick={() => decisions.addOption(decision.id)}>
        + alternativa
      </button>
    {/if}
  </div>

  {#if decision.options.length === 0}
    <p class="empty">
      Sin alternativas todavía. Son lo que hace visible el intercambio que negocio está eligiendo.
    </p>
  {:else}
    <div class="scroll">
      <div class="grid" style:--cols={decision.options.length}>
        <!-- Corner cell: the criteria column has no header of its own. -->
        <div class="corner"></div>

        {#each decision.options as option (option.id)}
          <div
            class="col-head"
            class:recommended={isRecommended(option)}
            class:chosen={isChosen(option)}
          >
            <input
              value={option.text}
              class="option-text"
              type="text"
              placeholder="describe la alternativa…"
              aria-label="alternativa"
              disabled={closed}
              oninput={(e) =>
                decisions.setOptionText(decision.id, option.id, e.currentTarget.value)}
            />
            <div class="col-tools">
              {#if isRecommended(option)}<span class="mark rec">recomendada</span>{/if}
              {#if isChosen(option)}<span class="mark res">elegida</span>{/if}
              {#if !frozen && !closed}
                <button
                  type="button"
                  class="tool"
                  title="recomendar esta"
                  onclick={() =>
                    decisions.recommend(decision.id, option.id, decision.recommendation?.why ?? '')}
                  >★</button
                >
              {/if}
              {#if !closed}
                <button
                  type="button"
                  class="tool"
                  title="mover a la izquierda"
                  onclick={() => decisions.moveOption(decision.id, option.id, -1)}>‹</button
                >
                <button
                  type="button"
                  class="tool"
                  title="mover a la derecha"
                  onclick={() => decisions.moveOption(decision.id, option.id, 1)}>›</button
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
        {/each}

        {#each CRITERIA as c (c.id)}
          <div class="row-head"><span class="criterion">{c.label}</span></div>

          {#each decision.options as option (option.id)}
            {@const a = assessment(option, c.id)}
            <div class="cell" class:recommended={isRecommended(option)}>
              <!-- The magnitude, for the criteria that have one. Never required:
                   an alternative nobody has quantified still says its sentence. -->
              {#if c.kind === 'effort'}
                <div class="value-row">
                  <input
                    class="value"
                    type="number"
                    min="0"
                    placeholder="sem"
                    aria-label="semanas"
                    disabled={closed}
                    value={a?.value?.kind === 'effort' ? a.value.weeks : ''}
                    onchange={(e) => {
                      const weeks = num(e.currentTarget.value);
                      const people = a?.value?.kind === 'effort' ? a.value.people : null;
                      setValue(
                        option,
                        c.id,
                        weeks === null ? null : { kind: 'effort', weeks, people },
                      );
                    }}
                  />
                  <input
                    class="value"
                    type="number"
                    min="0"
                    placeholder="devs"
                    aria-label="personas"
                    disabled={closed || a?.value?.kind !== 'effort'}
                    value={a?.value?.kind === 'effort' ? (a.value.people ?? '') : ''}
                    onchange={(e) => {
                      if (a?.value?.kind !== 'effort') return;
                      setValue(option, c.id, { ...a.value, people: num(e.currentTarget.value) });
                    }}
                  />
                </div>
              {:else if c.kind === 'money'}
                <input
                  class="value"
                  type="number"
                  min="0"
                  placeholder="importe (€)"
                  aria-label="importe"
                  disabled={closed}
                  value={a?.value?.kind === 'money' ? a.value.amount : ''}
                  onchange={(e) => {
                    const amount = num(e.currentTarget.value);
                    setValue(option, c.id, amount === null ? null : { kind: 'money', amount });
                  }}
                />
              {:else if c.kind === 'date'}
                <input
                  class="value"
                  type="date"
                  aria-label="cuándo estaría"
                  disabled={closed}
                  value={a?.value?.kind === 'date' ? a.value.date : ''}
                  onchange={(e) =>
                    setValue(
                      option,
                      c.id,
                      e.currentTarget.value ? { kind: 'date', date: e.currentTarget.value } : null,
                    )}
                />
              {:else if c.kind === 'level'}
                <div class="chips">
                  {#each RISK_LEVELS as level (level)}
                    <button
                      type="button"
                      class="chip {level}"
                      class:on={a?.value?.kind === 'level' && a.value.level === level}
                      disabled={closed}
                      onclick={() =>
                        setValue(
                          option,
                          c.id,
                          a?.value?.kind === 'level' && a.value.level === level
                            ? null
                            : { kind: 'level', level },
                        )}>{level}</button
                    >
                  {/each}
                </div>
              {:else if c.kind === 'appraisal'}
                <div class="chips">
                  {#each scores as score (score)}
                    <button
                      type="button"
                      class="chip"
                      class:on={a?.value?.kind === 'appraisal' && a.value.score === score}
                      disabled={closed}
                      title="apreciación tuya, no un cálculo"
                      onclick={() =>
                        setValue(
                          option,
                          c.id,
                          a?.value?.kind === 'appraisal' && a.value.score === score
                            ? null
                            : { kind: 'appraisal', score },
                        )}>{score}</button
                    >
                  {/each}
                </div>
              {/if}

              <textarea
                class="cell-text"
                rows="2"
                placeholder={c.hint}
                disabled={closed}
                value={a?.text ?? ''}
                onchange={(e) => setText(option, c.id, e.currentTarget.value)}
              ></textarea>
            </div>
          {/each}
        {/each}
      </div>
    </div>

    <p class="foot">
      El texto es lo que se lee en voz alta; el valor solo existe para que la fase 3 pueda
      dibujarlo. El beneficio es una apreciación tuya, no un cálculo.
    </p>
  {/if}
</div>

<style>
  .matrix {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .label,
  .criterion {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }
  /* Wide content scrolls inside its own box; the panel never scrolls sideways. */
  .scroll {
    overflow-x: auto;
  }
  .grid {
    display: grid;
    grid-template-columns: 104px repeat(var(--cols), minmax(190px, 1fr));
    gap: 1px;
    background: var(--line-weak);
    border: var(--line-width) solid var(--line-weak);
    border-radius: 6px;
    min-width: min-content;
  }
  .corner,
  .col-head,
  .row-head,
  .cell {
    background: var(--surface);
    padding: 8px;
  }
  .col-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface-2);
  }
  .col-head.recommended {
    box-shadow: inset 0 2px 0 var(--accent);
  }
  .col-head.chosen {
    background: var(--tint-accent);
  }
  .row-head {
    display: flex;
    align-items: center;
    background: var(--surface-2);
  }
  .criterion {
    letter-spacing: 0.04em;
    text-wrap: balance;
  }
  .cell {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .cell.recommended {
    background: var(--wash-accent);
  }
  .option-text {
    width: 100%;
    box-sizing: border-box;
    height: 28px;
    padding: 0 6px;
    border: var(--line-width) solid transparent;
    border-radius: 5px;
    background: none;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    font-weight: 500;
    outline: none;
  }
  .option-text:hover:not(:disabled),
  .option-text:focus {
    border-color: var(--line);
    background: var(--surface);
  }
  .col-tools {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-wrap: wrap;
  }
  .mark {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9.5px;
    letter-spacing: 0.06em;
    padding: 2px 5px;
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
  .tool {
    width: 20px;
    height: 22px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
  }
  .tool:hover {
    background: var(--hover);
    color: var(--text);
  }
  .tool.danger:hover {
    color: var(--danger);
  }
  .value-row {
    display: flex;
    gap: 4px;
  }
  .value,
  .cell-text {
    width: 100%;
    box-sizing: border-box;
    padding: 5px 7px;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    background: var(--surface-2);
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    outline: none;
  }
  .value:focus,
  .cell-text:focus {
    border-color: var(--accent);
  }
  .value:disabled {
    opacity: 0.5;
  }
  .cell-text {
    font-family: 'Inter', sans-serif;
    font-size: 12.5px;
    line-height: 1.4;
    resize: vertical;
  }
  .chips {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
  }
  .chip {
    flex: 1;
    min-width: 30px;
    height: 24px;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    background: var(--surface-2);
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    cursor: pointer;
  }
  .chip.on {
    color: var(--accent);
    border-color: var(--accent);
  }
  /* Risk reads by severity, so its selected chip carries the danger colour. */
  .chip.alto.on {
    color: var(--danger);
    border-color: var(--danger);
  }
  .chip:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .empty,
  .foot {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--text-dim);
  }
  .foot {
    font-size: 11.5px;
    opacity: 0.85;
  }
  .add {
    background: none;
    border: var(--line-width) dashed var(--line);
    border-radius: 6px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    padding: 6px 10px;
    cursor: pointer;
  }
  .add:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
