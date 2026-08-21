import { describe, it, expect } from 'vitest';
import { DecisionsStore } from './store.svelte';
import type { DecisionsBackend, LoadOutcome } from './storage';
import { emptyDecisionsData, type DecisionsData } from './model/types';
import { decisionState, outcome, recommendationIsFrozen } from './model/state';

/** In-memory backend, so the store can be exercised without IndexedDB. */
class FakeBackend implements DecisionsBackend {
  saved: DecisionsData | null = null;
  constructor(private outcome: LoadOutcome = { kind: 'empty' }) {}
  async load(): Promise<LoadOutcome> {
    return this.outcome;
  }
  async save(data: DecisionsData): Promise<void> {
    this.saved = data;
  }
}

/** A backend that opened but then went away, as a closed database would. */
class FailingSave implements DecisionsBackend {
  async load(): Promise<LoadOutcome> {
    return { kind: 'empty' };
  }
  async save(): Promise<void> {
    throw new Error('la base de datos se cerró');
  }
}

async function storeWith(outcome?: LoadOutcome) {
  const backend = new FakeBackend(outcome);
  const store = new DecisionsStore(backend);
  await store.init();
  return { store, backend };
}

describe('opening the store', () => {
  it('starts empty and usable on a first run', async () => {
    const { store } = await storeWith({ kind: 'empty' });
    expect(store.unavailable).toBe(null);
    expect(store.all).toEqual([]);
    expect(store.capture('algo')).not.toBe(null);
  });

  it('restores what was stored', async () => {
    const data = emptyDecisionsData();
    data.decisions.push({
      id: 'd1',
      origin: 'duda',
      originContext: '',
      question: '¿?',
      project: '',
      stakeholder: '',
      deadline: null,
      impact: null,
      notes: '',
      options: [],
      raisedAt: null,
      recommendation: null,
      resolution: null,
    });
    const { store } = await storeWith({ kind: 'loaded', data });
    expect(store.all).toHaveLength(1);
  });

  /**
   * The requirement with teeth: over a store that would not open, the app must
   * not look empty *and* must not accept edits, or it would write over data it
   * failed to read.
   */
  it('refuses every mutation when the store did not open', async () => {
    const { store, backend } = await storeWith({ kind: 'unavailable', reason: 'otra pestaña' });

    expect(store.unavailable?.reason).toBe('otra pestaña');
    expect(store.capture('no debería crearse')).toBe(null);
    expect(store.all).toEqual([]);

    await store.flush();
    expect(backend.saved).toBe(null);
  });

  it('goes unavailable when a save fails underneath it', async () => {
    const store = new DecisionsStore(new FailingSave());
    await store.init();
    store.capture('algo');
    await store.flush();
    expect(store.unavailable?.reason).toMatch(/se cerró/);
  });
});

describe('quick capture', () => {
  it('creates a draft from one line and nothing else', async () => {
    const { store } = await storeWith();
    const d = store.capture('¿se cobra el envío exprés?')!;

    expect(d.origin).toBe('¿se cobra el envío exprés?');
    expect(d.question).toBe('');
    expect(d.project).toBe('');
    expect(d.deadline).toBe(null);
    expect(decisionState(d, '2026-08-20')).toBe('borrador');
  });

  it('refuses empty text', async () => {
    const { store } = await storeWith();
    expect(store.capture('')).toBe(null);
    expect(store.capture('   ')).toBe(null);
    expect(store.all).toEqual([]);
  });

  it('trims what it stores', async () => {
    const { store } = await storeWith();
    expect(store.capture('  con espacios  ')!.origin).toBe('con espacios');
  });

  it('keeps capturing one after another', async () => {
    const { store } = await storeWith();
    store.capture('una');
    store.capture('dos');
    store.capture('tres');
    expect(store.all.map((d) => d.origin)).toEqual(['una', 'dos', 'tres']);
    expect(store.drafts).toHaveLength(3);
  });
});

