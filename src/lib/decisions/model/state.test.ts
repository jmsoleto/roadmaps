import { describe, it, expect } from 'vitest';
import {
  byUrgency,
  canMarkReady,
  daysToDeadline,
  isCaptured,
  isOpen,
  openByUrgency,
  outcome,
  phaseOf,
  recommendationIsFrozen,
  recommendedOption,
  resolvedOption,
  studyChecklist,
} from './state';
import { knownProjects, suggestProjects } from './projects';
import type { Decision } from './types';

const TODAY = '2026-08-20';

let seq = 0;
const decision = (over: Partial<Decision> = {}): Decision => ({
  id: `d${++seq}`,
  origin: 'duda',
  originContext: '',
  question: '',
  project: '',
  stakeholder: '',
  deadline: null,
  impact: null,
  notes: '',
  internalNote: '',
  capturedAt: null,
  captureSource: 'tecleado',
  options: [],
  readyAt: null,
  recommendation: null,
  resolution: null,
  ...over,
});

/** A decision ready to be raised: it has been translated. */
const prepared = (over: Partial<Decision> = {}) =>
  decision({ question: '¿cuánto puede tardar?', ...over });

const ready = (over: Partial<Decision> = {}) => prepared({ readyAt: '2026-08-10', ...over });

describe('the three phases are derived', () => {
  it('a decision captured with one line is in phase 1', () => {
    expect(phaseOf(decision(), TODAY)).toBe('captura');
    expect(isCaptured(decision())).toBe(true);
  });

  it('whitespace does not count as a translation', () => {
    expect(phaseOf(decision({ question: '   ' }), TODAY)).toBe('captura');
  });

  it('translated but not yet declared ready is in phase 2', () => {
    expect(phaseOf(prepared(), TODAY)).toBe('estudio');
  });

  it('declared ready and still waiting is in phase 3', () => {
    expect(phaseOf(ready({ deadline: '2026-09-30' }), TODAY)).toBe('lista');
  });

  it('with a resolution it is resolved', () => {
    const d = ready({ resolution: { optionId: null, text: 'se cobra', at: '2026-08-18' } });
    expect(phaseOf(d, TODAY)).toBe('cerrada');
    expect(isOpen(d)).toBe(false);
  });

  /** Nobody marks this: it happens by the calendar moving. */
  it('lapses the day after its deadline, with nobody touching it', () => {
    expect(phaseOf(ready({ deadline: '2026-08-19' }), TODAY)).toBe('caducada');
  });

  it('is not late on the very day it is due', () => {
    expect(phaseOf(ready({ deadline: TODAY }), TODAY)).toBe('lista');
  });

  it('revives when its deadline moves forward', () => {
    const lapsed = ready({ deadline: '2026-08-01' });
    expect(phaseOf(lapsed, TODAY)).toBe('caducada');
    expect(phaseOf({ ...lapsed, deadline: '2026-09-15' }, TODAY)).toBe('lista');
  });

  it('resolved beats lapsed, whatever the deadline said', () => {
    const d = ready({
      deadline: '2026-08-01',
      resolution: { optionId: null, text: 'ya', at: '2026-08-25' },
    });
    expect(phaseOf(d, TODAY)).toBe('cerrada');
  });

  it('never lapses without a deadline', () => {
    expect(phaseOf(ready(), TODAY)).toBe('lista');
  });

  /** Only phase 3 can lapse: nothing else was ever put in front of anyone. */
  it('does not lapse a decision that never left the study', () => {
    expect(phaseOf(decision({ deadline: '2026-01-01' }), TODAY)).toBe('captura');
    expect(phaseOf(prepared({ deadline: '2026-01-01' }), TODAY)).toBe('estudio');
  });
});

describe('recommendation and resolution', () => {
  const options = [
    { id: 'o1', text: 'Gratis siempre', assessments: [] },
    { id: 'o2', text: 'Se cobra salvo defecto', assessments: [] },
  ];
  const rec = { optionId: 'o1', why: 'menos fricción', at: '2026-08-10' };

  it('is editable before the study closes and frozen after', () => {
    expect(recommendationIsFrozen(prepared({ recommendation: rec }))).toBe(false);
    expect(recommendationIsFrozen(ready({ recommendation: rec }))).toBe(true);
  });

  it('says it matched when the answer was the recommended one', () => {
    const d = ready({
      options,
      recommendation: rec,
      resolution: { optionId: 'o1', text: '', at: '2026-08-18' },
    });
    expect(outcome(d)).toBe('coincidió');
    expect(resolvedOption(d)?.text).toBe('Gratis siempre');
    expect(recommendedOption(d)?.text).toBe('Gratis siempre');
  });

  it('says another was chosen when it was a different alternative', () => {
    const d = ready({
      options,
      recommendation: rec,
      resolution: { optionId: 'o2', text: '', at: '2026-08-18' },
    });
    expect(outcome(d)).toBe('se decidió otra');
  });

  /**
   * The informative case: none of the alternatives offered was the answer, so
   * the framing was wrong. Information about whoever prepared it.
   */
  it('says it fell outside when the answer was none of the alternatives', () => {
    const d = ready({
      options,
      recommendation: rec,
      resolution: { optionId: null, text: 'gratis solo la primera vez', at: '2026-08-18' },
    });
    expect(outcome(d)).toBe('fuera de las alternativas');
    expect(resolvedOption(d)).toBe(null);
  });

  it('compares nothing when the decision was raised without a recommendation', () => {
    const d = ready({ options, resolution: { optionId: 'o2', text: '', at: '2026-08-18' } });
    expect(outcome(d)).toBe(null);
  });

  it('compares nothing while there is no resolution', () => {
    expect(outcome(ready({ options, recommendation: rec }))).toBe(null);
  });
});

