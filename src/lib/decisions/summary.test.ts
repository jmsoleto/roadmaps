import { describe, it, expect } from 'vitest';
import { decisionAlerts, decisionRows, decisionStats, decisionsSummary } from './summary';
import type { Decision } from './model/types';

const TODAY = '2026-08-20';

let seq = 0;
const decision = (over: Partial<Decision> = {}): Decision => ({
  id: `d${++seq}`,
  origin: 'duda técnica',
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

const raised = (over: Partial<Decision> = {}) =>
  decision({ question: '¿pregunta para negocio?', raisedAt: '2026-08-10', ...over });

describe('the three figures', () => {
  it('counts open, untranslated and lapsed', () => {
    const ds = [
      decision(), // borrador
      raised({ deadline: '2026-09-30' }), // planteada
      raised({ deadline: '2026-08-01' }), // caducada
      raised({ resolution: { optionId: null, text: 'ya', at: '2026-08-12' } }), // resuelta
    ];
    const [open, drafts, lapsed] = decisionStats(ds, TODAY);

    expect(open.value).toBe(3);
    expect(drafts.value).toBe(1);
    expect(lapsed.value).toBe(1);
    expect(lapsed.tone).toBe('danger');
  });

  /** The total only goes up; it stops informing after three months. */
  it('counts open decisions, not the historical total', () => {
    const ds = Array.from({ length: 5 }, () =>
      raised({ resolution: { optionId: null, text: 'x', at: '2026-08-12' } }),
    );
    ds.push(raised({ deadline: '2026-09-30' }));
    expect(decisionStats(ds, TODAY)[0].value).toBe(1);
  });

  it('reads all zeroes and no tone when there is nothing', () => {
    const [open, drafts, lapsed] = decisionStats([], TODAY);
    expect([open.value, drafts.value, lapsed.value]).toEqual([0, 0, 0]);
    expect(lapsed.tone).toBe('neutral');
  });

  it('does not tone a zero of lapsed', () => {
    expect(decisionStats([raised({ deadline: '2026-09-30' })], TODAY)[2].tone).toBe('neutral');
  });
});

describe('the short list', () => {
  it('shows the most urgent first', () => {
    const lapsed = raised({ question: 'vencida', deadline: '2026-08-01' });
    const soon = raised({ question: 'pronto', deadline: '2026-08-22' });
    const later = raised({ question: 'lejos', deadline: '2026-09-30' });

    expect(decisionRows([later, soon, lapsed], TODAY).map((r) => r.label)).toEqual([
      'vencida',
      'pronto',
      'lejos',
    ]);
  });

  /**
   * A draft cannot be put to anyone yet, so it has no business under "toca
   * hablarlas" — even though it does count in the figures.
   */
  it('leaves drafts out of the rows while still counting them', () => {
    const ds = [decision({ origin: 'sin traducir' }), raised({ question: 'lista' })];
    expect(decisionRows(ds, TODAY).map((r) => r.label)).toEqual(['lista']);
    expect(decisionStats(ds, TODAY)[1].value).toBe(1);
  });

  it('leaves resolved decisions out', () => {
    const done = raised({
      question: 'cerrada',
      resolution: { optionId: null, text: 'x', at: '2026-08-12' },
    });
    expect(decisionRows([done], TODAY)).toEqual([]);
  });

  it('shows at most three', () => {
    const ds = Array.from({ length: 6 }, (_, i) =>
      raised({ question: `q${i}`, deadline: `2026-09-0${(i % 9) + 1}` }),
    );
    expect(decisionRows(ds, TODAY)).toHaveLength(3);
  });

  it('marks what already expired in danger tone', () => {
    const [row] = decisionRows([raised({ deadline: '2026-08-01' })], TODAY);
    expect(row.meta).toBe('venció 01/08');
    expect(row.metaTone).toBe('danger');
  });

  it('marks what is due today', () => {
    const [row] = decisionRows([raised({ deadline: TODAY })], TODAY);
    expect(row.meta).toBe('hoy');
    expect(row.metaTone).toBe('danger');
  });

  it('warns about what is due within the week', () => {
    const [row] = decisionRows([raised({ deadline: '2026-08-24' })], TODAY);
    expect(row.metaTone).toBe('warn');
  });

  it('says so when there is no date', () => {
    const [row] = decisionRows([raised()], TODAY);
    expect(row.meta).toBe('sin fecha');
    expect(row.metaTone).toBe('neutral');
  });

  /**
   * A whitespace-only question is not a translation, so the decision is still a
   * draft and stays out of the rows — even though it was somehow raised.
   */
  it('treats a blank question as untranslated, not as a row', () => {
    const ds = [raised({ question: '  ', origin: 'la duda cruda' })];
    expect(decisionRows(ds, TODAY)).toEqual([]);
    expect(decisionStats(ds, TODAY)[1].value).toBe(1);
  });

  it('labels a row with the question put to the business', () => {
    const [row] = decisionRows([raised({ question: '¿cuánto puede tardar?' })], TODAY);
    expect(row.label).toBe('¿cuánto puede tardar?');
  });
});

describe('alerts', () => {
  it('names each lapsed decision, with its project', () => {
    const d = raised({
      question: '¿se cobra el envío?',
      project: 'Logística',
      deadline: '2026-08-01',
    });
    const [alert] = decisionAlerts([d], TODAY);

    expect(alert.text).toBe('Venció sin resolución: ¿se cobra el envío?');
    expect(alert.source).toBe('Decisions · Logística');
    expect(alert.tone).toBe('danger');
  });

  it('omits the project when there is none', () => {
    const d = raised({ question: 'x', deadline: '2026-08-01' });
    expect(decisionAlerts([d], TODAY)[0].source).toBe('Decisions');
  });

  it('warns about what is due this week, without double-counting the lapsed', () => {
    const ds = [raised({ deadline: '2026-08-22' }), raised({ deadline: '2026-08-01' })];
    const soon = decisionAlerts(ds, TODAY).find((a) => a.id === 'soon');
    expect(soon?.text).toBe('Una decisión vence esta semana');
    expect(soon?.tone).toBe('warn');
  });

  it('reports drafts only once they pile up', () => {
    const two = [decision(), decision()];
    expect(decisionAlerts(two, TODAY).find((a) => a.id === 'drafts')).toBeUndefined();

    const four = [decision(), decision(), decision(), decision()];
    expect(decisionAlerts(four, TODAY).find((a) => a.id === 'drafts')?.text).toBe(
      '4 decisiones capturadas sin traducir a negocio',
    );
  });

  it('says nothing when there is nothing to say', () => {
    expect(decisionAlerts([], TODAY)).toEqual([]);
    expect(decisionAlerts([raised({ deadline: '2026-12-01' })], TODAY)).toEqual([]);
  });

  it('orders loudest first', () => {
    const ds = [
      decision(),
      decision(),
      decision(),
      raised({ deadline: '2026-08-22' }),
      raised({ deadline: '2026-08-01' }),
    ];
    expect(decisionAlerts(ds, TODAY).map((a) => a.tone)).toEqual(['danger', 'warn', 'neutral']);
  });
});

describe('the whole summary', () => {
  it('titles its list with the label Decisions chose', () => {
    const s = decisionsSummary([], TODAY);
    expect(s.list.label).toBe('TOCA HABLARLAS');
    expect(s.list.emptyLabel).not.toBe('');
    expect(s.stats).toHaveLength(3);
  });
});