describe('translating', () => {
  it('proposes the origin as the question the first time', async () => {
    const { store } = await storeWith();
    const d = store.capture('¿webhook o polling?')!;
    expect(store.proposedQuestion(d)).toBe('¿webhook o polling?');
  });

  it('stops proposing the origin once a question is written', async () => {
    const { store } = await storeWith();
    const d = store.capture('¿webhook o polling?')!;
    store.setQuestion(d.id, '¿cuánto puede tardar un cambio de precio?');

    expect(store.proposedQuestion(d)).toBe('¿cuánto puede tardar un cambio de precio?');
    // Both texts survive: the translation is the record, not just its result.
    expect(d.origin).toBe('¿webhook o polling?');
  });

  it('leaves the decision prepared once translated', async () => {
    const { store } = await storeWith();
    const d = store.capture('duda')!;
    store.setQuestion(d.id, '¿pregunta para negocio?');
    expect(decisionState(d, '2026-08-20')).toBe('preparada');
  });
});

describe('alternatives', () => {
  async function withOptions() {
    const { store } = await storeWith();
    const d = store.capture('duda')!;
    store.setQuestion(d.id, '¿pregunta?');
    store.addOption(d.id, 'Gratis siempre');
    store.addOption(d.id, 'Se cobra salvo defecto');
    return { store, d };
  }

  it('adds, renames, reorders and removes', async () => {
    const { store, d } = await withOptions();
    expect(d.options).toHaveLength(2);

    store.setOptionText(d.id, d.options[0].id, 'Gratis siempre, sin excepciones');
    expect(d.options[0].text).toBe('Gratis siempre, sin excepciones');

    store.moveOption(d.id, d.options[0].id, 1);
    expect(d.options[1].text).toBe('Gratis siempre, sin excepciones');

    store.removeOption(d.id, d.options[0].id);
    expect(d.options).toHaveLength(1);
  });

  it('does not move an option off either end', async () => {
    const { store, d } = await withOptions();
    const first = d.options[0].id;
    store.moveOption(d.id, first, -1);
    expect(d.options[0].id).toBe(first);
  });

  it('declares an effect on an axis and replaces it rather than duplicating', async () => {
    const { store, d } = await withOptions();
    const o = d.options[0].id;

    store.setEffect(d.id, o, 'coste', 'sube', 'lo asume la compañía');
    store.setEffect(d.id, o, 'riesgo', 'baja');
    expect(d.options[0].effects).toHaveLength(2);

    store.setEffect(d.id, o, 'coste', 'baja');
    expect(d.options[0].effects.filter((e) => e.axis === 'coste')).toHaveLength(1);
    expect(d.options[0].effects.find((e) => e.axis === 'coste')?.direction).toBe('baja');
  });

  /** An axis nobody spoke about is not an axis called unchanged. */
  it('clears an effect instead of storing a neutral one', async () => {
    const { store, d } = await withOptions();
    const o = d.options[0].id;
    store.setEffect(d.id, o, 'coste', 'sube');
    store.setEffect(d.id, o, 'coste', null);
    expect(d.options[0].effects).toEqual([]);
  });

  it('accepts an alternative that declares nothing', async () => {
    const { store, d } = await withOptions();
    expect(d.options[1].effects).toEqual([]);
    expect(store.all[0].options).toHaveLength(2);
  });
});

