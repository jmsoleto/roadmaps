import { describe, it, expect } from 'vitest';
import { DecisionsStore } from './store.svelte';
import type { DecisionsBackend, LoadOutcome } from './storage';
import { emptyDecisionsData, type DecisionsData } from './model/types';
import { outcome, phaseOf, recommendationIsFrozen } from './model/state';

/** In-memory backend, so the store can be exercised without IndexedDB. */
class FakeBackend implements DecisionsBackend {
  saved: DecisionsData | null = null;
  blobs = new Map<string, Blob>();
  deleted: string[] = [];
  constructor(private outcome: LoadOutcome = { kind: 'empty' }) {}
  async load(): Promise<LoadOutcome> {
    return this.outcome;
  }
  async save(data: DecisionsData): Promise<void> {
    this.saved = data;
  }
  async putBlob(id: string, blob: Blob): Promise<void> {
    this.blobs.set(id, blob);
  }
  async getBlob(id: string): Promise<Blob | null> {
    return this.blobs.get(id) ?? null;
  }
  async deleteBlobs(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.blobs.delete(id);
      this.deleted.push(id);
    }
  }
  async blobKeys(): Promise<string[]> {
    return [...this.blobs.keys()];
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
  async putBlob(): Promise<void> {}
  async getBlob(): Promise<Blob | null> {
    return null;
  }
  async deleteBlobs(): Promise<void> {}
  async blobKeys(): Promise<string[]> {
    return [];
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
      internalNote: '',
      attachments: [],
      capturedAt: null,
      captureSource: 'tecleado',
      project: '',
      stakeholder: '',
      deadline: null,
      impact: null,
      notes: '',
      options: [],
      readyAt: null,
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
    expect(phaseOf(d, '2026-08-20')).toBe('captura');
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
    expect(store.captured).toHaveLength(3);
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
    expect(phaseOf(d, '2026-08-20')).toBe('estudio');
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

  it('assesses a criterion and replaces it rather than duplicating', async () => {
    const { store, d } = await withOptions();
    const o = d.options[0].id;

    store.setAssessment(d.id, o, 'coste', {
      text: '140 k€',
      value: { kind: 'money', amount: 140000 },
    });
    store.setAssessment(d.id, o, 'riesgo', { text: 'conciliación diaria' });
    expect(d.options[0].assessments).toHaveLength(2);

    store.setAssessment(d.id, o, 'coste', { text: '75 k€' });
    const coste = d.options[0].assessments.filter((a) => a.criterion === 'coste');
    expect(coste).toHaveLength(1);
    expect(coste[0].text).toBe('75 k€');
    // Editing only the text leaves the value where it was.
    expect(coste[0].value).toEqual({ kind: 'money', amount: 140000 });
  });

  /** Text without value is a complete answer for the room. */
  it('keeps a sentence with no magnitude behind it', async () => {
    const { store, d } = await withOptions();
    const o = d.options[0].id;
    store.setAssessment(d.id, o, 'riesgo', { text: 'cualquier descuadre es dinero real' });

    expect(d.options[0].assessments[0].value).toBe(null);
    expect(d.options[0].assessments[0].text).toBe('cualquier descuadre es dinero real');
  });

  it('drops an assessment left with neither text nor value', async () => {
    const { store, d } = await withOptions();
    const o = d.options[0].id;
    store.setAssessment(d.id, o, 'coste', { text: '75 k€' });
    store.setAssessment(d.id, o, 'coste', { text: '   ', value: null });
    expect(d.options[0].assessments).toEqual([]);
  });

  it('accepts an alternative that declares nothing', async () => {
    const { store, d } = await withOptions();
    expect(d.options[1].assessments).toEqual([]);
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
  it('freezes the recommendation when the study is closed', async () => {
    const { store, d, a, b } = await prepared();
    store.recommend(d.id, a, 'menos fricción');
    expect(store.markReady(d.id, '2026-08-15')).toBe(true);

    expect(store.recommend(d.id, b, 'ahora digo otra cosa')).toBe(false);
    expect(store.clearRecommendation(d.id)).toBe(false);
    expect(d.recommendation?.optionId).toBe(a);
    expect(d.recommendation?.at).toBe('2026-08-15');
  });

  it('will not close the study of a decision that is still a capture', async () => {
    const { store } = await storeWith();
    const d = store.capture('duda')!;
    expect(store.markReady(d.id)).toBe(false);
    expect(d.readyAt).toBe(null);
  });

  it('will not close the study twice', async () => {
    const { store, d } = await prepared();
    store.markReady(d.id, '2026-08-15');
    expect(store.markReady(d.id, '2026-08-16')).toBe(false);
    expect(d.readyAt).toBe('2026-08-15');
  });

  it('closes the study without a recommendation', async () => {
    const { store, d } = await prepared();
    expect(store.markReady(d.id, '2026-08-15')).toBe(true);
    expect(d.recommendation).toBe(null);
  });

  it('will not resolve something that never left the study', async () => {
    const { store, d, a } = await prepared();
    expect(store.resolveWithOption(d.id, a)).toBe(false);
  });

  it('resolves into an alternative and reports the outcome', async () => {
    const { store, d, a, b } = await prepared();
    store.recommend(d.id, a, 'menos fricción');
    store.markReady(d.id, '2026-08-15');

    expect(store.resolveWithOption(d.id, b, '2026-08-18')).toBe(true);
    expect(outcome(d)).toBe('se decidió otra');
  });

  it('resolves outside the alternatives', async () => {
    const { store, d, a } = await prepared();
    store.recommend(d.id, a, 'menos fricción');
    store.markReady(d.id, '2026-08-15');

    expect(store.resolveWithText(d.id, 'gratis solo la primera vez', '2026-08-18')).toBe(true);
    expect(outcome(d)).toBe('fuera de las alternativas');
    expect(d.resolution?.text).toBe('gratis solo la primera vez');
  });

  it('refuses an empty free-text resolution', async () => {
    const { store, d } = await prepared();
    store.markReady(d.id, '2026-08-15');
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
    store.markReady(done.id, '2026-08-10');
    store.resolveWithText(done.id, 'así', '2026-08-12');

    expect(store.all).toHaveLength(2);
    expect(store.countOpen()).toBe(1);
  });

  it('counts the lapsed ones', async () => {
    const { store } = await storeWith();
    const d = store.capture('vencida')!;
    store.setQuestion(d.id, '¿?');
    store.setField(d.id, { deadline: '2026-08-01' });
    store.markReady(d.id, '2026-07-20');

    expect(store.countLapsed('2026-08-20')).toBe(1);
  });
});

describe('visual support', () => {
  const png = (bytes = 1024) =>
    new File([new Uint8Array(bytes)], 'flujo.png', { type: 'image/png' });

  async function withDecision() {
    const { store, backend } = await storeWith();
    const d = store.capture('duda')!;
    return { store, backend, id: d.id, live: () => store.all.find((x) => x.id === d.id)! };
  }

  it('attaches an image, keeping its fiche and its bytes apart', async () => {
    const { store, backend, id, live } = await withDecision();
    expect(await store.attach(id, png(2048))).toBe(null);

    const [fiche] = live().attachments;
    expect(fiche.name).toBe('flujo.png');
    expect(fiche.size).toBe(2048);
    expect(backend.blobs.get(fiche.id)).toBeInstanceOf(Blob);
    // The document carries no bytes.
    expect(JSON.stringify(live())).not.toMatch(/blob|base64/i);
  });

  it('names something pasted, which arrives without one', async () => {
    const { store, id, live } = await withDecision();
    await store.attach(id, new Blob([new Uint8Array(10)], { type: 'image/png' }));
    expect(live().attachments[0].name).toMatch(/^captura-\d{8}-\d{6}\.png$/);
  });

  it('refuses anything that is not an image', async () => {
    const { store, id, live } = await withDecision();
    const msg = await store.attach(id, new File(['x'], 'notas.pdf', { type: 'application/pdf' }));
    expect(msg).toMatch(/solo se pueden adjuntar imágenes/i);
    expect(live().attachments).toEqual([]);
  });

  it('refuses a file over the limit, saying what it weighs', async () => {
    const { store, id, live } = await withDecision();
    const huge = new File([], 'enorme.png', { type: 'image/png' });
    Object.defineProperty(huge, 'size', { value: 40 * 1024 * 1024 });

    const msg = await store.attach(id, huge);
    expect(msg).toMatch(/40\.0 MB/);
    expect(msg).toMatch(/máximo/);
    expect(live().attachments).toEqual([]);
  });

  it('removes the fiche and the bytes together', async () => {
    const { store, backend, id, live } = await withDecision();
    await store.attach(id, png());
    const attId = live().attachments[0].id;

    store.detach(id, attId);
    await new Promise((r) => setTimeout(r, 0));

    expect(live().attachments).toEqual([]);
    expect(backend.blobs.has(attId)).toBe(false);
  });

  it('takes the bytes with it when the decision is deleted', async () => {
    const { store, backend, id, live } = await withDecision();
    await store.attach(id, png());
    const attId = live().attachments[0].id;

    store.delete(id);
    await new Promise((r) => setTimeout(r, 0));
    expect(backend.blobs.has(attId)).toBe(false);
  });

  it('reads back the bytes it stored', async () => {
    const { store, id, live } = await withDecision();
    await store.attach(id, png(64));
    expect(await store.blobFor(live().attachments[0].id)).toBeInstanceOf(Blob);
  });

  /** What an imported document produces: a fiche whose image is elsewhere. */
  it('reports no bytes for a fiche that has none', async () => {
    const { store } = await withDecision();
    expect(await store.blobFor('att-de-otra-maquina')).toBe(null);
  });

  it('refuses to attach when the store is unavailable', async () => {
    const { store } = await storeWith({ kind: 'unavailable', reason: 'otra pestaña' });
    expect(await store.attach('cualquiera', png())).toMatch(/no están disponibles/);
  });
});

describe('sweeping orphaned bytes', () => {
  const decisionWith = (attIds: string[]): DecisionsData => ({
    decisions: [
      {
        id: 'd1',
        origin: 'duda',
        originContext: '',
        question: '',
        internalNote: '',
        attachments: attIds.map((id) => ({
          id,
          name: `${id}.png`,
          size: 10,
          mime: 'image/png',
          addedAt: '2026-08-20',
        })),
        capturedAt: null,
        captureSource: 'tecleado',
        project: '',
        stakeholder: '',
        deadline: null,
        impact: null,
        notes: '',
        options: [],
        readyAt: null,
        recommendation: null,
        resolution: null,
      },
    ],
  });

  /** Bytes nobody can reach are rubbish; a fiche without bytes is a record. */
  it('drops bytes no fiche mentions', async () => {
    const backend = new FakeBackend({ kind: 'loaded', data: decisionWith(['vivo']) });
    backend.blobs.set('vivo', new Blob(['a']));
    backend.blobs.set('huerfano', new Blob(['b']));

    const store = new DecisionsStore(backend);
    await store.init();
    await new Promise((r) => setTimeout(r, 0));

    expect(backend.blobs.has('vivo')).toBe(true);
    expect(backend.blobs.has('huerfano')).toBe(false);
  });

  it('keeps a fiche whose bytes are missing', async () => {
    const backend = new FakeBackend({ kind: 'loaded', data: decisionWith(['sin-bytes']) });
    const store = new DecisionsStore(backend);
    await store.init();
    await new Promise((r) => setTimeout(r, 0));

    expect(store.all[0].attachments.map((a) => a.id)).toEqual(['sin-bytes']);
    expect(backend.deleted).toEqual([]);
  });

  it('sweeps nothing when the document could not be read', async () => {
    const backend = new FakeBackend({ kind: 'unavailable', reason: 'otra pestaña' });
    backend.blobs.set('cualquiera', new Blob(['a']));

    const store = new DecisionsStore(backend);
    await store.init();
    await new Promise((r) => setTimeout(r, 0));

    expect(backend.blobs.has('cualquiera')).toBe(true);
    expect(backend.deleted).toEqual([]);
  });
});