describe('urgency', () => {
  const lapsed = ready({ deadline: '2026-08-05' });
  const soon = ready({ deadline: '2026-08-22' });
  const later = ready({ deadline: '2026-09-30' });
  const undated = ready();

  it('puts the lapsed ones first', () => {
    const sorted = [later, lapsed, soon].sort(byUrgency(TODAY));
    expect(sorted[0]).toBe(lapsed);
  });

  it('then the nearest deadline', () => {
    const sorted = [later, soon].sort(byUrgency(TODAY));
    expect(sorted.map((d) => d.deadline)).toEqual(['2026-08-22', '2026-09-30']);
  });

  it('leaves the undated ones last', () => {
    const sorted = [undated, later, soon].sort(byUrgency(TODAY));
    expect(sorted[sorted.length - 1]).toBe(undated);
  });

  it('mixes the three classes in the right order', () => {
    const sorted = [undated, later, lapsed, soon].sort(byUrgency(TODAY));
    expect(sorted).toEqual([lapsed, soon, later, undated]);
  });

  it('leaves resolved decisions out', () => {
    const done = ready({ resolution: { optionId: null, text: 'x', at: '2026-08-11' } });
    expect(openByUrgency([done, soon], TODAY)).toEqual([soon]);
  });

  it('counts the days to a deadline, negative once past', () => {
    expect(daysToDeadline(ready({ deadline: '2026-08-25' }), TODAY)).toBe(5);
    expect(daysToDeadline(ready({ deadline: '2026-08-15' }), TODAY)).toBe(-5);
    expect(daysToDeadline(ready(), TODAY)).toBe(null);
  });
});

describe('project suggestions', () => {
  const withProjects = (...names: string[]) => names.map((project) => decision({ project }));

  it('lists the projects already in use', () => {
    expect(knownProjects(withProjects('Checkout', 'Pagos', 'Checkout'))).toEqual([
      'Checkout',
      'Pagos',
    ]);
  });

  it('orders by how many decisions carry each', () => {
    expect(knownProjects(withProjects('Pagos', 'Checkout', 'Checkout'))[0]).toBe('Checkout');
  });

  it('ignores blank projects', () => {
    expect(knownProjects(withProjects('', '   ', 'Pagos'))).toEqual(['Pagos']);
  });

  /** The fragmentation this exists to prevent. */
  it('treats spelling variants as the same project, keeping the first label', () => {
    expect(knownProjects(withProjects('Checkout', 'checkout', 'CHECKOUT'))).toEqual(['Checkout']);
  });

  it('matches accent- and case-insensitively', () => {
    const ds = withProjects('Migración catálogo');
    expect(suggestProjects(ds, 'migracion')).toEqual(['Migración catálogo']);
    expect(suggestProjects(ds, 'CATÁLOGO')).toEqual(['Migración catálogo']);
  });

  it('keeps spaces, so a two-word query still finds it', () => {
    expect(suggestProjects(withProjects('Pagos marketplace'), 'pagos market')).toEqual([
      'Pagos marketplace',
    ]);
  });

  it('does not suggest what is already written in full', () => {
    expect(suggestProjects(withProjects('Checkout'), 'Checkout')).toEqual([]);
  });

  it('offers everything when nothing has been typed', () => {
    expect(suggestProjects(withProjects('A', 'B'), '')).toHaveLength(2);
  });
});

describe('closing the study', () => {
  const withOptions = (n: number, assessed = 0) =>
    prepared({
      options: Array.from({ length: n }, (_, i) => ({
        id: `o${i}`,
        text: `alt ${i}`,
        assessments:
          i < assessed ? [{ criterion: 'coste' as const, text: '75 k€', value: null }] : [],
      })),
    });

  it('reports each step of the study separately', () => {
    const d = withOptions(3, 2);
    expect(studyChecklist(d)).toEqual({
      translated: true,
      options: 3,
      assessed: 2,
      recommended: false,
    });
  });

  it('does not count an alternative whose assessments are all blank', () => {
    const d = prepared({
      options: [
        { id: 'o1', text: 'una', assessments: [{ criterion: 'coste', text: '   ', value: null }] },
      ],
    });
    expect(studyChecklist(d).assessed).toBe(0);
  });

  it('sees a capture as untranslated', () => {
    expect(studyChecklist(decision()).translated).toBe(false);
  });

  /** Only the translation gates the door: the rest is shown, not enforced. */
  it('lets the study close with alternatives still missing', () => {
    expect(canMarkReady(prepared())).toBe(true);
  });

  it('will not close a study that has nothing to present', () => {
    expect(canMarkReady(decision())).toBe(false);
  });

  it('will not close a study twice', () => {
    expect(canMarkReady(ready())).toBe(false);
  });

  it('will not close a decision already resolved', () => {
    const done = ready({ resolution: { optionId: null, text: 'ya', at: '2026-08-12' } });
    expect(canMarkReady(done)).toBe(false);
  });
});
