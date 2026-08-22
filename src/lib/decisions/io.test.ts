import { describe, it, expect } from 'vitest';
import { ImportError, exportDecisions, parseDecisionsImport } from './io';
import { outcome, phaseOf } from './model/state';
import type { Decision } from './model/types';

const full = (): Decision => ({
  id: 'd1',
  origin: '¿webhook o polling para el catálogo?',
  originContext: 'reunión equipo API · 12/08',
  question: '¿cuánto puede tardar un cambio de precio en verse?',
  project: 'Migración catálogo',
  stakeholder: 'Nuria G.',
  deadline: '2026-09-09',
  impact: 'alto',
  notes: 'lo habló también Iván',
  internalNote: 'el equipo de pagos no llega a Q4',
  capturedAt: '2026-08-12',
  captureSource: 'tecleado',
  options: [
    {
      id: 'o1',
      text: 'Casi inmediato',
      assessments: [
        { criterion: 'coste', text: '140 k€', value: { kind: 'money', amount: 140000 } },
        {
          criterion: 'riesgo',
          text: 'conciliación diaria',
          value: { kind: 'level', level: 'alto' },
        },
      ],
    },
    { id: 'o2', text: 'Hasta una hora', assessments: [] },
  ],
  readyAt: '2026-08-15',
  recommendation: { optionId: 'o2', why: 'suficiente para el negocio', at: '2026-08-15' },
  resolution: { optionId: 'o1', text: '', at: '2026-08-18' },
});

const roundTrip = (ds: Decision[]) => parseDecisionsImport(exportDecisions(ds));

describe('exporting decisions', () => {
  it('writes a document that says what it is', () => {
    const doc = JSON.parse(exportDecisions([full()]));
    expect(doc.kind).toBe('tech-lead-hub/decisions');
    expect(doc.version).toBe(2);
    expect(doc.decisions).toHaveLength(1);
  });

  it('carries everything needed to rebuild the derived readings', () => {
    const [back] = roundTrip([full()]);

    expect(phaseOf(back, '2026-08-20')).toBe('cerrada');
    // The outcome is derived, never stored — so it only survives if the frozen
    // recommendation and the resolution both came across, references included.
    expect(outcome(back)).toBe('se decidió otra');
  });

  it('keeps both texts and the context of the origin', () => {
    const [back] = roundTrip([full()]);
    expect(back.origin).toBe('¿webhook o polling para el catálogo?');
    expect(back.originContext).toBe('reunión equipo API · 12/08');
    expect(back.question).toBe('¿cuánto puede tardar un cambio de precio en verse?');
  });

  it('keeps the recommendation with its reason and the day it froze', () => {
    const [back] = roundTrip([full()]);
    expect(back.recommendation?.why).toBe('suficiente para el negocio');
    expect(back.recommendation?.at).toBe('2026-08-15');
    expect(back.options.find((o) => o.id === back.recommendation?.optionId)?.text).toBe(
      'Hasta una hora',
    );
  });

  it('keeps every assessment, with its text and its value', () => {
    const [back] = roundTrip([full()]);
    expect(back.options[0].assessments).toEqual([
      { criterion: 'coste', text: '140 k€', value: { kind: 'money', amount: 140000 } },
      { criterion: 'riesgo', text: 'conciliación diaria', value: { kind: 'level', level: 'alto' } },
    ]);
    expect(back.options[1].assessments).toEqual([]);
  });

  it('keeps the internal note and the provenance of the capture', () => {
    const [back] = roundTrip([full()]);
    expect(back.internalNote).toBe('el equipo de pagos no llega a Q4');
    expect(back.capturedAt).toBe('2026-08-12');
    expect(back.captureSource).toBe('tecleado');
  });

  it('keeps a resolution taken outside the alternatives', () => {
    const d = full();
    d.resolution = { optionId: null, text: 'depende del país', at: '2026-08-18' };
    const [back] = roundTrip([d]);
    expect(back.resolution?.optionId).toBe(null);
    expect(back.resolution?.text).toBe('depende del país');
    expect(outcome(back)).toBe('fuera de las alternativas');
  });
});

