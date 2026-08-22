<script lang="ts">
  /**
   * One decision, end to end: the two texts, the alternatives, what you
   * recommended, and how it was closed.
   *
   * Two moments get deliberate friction. **Plantear** says out loud what it
   * freezes before doing it, because afterwards the recommendation cannot be
   * touched (D3). **Resolver** offers the alternatives and, separately, an
   * answer that was none of them — which is a real outcome, not an error.
   */
  import { decisions } from '../../decisions/store.svelte';
  import {
    PHASES,
    canMarkReady,
    daysToDeadline,
    outcome,
    phaseNumber,
    phaseOf,
    recommendationIsFrozen,
    recommendedOption,
    resolvedOption,
    studyChecklist,
  } from '../../decisions/model/state';
  import { todayIso } from '../../time/timeline';
  import type { Decision, Impact } from '../../decisions/model/types';
  import OptionsEditor from './OptionsEditor.svelte';

  interface Props {
    decision: Decision;
  }

  let { decision }: Props = $props();

  const today = todayIso();
  const lifecycle = $derived(phaseOf(decision, today));
  const phaseN = $derived(phaseNumber(decision, today));
  const checklist = $derived(studyChecklist(decision));
  const frozen = $derived(recommendationIsFrozen(decision));
  const verdict = $derived(outcome(decision));
  const days = $derived(daysToDeadline(decision, today));

  let confirmReady = $state(false);
  let freeText = $state('');
  let projectQuery = $state<string | null>(null);

  const suggestions = $derived(
    projectQuery === null ? [] : decisions.projectSuggestions(projectQuery).slice(0, 6),
  );

  const IMPACTS: Impact[] = ['alto', 'medio', 'bajo'];

  // Leaving one decision for another must not carry over a half-typed answer or
  // an armed confirmation. Reading the id into a local is what subscribes this
  // effect to the decision changing.
  $effect(() => {
    const showing = decision.id;
    if (showing === '') return;
    confirmReady = false;
    freeText = '';
    projectQuery = null;
  });

  function markReady() {
    decisions.markReady(decision.id);
    confirmReady = false;
  }
</script>

