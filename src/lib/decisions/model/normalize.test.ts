import { describe, it, expect } from 'vitest';
import { normalizeDecision, normalizeDecisions } from './normalize';
import { phaseOf, recommendationIsFrozen } from './state';

/**
 * A document exactly as the deployed version wrote it: three qualitative axes
 * with a direction, and `raisedAt` as the freeze point.
 */
const legacyDoc = () => ({
  decisions: [
    {
      id: 'd1',
      origin: '¿webhook o polling para el catálogo?',
      originContext: 'reunión equipo API · 12/08',
      question: '¿cuánto puede tardar un cambio de precio en verse?',
      project: 'Migración catálogo',
      stakeholder: 'Nuria G.',
      deadline: '2026-09-09',
      impact: 'alto',
      notes: 'lo habló también Iván',
      options: [
        {
          id: 'o1',
          text: 'Casi inmediato',
          effects: [
            { axis: 'coste', direction: 'sube', note: 'lo asume la compañía' },
            { axis: 'riesgo', direction: 'baja', note: '' },
            { axis: 'plazo', direction: 'igual', note: 'no mueve la fecha' },
          ],
        },
        { id: 'o2', text: 'Hasta una hora', effects: [] },
      ],
      raisedAt: '2026-08-15',
      recommendation: { optionId: 'o2', why: 'suficiente para negocio', at: '2026-08-15' },
      resolution: { optionId: 'o1', text: '', at: '2026-08-18' },
    },
  ],
});

const first = (doc: unknown) => normalizeDecisions(doc)!.decisions[0];

describe('reading a document from the previous model', () => {
  it('reads it whole', () => {
    const d = first(legacyDoc());
    expect(d.origin).toBe('¿webhook o polling para el catálogo?');
    expect(d.originContext).toBe('reunión equipo API · 12/08');
    expect(d.options).toHaveLength(2);
  });

  it('carries the freeze instant across the rename', () => {
    const d = first(legacyDoc());
    expect(d.readyAt).toBe('2026-08-15');
    expect(recommendationIsFrozen(d)).toBe(true);
    expect(d.recommendation?.at).toBe('2026-08-15');
    expect(d.recommendation?.why).toBe('suficiente para negocio');
  });

  it('maps each axis to its criterion', () => {
    const [a] = first(legacyDoc()).options;
    expect(a.assessments.map((x) => x.criterion)).toEqual(['coste', 'riesgo', 'tiempo']);
  });

  /** What the axis declared has to survive, direction included, in words. */
  it('turns the direction into words and keeps the note beside it', () => {
    const [a] = first(legacyDoc()).options;
    const byId = Object.fromEntries(a.assessments.map((x) => [x.criterion, x.text]));

    expect(byId.coste).toBe('sube · lo asume la compañía');
    expect(byId.riesgo).toBe('baja');
    expect(byId.tiempo).toBe('se mantiene · no mueve la fecha');
  });

  /**
   * The rule that protects the record: nobody wrote a figure in the old model,
   * and a plausible one would later be shown to the business side as if they had.
   */
  it('invents no magnitudes', () => {
    for (const option of first(legacyDoc()).options) {
      for (const a of option.assessments) expect(a.value).toBe(null);
    }
  });

  it('leaves the criteria the old model did not have empty', () => {
    const [a] = first(legacyDoc()).options;
    const ids = a.assessments.map((x) => x.criterion);
    expect(ids).not.toContain('esfuerzo');
    expect(ids).not.toContain('beneficio');
    expect(ids).not.toContain('deuda');
  });

  it('keeps an alternative that declared nothing', () => {
    const [, b] = first(legacyDoc()).options;
    expect(b.text).toBe('Hasta una hora');
    expect(b.assessments).toEqual([]);
  });

  it('reads the resolution and lands the decision as closed', () => {
    const d = first(legacyDoc());
    expect(d.resolution?.optionId).toBe('o1');
    expect(phaseOf(d, '2026-08-20')).toBe('cerrada');
  });

  it('fills in the fields the old model had no place for', () => {
    const d = first(legacyDoc());
    expect(d.internalNote).toBe('');
    expect(d.capturedAt).toBe(null);
    expect(d.captureSource).toBe('tecleado');
  });
});