describe('importing decisions', () => {
  it('reissues identity so importing twice does not overwrite', () => {
    const first = roundTrip([full()]);
    const second = roundTrip([full()]);
    expect(first[0].id).not.toBe(second[0].id);
    // Option ids are reissued too, and the references follow them.
    expect(first[0].options[0].id).not.toBe(second[0].options[0].id);
    expect(second[0].recommendation?.optionId).toBe(second[0].options[1].id);
  });

  it('rejects a roadmaps document by name', () => {
    const roadmapDoc = JSON.stringify({ roadmap: { name: 'Plataforma', rows: [] } });
    expect(() => parseDecisionsImport(roadmapDoc)).toThrow(ImportError);
    expect(() => parseDecisionsImport(roadmapDoc)).toThrow(/roadmaps/i);
  });

  it('rejects anything that is not our document', () => {
    expect(() => parseDecisionsImport('{"kind":"otra-cosa","decisions":[]}')).toThrow(ImportError);
    expect(() => parseDecisionsImport('no es json')).toThrow(/JSON/);
    expect(() => parseDecisionsImport('[]')).toThrow(ImportError);
  });

  it('rejects a document with no readable decision instead of importing nothing', () => {
    const empty = JSON.stringify({ kind: 'tech-lead-hub/decisions', version: 1, decisions: [] });
    expect(() => parseDecisionsImport(empty)).toThrow(/ninguna decisión/);
  });

  it('skips a decision with neither text but keeps the rest', () => {
    const doc = JSON.stringify({
      kind: 'tech-lead-hub/decisions',
      version: 1,
      decisions: [{ origin: '', question: '' }, { origin: 'sí vale' }],
    });
    const out = parseDecisionsImport(doc);
    expect(out).toHaveLength(1);
    expect(out[0].origin).toBe('sí vale');
  });

  it('tolerates missing optional fields', () => {
    const doc = JSON.stringify({
      kind: 'tech-lead-hub/decisions',
      version: 1,
      decisions: [{ origin: 'mínima' }],
    });
    const [back] = parseDecisionsImport(doc);
    expect(back.project).toBe('');
    expect(back.deadline).toBe(null);
    expect(back.impact).toBe(null);
    expect(back.options).toEqual([]);
    expect(phaseOf(back, '2026-08-20')).toBe('captura');
  });

  it('drops an assessment on a criterion it does not know', () => {
    const doc = JSON.stringify({
      kind: 'tech-lead-hub/decisions',
      version: 1,
      decisions: [
        {
          origin: 'x',
          options: [
            {
              id: 'o1',
              text: 'una',
              assessments: [
                { criterion: 'inventado', text: 'nada' },
                { criterion: 'coste', text: '30 k€' },
              ],
            },
          ],
        },
      ],
    });
    expect(parseDecisionsImport(doc)[0].options[0].assessments).toEqual([
      { criterion: 'coste', text: '30 k€', value: null },
    ]);
  });

  /** A resolution on something never raised would read as resolved-never-asked. */
  it('drops a resolution on a decision that was never declared ready', () => {
    const d = full();
    d.readyAt = null;
    const [back] = roundTrip([d]);
    expect(back.resolution).toBe(null);
    expect(phaseOf(back, '2026-08-20')).toBe('estudio');
  });

  it('degrades a resolution whose alternative is missing into a free-text one', () => {
    const doc = JSON.stringify({
      kind: 'tech-lead-hub/decisions',
      version: 1,
      decisions: [
        {
          origin: 'x',
          question: '¿?',
          readyAt: '2026-08-10',
          options: [],
          resolution: { optionId: 'perdida', text: 'lo que fuera', at: '2026-08-12' },
        },
      ],
    });
    const [back] = parseDecisionsImport(doc);
    expect(back.resolution).toEqual({ optionId: null, text: 'lo que fuera', at: '2026-08-12' });
  });

  it('drops a recommendation pointing at an alternative that is not in the document', () => {
    const doc = JSON.stringify({
      kind: 'tech-lead-hub/decisions',
      version: 1,
      decisions: [
        {
          origin: 'x',
          question: '¿?',
          options: [{ id: 'o1', text: 'una' }],
          recommendation: { optionId: 'fantasma', why: 'porque sí', at: '2026-08-10' },
        },
      ],
    });
    expect(parseDecisionsImport(doc)[0].recommendation).toBe(null);
  });

  it('ignores a deadline that is not an ISO date', () => {
    const doc = JSON.stringify({
      kind: 'tech-lead-hub/decisions',
      version: 1,
      decisions: [{ origin: 'x', deadline: '9 de septiembre' }],
    });
    expect(parseDecisionsImport(doc)[0].deadline).toBe(null);
  });
});

/**
 * The reason `parseDecisionsImport` delegates to `normalizeDecision`: a backup
 * taken before the criteria model existed still has to come back.
 */
describe('importing a document written by the previous version', () => {
  const legacy = JSON.stringify({
    kind: 'tech-lead-hub/decisions',
    version: 1,
    decisions: [
      {
        id: 'd1',
        origin: '¿webhook o polling?',
        question: '¿cuánto puede tardar?',
        options: [
          {
            id: 'o1',
            text: 'Casi inmediato',
            effects: [{ axis: 'coste', direction: 'sube', note: 'más infraestructura' }],
          },
        ],
        raisedAt: '2026-08-15',
        recommendation: { optionId: 'o1', why: 'porque sí', at: '2026-08-15' },
      },
    ],
  });

  it('accepts it and converts its axes', () => {
    const [back] = parseDecisionsImport(legacy);
    expect(back.options[0].assessments).toEqual([
      { criterion: 'coste', text: 'sube · más infraestructura', value: null },
    ]);
  });

  it('carries the freeze across, references included', () => {
    const [back] = parseDecisionsImport(legacy);
    expect(back.readyAt).toBe('2026-08-15');
    expect(back.recommendation?.optionId).toBe(back.options[0].id);
    expect(back.recommendation?.at).toBe('2026-08-15');
  });

  it('reissues identity for the old document too', () => {
    const a = parseDecisionsImport(legacy);
    const b = parseDecisionsImport(legacy);
    expect(a[0].id).not.toBe(b[0].id);
    expect(a[0].options[0].id).not.toBe(b[0].options[0].id);
  });
});