<div class="detail">
  <header class="head">
    <span class="state {lifecycle}">{lifecycle}</span>
    <span class="phase-n">fase {phaseN}</span>
    {#if decision.deadline && lifecycle !== 'cerrada'}
      <span class="deadline" class:late={days !== null && days < 0}>
        {days !== null && days < 0 ? `venció hace ${-days} d` : `quedan ${days} d`}
      </span>
    {/if}
    <div class="spacer"></div>
    <button
      type="button"
      class="tool danger"
      title="borrar decisión"
      onclick={() => decisions.delete(decision.id)}>✕</button
    >
  </header>

  <!-- Where this decision is, and what the three phases are. Derived, never
       stored: the stepper reads the data rather than a field. -->
  <ol class="stepper" aria-label="fases">
    {#each PHASES as p (p.id)}
      <li class="step" class:done={p.n < phaseN} class:now={p.n === phaseN}>
        <span class="step-n">{p.n < phaseN ? '✓' : p.n}</span>
        <span class="step-label">{p.label}</span>
      </li>
    {/each}
  </ol>

  <!-- The question the business side answers. The origin lives below it, smaller:
       it is the record of the translation, not the thing being asked. -->
  <section class="block">
    <span class="label">PREGUNTA A NEGOCIO <em>· lo único que verá negocio</em></span>
    <textarea
      class="question"
      rows="2"
      placeholder={decision.origin ? `p. ej. ${decision.origin}` : 'la pregunta, en su idioma…'}
      value={decisions.proposedQuestion(decision)}
      disabled={lifecycle === 'cerrada'}
      onchange={(e) => decisions.setQuestion(decision.id, e.currentTarget.value)}
    ></textarea>
    {#if lifecycle === 'captura'}
      <p class="hint">
        Mientras no tenga pregunta, es un borrador. Se propone la duda de origen: acéptala si ya
        estaba en lenguaje de negocio, o reescríbela.
      </p>
      <!-- Accepting the proposal unchanged needs its own gesture: `change` never
           fires when the text is not edited, so without this the decision born
           already in business language could not be translated without first
           pretending to rewrite it. -->
      <button
        type="button"
        class="secondary"
        onclick={() => decisions.setQuestion(decision.id, decisions.proposedQuestion(decision))}
        >usar esta pregunta</button
      >
    {/if}
  </section>

  <section class="block">
    <span class="label">LA DUDA, COMO NACIÓ</span>
    <input
      class="origin"
      type="text"
      value={decision.origin}
      placeholder="la duda técnica original"
      onchange={(e) => decisions.setOrigin(decision.id, e.currentTarget.value)}
    />
    <input
      class="context"
      type="text"
      value={decision.originContext}
      placeholder="de dónde sale — p. ej. reunión equipo API · 12/08"
      onchange={(e) => decisions.setOrigin(decision.id, decision.origin, e.currentTarget.value)}
    />
    {#if decision.capturedAt}
      <p class="hint">capturado el {decision.capturedAt} · {decision.captureSource}</p>
    {/if}
  </section>

  <section class="fields">
    <label class="field">
      <span class="label">proyecto</span>
      <input
        type="text"
        value={decision.project}
        placeholder="texto libre"
        oninput={(e) => {
          projectQuery = e.currentTarget.value;
          decisions.setField(decision.id, { project: e.currentTarget.value });
        }}
        onblur={() => (projectQuery = null)}
      />
      {#if suggestions.length > 0}
        <div class="suggestions">
          {#each suggestions as s (s)}
            <button
              type="button"
              class="suggestion"
              onmousedown={() => {
                decisions.setField(decision.id, { project: s });
                projectQuery = null;
              }}>{s}</button
            >
          {/each}
        </div>
      {/if}
    </label>

    <label class="field">
      <span class="label">negocio</span>
      <input
        type="text"
        value={decision.stakeholder}
        placeholder="quién decide"
        onchange={(e) => decisions.setField(decision.id, { stakeholder: e.currentTarget.value })}
      />
    </label>

    <label class="field">
      <span class="label">límite</span>
      <input
        type="date"
        value={decision.deadline ?? ''}
        onchange={(e) =>
          decisions.setField(decision.id, { deadline: e.currentTarget.value || null })}
      />
    </label>

    <div class="field">
      <span class="label">impacto</span>
      <div class="impacts">
        {#each IMPACTS as level (level)}
          <button
            type="button"
            class="impact"
            class:on={decision.impact === level}
            onclick={() =>
              decisions.setField(decision.id, {
                impact: decision.impact === level ? null : level,
              })}>{level}</button
          >
        {/each}
      </div>
    </div>
  </section>

  <OptionsEditor {decision} />

  <section class="block">
    <span class="label">RECOMENDACIÓN</span>
    {#if decision.recommendation}
      <div class="rec">
        <div class="rec-option">{recommendedOption(decision)?.text ?? '(alternativa borrada)'}</div>
        <textarea
          class="why"
          rows="2"
          placeholder="por qué"
          value={decision.recommendation.why}
          disabled={frozen}
          onchange={(e) =>
            decisions.recommend(
              decision.id,
              decision.recommendation!.optionId,
              e.currentTarget.value,
            )}
        ></textarea>
        {#if frozen}
          <p class="hint">Congelada el {decision.recommendation.at}, al declararla lista.</p>
        {/if}
      </div>
    {:else}
      <p class="hint">
        {#if frozen}
          Se declaró lista sin recomendación.
        {:else}
          Marca una alternativa con ★ para recomendarla. Es opcional: recomendar por obligación no
          mide nada.
        {/if}
      </p>
    {/if}
  </section>

  {#if lifecycle === 'estudio'}
    <section class="action">
      <span class="label">CIERRE DE LA FASE</span>
      <!-- Shown, not enforced: sometimes you present with what you have, and
           blocking the gate produces fields filled in for the sake of it. -->
      <ul class="checklist">
        <li class:ok={checklist.translated}>
          {checklist.translated ? '✓' : '·'} duda traducida a negocio
        </li>
        <li class:ok={checklist.assessed > 0}>
          {checklist.assessed > 0 ? '✓' : '·'}
          {checklist.assessed} de {checklist.options}
          {checklist.options === 1 ? 'alternativa evaluada' : 'alternativas evaluadas'}
        </li>
        <li class:ok={checklist.recommended}>
          {checklist.recommended ? '✓' : '·'} recomendación marcada
        </li>
      </ul>

      {#if confirmReady}
        <p class="warn">
          Al declararla lista se congela la recomendación: después ya no se podrá cambiar. Te mojas
          ahora, antes de entrar en la sala.
        </p>
        <div class="buttons">
          <button type="button" class="primary" onclick={markReady}>sí, está lista</button>
          <button type="button" class="secondary" onclick={() => (confirmReady = false)}
            >cancelar</button
          >
        </div>
      {:else}
        <button
          type="button"
          class="primary"
          disabled={!canMarkReady(decision)}
          onclick={() => (confirmReady = true)}
        >
          lista para presentar →
        </button>
      {/if}
    </section>
  {/if}

  {#if lifecycle === 'lista' || lifecycle === 'caducada'}
    <section class="block">
      <span class="label">RESOLUCIÓN</span>
      <div class="resolve">
        {#each decision.options as option (option.id)}
          <button
            type="button"
            class="resolve-option"
            onclick={() => decisions.resolveWithOption(decision.id, option.id)}
          >
            se eligió: {option.text || '(sin texto)'}
          </button>
        {/each}
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
      </div>
    </section>
  {/if}

  {#if decision.resolution}
    <section class="block resolution">
      <span class="label">RESUELTA EL {decision.resolution.at}</span>
      <div class="answer">
        {resolvedOption(decision)?.text || decision.resolution.text}
      </div>
      {#if verdict}
        <div class="verdict {verdict === 'coincidió' ? 'match' : 'diff'}">{verdict}</div>
        {#if verdict === 'fuera de las alternativas'}
          <p class="hint">
            Ninguna de las alternativas ofrecidas era la respuesta. Dice cómo se plantearon, no que
            el registro esté mal.
          </p>
        {/if}
      {/if}
      <button type="button" class="secondary" onclick={() => decisions.reopen(decision.id)}
        >reabrir</button
      >
    </section>
  {/if}

  <section class="block">
    <span class="label">NOTA INTERNA <em>· no se presenta</em></span>
    <textarea
      rows="2"
      class="notes internal"
      placeholder="lo que piensas y no cuentas"
      value={decision.internalNote}
      onchange={(e) => decisions.setField(decision.id, { internalNote: e.currentTarget.value })}
    ></textarea>
  </section>

  <section class="block">
    <span class="label">NOTAS</span>
    <textarea
      rows="3"
      class="notes"
      placeholder="lo que haga falta recordar"
      value={decision.notes}
      onchange={(e) => decisions.setField(decision.id, { notes: e.currentTarget.value })}
    ></textarea>
  </section>
</div>

<style>
  .detail {
    display: flex;
    flex-direction: column;
    gap: 18px;
    height: 100%;
    overflow-y: auto;
    padding: 18px;
    background: var(--surface);
    border-left: var(--line-width) solid var(--line);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .spacer {
    flex: 1;
  }
  .state,
  .deadline {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    padding: 4px 8px;
    border-radius: 5px;
    border: var(--line-width) solid var(--line);
    color: var(--text-dim);
  }
  .state.planteada {
    color: var(--accent);
    border-color: var(--accent);
  }
  .state.caducada {
    color: var(--danger);
    border-color: var(--danger);
  }
  .state.resuelta {
    color: var(--ink-on-accent);
    background: var(--accent);
    border-color: var(--accent);
  }
  .deadline.late {
    color: var(--danger);
  }
  .block,
  .action {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  /* The stepper carries its own numbering, so the list must not add a second. */
  .stepper {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .step {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .step.done {
    color: var(--text-mid);
  }
  .step.now {
    color: var(--accent);
    border-color: var(--accent);
  }
  .step-n {
    flex-shrink: 0;
    width: 16px;
    text-align: center;
  }
  .step-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .phase-n {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-mid);
  }
  .checklist {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-dim);
  }
  .checklist li.ok {
    color: var(--text-mid);
  }
  .label em {
    font-style: normal;
    opacity: 0.75;
  }
  .notes.internal {
    border-style: dashed;
  }
  .label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }
  textarea,
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    outline: none;
    resize: vertical;
  }
  textarea:focus,
  input:focus {
    border-color: var(--accent);
  }
  .question {
    font-size: 15px;
    line-height: 1.4;
  }
  .origin,
  .context {
    font-size: 13px;
  }
  .context {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-dim);
  }
  .hint {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--text-dim);
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .field {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    box-shadow: 0 8px 24px var(--shadow-strong);
    padding: 4px;
  }
  .suggestion {
    text-align: left;
    padding: 6px 8px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text-dim);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    cursor: pointer;
  }
  .suggestion:hover {
    background: var(--hover);
    color: var(--text);
  }
  .impacts {
    display: flex;
    gap: 4px;
  }
  .impact {
    flex: 1;
    height: 32px;
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    cursor: pointer;
  }
  .impact.on {
    color: var(--accent);
    border-color: var(--accent);
  }
  .rec {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rec-option {
    font-size: 14px;
    color: var(--text);
  }
  .why {
    font-size: 13px;
  }
  .warn {
    margin: 0;
    padding: 10px 12px;
    background: var(--tint-danger);
    border-left: 2px solid var(--danger);
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text);
  }
  .buttons,
  .free {
    display: flex;
    gap: 8px;
  }
  .free input {
    flex: 1;
  }
  .resolve {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .resolve-option {
    text-align: left;
    padding: 9px 12px;
    border: var(--line-width) solid var(--line);
    border-radius: 6px;
    background: var(--surface-2);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    cursor: pointer;
  }
  .resolve-option:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .resolution .answer {
    font-size: 15px;
    line-height: 1.4;
    color: var(--text);
  }
  .verdict {
    align-self: flex-start;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    padding: 4px 8px;
    border-radius: 5px;
    border: var(--line-width) solid var(--line);
    color: var(--text-dim);
  }
  .verdict.match {
    color: var(--accent);
    border-color: var(--accent);
  }
  .verdict.diff {
    color: var(--text);
  }
  .primary,
  .secondary {
    align-self: flex-start;
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
  .secondary:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .secondary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .tool {
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text-dim);
    cursor: pointer;
  }
  .tool.danger:hover {
    color: var(--danger);
    background: var(--tint-danger);
  }
  .notes {
    font-size: 13px;
  }
</style>