describe('idempotence', () => {
  it('normalising twice changes nothing the second time', () => {
    const once = normalizeDecisions(legacyDoc());
    const twice = normalizeDecisions(once);
    expect(twice).toEqual(once);
  });

  /** Re-reading must never revert an option to what its long-gone axes said. */
  it('does not let stale axes overwrite current assessments', () => {
    const mixed = {
      decisions: [
        {
          id: 'd1',
          origin: 'x',
          options: [
            {
              id: 'o1',
              text: 'una',
              assessments: [
                { criterion: 'coste', text: '75 k€', value: { kind: 'money', amount: 75000 } },
              ],
              effects: [{ axis: 'coste', direction: 'sube', note: 'lo viejo' }],
            },
          ],
        },
      ],
    };
    const [o] = first(mixed).options;
    expect(o.assessments).toHaveLength(1);
    expect(o.assessments[0].text).toBe('75 k€');
    expect(o.assessments[0].value).toEqual({ kind: 'money', amount: 75000 });
  });
});

describe('defending against malformed documents', () => {
  it('rejects what is not a document', () => {
    expect(normalizeDecisions(null)).toBe(null);
    expect(normalizeDecisions('nope')).toBe(null);
    expect(normalizeDecisions({})).toBe(null);
  });

  it('skips a decision with no id', () => {
    expect(normalizeDecisions({ decisions: [{ origin: 'sin id' }] })!.decisions).toEqual([]);
  });

  it('drops an axis it does not recognise', () => {
    const doc = {
      decisions: [
        {
          id: 'd1',
          origin: 'x',
          options: [{ id: 'o1', text: 'una', effects: [{ axis: 'inventado', direction: 'sube' }] }],
        },
      ],
    };
    expect(first(doc).options[0].assessments).toEqual([]);
  });

  it('drops a malformed value but keeps its text', () => {
    const doc = {
      decisions: [
        {
          id: 'd1',
          origin: 'x',
          options: [
            {
              id: 'o1',
              text: 'una',
              assessments: [
                {
                  criterion: 'coste',
                  text: 'unos 75 mil',
                  value: { kind: 'money', amount: 'mucho' },
                },
                { criterion: 'riesgo', text: 'alto', value: { kind: 'level', level: 'altísimo' } },
              ],
            },
          ],
        },
      ],
    };
    const [o] = first(doc).options;
    expect(o.assessments.map((a) => [a.text, a.value])).toEqual([
      ['unos 75 mil', null],
      ['alto', null],
    ]);
  });

  it('keeps one assessment per criterion', () => {
    const doc = {
      decisions: [
        {
          id: 'd1',
          origin: 'x',
          options: [
            {
              id: 'o1',
              text: 'una',
              assessments: [
                { criterion: 'coste', text: 'primero' },
                { criterion: 'coste', text: 'repetido' },
              ],
            },
          ],
        },
      ],
    };
    expect(first(doc).options[0].assessments).toEqual([
      { criterion: 'coste', text: 'primero', value: null },
    ]);
  });

  /** A resolution on something never declared ready reads as closed-never-finished. */
  it('drops a resolution on a decision that was never declared ready', () => {
    const doc = {
      decisions: [
        {
          id: 'd1',
          origin: 'x',
          question: '¿?',
          resolution: { optionId: null, text: 'algo', at: '2026-08-18' },
        },
      ],
    };
    const d = first(doc);
    expect(d.resolution).toBe(null);
    expect(phaseOf(d, '2026-08-20')).toBe('estudio');
  });

  it('ignores dates that are not ISO', () => {
    const doc = {
      decisions: [{ id: 'd1', origin: 'x', deadline: '9 de septiembre', raisedAt: 'ayer' }],
    };
    const d = first(doc);
    expect(d.deadline).toBe(null);
    expect(d.readyAt).toBe(null);
  });

  it('normalises a single decision on its own', () => {
    expect(normalizeDecision({ id: 'd1', origin: 'x' })?.id).toBe('d1');
    expect(normalizeDecision({ origin: 'sin id' })).toBe(null);
  });
});
