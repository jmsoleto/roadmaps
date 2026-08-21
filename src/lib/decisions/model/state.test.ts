import { describe, it, expect } from 'vitest';
import {
  byUrgency,
  daysToDeadline,
  decisionState,
  isDraft,
  isOpen,
  openByUrgency,
  outcome,
  recommendationIsFrozen,
  recommendedOption,
  resolvedOption,
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
  options: [],
  raisedAt: null,
  recommendation: null,
  resolution: null,
  ...over,
});

/** A decision ready to be raised: it has been translated. */
const prepared = (over: Partial<Decision> = {}) =>
  decision({ question: '¿cuánto puede tardar?', ...over });

const raised = (over: Partial<Decision> = {}) => prepared({ raisedAt: '2026-08-10', ...over });

describe('the lifecycle is derived', () => {
  it('a decision captured with one line is a draft', () => {
    expect(decisionState(decision(), TODAY)).toBe('borrador');
    expect(isDraft(decision())).toBe(true);
  });

  it('whitespace does not count as a translation', () => {
    expect(decisionState(decision({ question: '   ' }), TODAY)).toBe('borrador');
  });

  it('translated but not yet put in front of anyone is prepared', () => {
    expect(decisionState(prepared(), TODAY)).toBe('preparada');
  });

  it('raised and still waiting is raised', () => {
    expect(decisionState(raised({ deadline: '2026-09-30' }), TODAY)).toBe('planteada');
  });

  it('with a resolution it is resolved', () => {
    const d = raised({ resolution: { optionId: null, text: 'se cobra', at: '2026-08-18' } });
    expect(decisionState(d, TODAY)).toBe('resuelta');
    expect(isOpen(d, TODAY)).toBe(false);
  });

  /** Nobody marks this: it happens by the calendar moving. */
  it('lapses the day after its deadline, with nobody touching it', () => {
    expect(decisionState(raised({ deadline: '2026-08-19' }), TODAY)).toBe('caducada');
  });

  it('is not late on the very day it is due', () => {
    expect(decisionState(raised({ deadline: TODAY }), TODAY)).toBe('planteada');
  });

  it('revives when its deadline moves forward', () => {
    const lapsed = raised({ deadline: '2026-08-01' });
    expect(decisionState(lapsed, TODAY)).toBe('caducada');
    expect(decisionState({ ...lapsed, deadline: '2026-09-15' }, TODAY)).toBe('planteada');
  });

  it('resolved beats lapsed, whatever the deadline said', () => {
    const d = raised({
      deadline: '2026-08-01',
      resolution: { optionId: null, text: 'ya', at: '2026-08-25' },
    });
    expect(decisionState(d, TODAY)).toBe('resuelta');
  });

  it('never lapses without a deadline', () => {
    expect(decisionState(raised(), TODAY)).toBe('planteada');
  });

  /** A draft past a deadline is still a draft: it was never put to anyone. */
  it('does not lapse something that was never raised', () => {
    expect(decisionState(decision({ deadline: '2026-01-01' }), TODAY)).toBe('borrador');
    expect(decisionState(prepared({ deadline: '2026-01-01' }), TODAY)).toBe('preparada');
  });
});

describe('recommendation and resolution', () => {
  const options = [
    { id: 'o1', text: 'Gratis siempre', effects: [] },
    { id: 'o2', text: 'Se cobra salvo defecto', effects: [] },
  ];
  const rec = { optionId: 'o1', why: 'menos fricción', at: '2026-08-10' };

  it('is editable before raising and frozen after', () => {
    expect(recommendationIsFrozen(prepared({ recommendation: rec }))).toBe(false);
    expect(recommendationIsFrozen(raised({ recommendation: rec }))).toBe(true);
  });

  it('says it matched when the answer was the recommended one', () => {
    const d = raised({
      options,
      recommendation: rec,
      resolution: { optionId: 'o1', text: '', at: '2026-08-18' },
    });
    expect(outcome(d)).toBe('coincidió');
    expect(resolvedOption(d)?.text).toBe('Gratis siempre');
    expect(recommendedOption(d)?.text).toBe('Gratis siempre');
  });

  it('says another was chosen when it was a different alternative', () => {
    const d = raised({
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
    const d = raised({
      options,
      recommendation: rec,
      resolution: { optionId: null, text: 'gratis solo la primera vez', at: '2026-08-18' },
    });
    expect(outcome(d)).toBe('fuera de las alternativas');
    expect(resolvedOption(d)).toBe(null);
  });

  it('compares nothing when the decision was raised without a recommendation', () => {
    const d = raised({ options, resolution: { optionId: 'o2', text: '', at: '2026-08-18' } });
    expect(outcome(d)).toBe(null);
  });

  it('compares nothing while there is no resolution', () => {
    expect(outcome(raised({ options, recommendation: rec }))).toBe(null);
  });
});

describe('urgency', () => {
  const lapsed = raised({ deadline: '2026-08-05' });
  const soon = raised({ deadline: '2026-08-22' });
  const later = raised({ deadline: '2026-09-30' });
  const undated = raised();

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
    const done = raised({ resolution: { optionId: null, text: 'x', at: '2026-08-11' } });
    expect(openByUrgency([done, soon], TODAY)).toEqual([soon]);
  });

  it('counts the days to a deadline, negative once past', () => {
    expect(daysToDeadline(raised({ deadline: '2026-08-25' }), TODAY)).toBe(5);
    expect(daysToDeadline(raised({ deadline: '2026-08-15' }), TODAY)).toBe(-5);
    expect(daysToDeadline(raised(), TODAY)).toBe(null);
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