describe('recommending, raising, resolving', () => {
  async function prepared() {
    const { store } = await storeWith();
    const d = store.capture('duda')!;
    store.setQuestion(d.id, '¿pregunta?');
    store.addOption(d.id, 'A');
    store.addOption(d.id, 'B');
    return { store, d, a: d.options[0].id, b: d.options[1].id };
  }

  it('records a recommendation and lets it change before raising', async () => {
    const { store, d, a, b } = await prepared();
    expect(store.recommend(d.id, a, 'menos fricción')).toBe(true);
    expect(store.recommend(d.id, b, 'me lo he repensado')).toBe(true);
    expect(d.recommendation?.optionId).toBe(b);
    expect(recommendationIsFrozen(d)).toBe(false);
  });

  it('refuses to recommend an alternative that is not on the table', async () => {
    const { store, d } = await prepared();
    expect(store.recommend(d.id, 'inventada', '')).toBe(false);
    expect(d.recommendation).toBe(null);
  });

  /** The rule the whole measure rests on. */
  it('freezes the recommendation when the decision is raised', async () => {
    const { store, d, a, b } = await prepared();
    store.recommend(d.id, a, 'menos fricción');
    expect(store.raise(d.id, '2026-08-15')).toBe(true);

    expect(store.recommend(d.id, b, 'ahora digo otra cosa')).toBe(false);
    expect(store.clearRecommendation(d.id)).toBe(false);
    expect(d.recommendation?.optionId).toBe(a);
    expect(d.recommendation?.at).toBe('2026-08-15');
  });

  it('will not raise a decision that is still a draft', async () => {
    const { store } = await storeWith();
    const d = store.capture('duda')!;
    expect(store.raise(d.id)).toBe(false);
    expect(d.raisedAt).toBe(null);
  });

  it('will not raise twice', async () => {
    const { store, d } = await prepared();
    store.raise(d.id, '2026-08-15');
    expect(store.raise(d.id, '2026-08-16')).toBe(false);
    expect(d.raisedAt).toBe('2026-08-15');
  });

  it('raises without a recommendation', async () => {
    const { store, d } = await prepared();
    expect(store.raise(d.id, '2026-08-15')).toBe(true);
    expect(d.recommendation).toBe(null);
  });

  it('will not resolve something that was never raised', async () => {
    const { store, d, a } = await prepared();
    expect(store.resolveWithOption(d.id, a)).toBe(false);
  });

  it('resolves into an alternative and reports the outcome', async () => {
    const { store, d, a, b } = await prepared();
    store.recommend(d.id, a, 'menos fricción');
    store.raise(d.id, '2026-08-15');

    expect(store.resolveWithOption(d.id, b, '2026-08-18')).toBe(true);
    expect(outcome(d)).toBe('se decidió otra');
  });

  it('resolves outside the alternatives', async () => {
    const { store, d, a } = await prepared();
    store.recommend(d.id, a, 'menos fricción');
    store.raise(d.id, '2026-08-15');

    expect(store.resolveWithText(d.id, 'gratis solo la primera vez', '2026-08-18')).toBe(true);
    expect(outcome(d)).toBe('fuera de las alternativas');
    expect(d.resolution?.text).toBe('gratis solo la primera vez');
  });

  it('refuses an empty free-text resolution', async () => {
    const { store, d } = await prepared();
    store.raise(d.id, '2026-08-15');
    expect(store.resolveWithText(d.id, '   ')).toBe(false);
    expect(d.resolution).toBe(null);
  });

  it('drops a dangling recommendation when its alternative is removed before raising', async () => {
    const { store, d, a } = await prepared();
    store.recommend(d.id, a, 'porque sí');
    store.removeOption(d.id, a);
    expect(d.recommendation).toBe(null);
  });
});

describe('counting', () => {
  it('counts open decisions, not the historical total', async () => {
    const { store } = await storeWith();
    const open = store.capture('sigue abierta')!;
    store.setQuestion(open.id, '¿?');

    const done = store.capture('ya cerrada')!;
    store.setQuestion(done.id, '¿?');
    store.raise(done.id, '2026-08-10');
    store.resolveWithText(done.id, 'así', '2026-08-12');

    expect(store.all).toHaveLength(2);
    expect(store.countOpen('2026-08-20')).toBe(1);
  });

  it('counts the lapsed ones', async () => {
    const { store } = await storeWith();
    const d = store.capture('vencida')!;
    store.setQuestion(d.id, '¿?');
    store.setField(d.id, { deadline: '2026-08-01' });
    store.raise(d.id, '2026-07-20');

    expect(store.countLapsed('2026-08-20')).toBe(1);
  });
});
