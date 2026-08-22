import { describe, it, expect } from 'vitest';
import { effortBenefit, monthTicks, positionOn, presentableOf, timeline } from './present';
import type { Assessment, Decision, Option } from './model/types';

const TODAY = '2026-08-22';

const option = (id: string, text: string, assessments: Assessment[] = []): Option => ({
  id,
  text,
  assessments,
});

const decision = (over: Partial<Decision> = {}): Decision => ({
  id: 'd1',
  origin: '¿los reembolsos los emite el PSP o los liquidamos contra el ledger?',
  originContext: 'daily del 19/08 con el equipo de pagos',
  capturedAt: '2026-08-19',
  captureSource: 'tecleado',
  question: '¿Devolvemos el mismo día aunque cueste más, o en 3–5 días?',
  project: 'Checkout v3',
  stakeholder: 'Marta R.',
  deadline: '2026-09-27',
  impact: 'alto',
  notes: '',
  internalNote: 'el equipo de pagos no llega a Q4 ni de broma',
  attachments: [],
  options: [],
  readyAt: '2026-08-22',
  recommendation: null,
  resolution: null,
  ...over,
});

const effort = (weeks: number, people: number | null = null): Assessment => ({
  criterion: 'esfuerzo',
  text: `${weeks} semanas`,
  value: { kind: 'effort', weeks, people },
});
const benefit = (score: number): Assessment => ({
  criterion: 'beneficio',
  text: 'lo que se gana',
  value: { kind: 'appraisal', score },
});
const when = (date: string): Assessment => ({
  criterion: 'tiempo',
  text: 'cuándo',
  value: { kind: 'date', date },
});

describe('what the presentation may show', () => {
  /**
   * The requirement with teeth: the working material must be absent from what
   * the view is built from, not merely hidden by a style.
   */
  it('leaves out every piece of working material, at any depth', () => {
    const d = decision({
      options: [option('o1', 'Vía PSP', [effort(8, 2)])],
      recommendation: { optionId: 'o1', why: 'la mitad de esfuerzo que A', at: '2026-08-22' },
    });

    const dump = JSON.stringify(presentableOf(d));
    expect(dump).not.toContain('ledger');
    expect(dump).not.toContain('daily del 19/08');
    expect(dump).not.toContain('no llega a Q4');
    expect(dump).not.toContain('la mitad de esfuerzo');
    expect(dump).not.toMatch(/origin|internalNote|why/);
  });

  it('does show the question and the alternatives', () => {
    const p = presentableOf(decision({ options: [option('o1', 'Vía PSP', [effort(8)])] }));
    expect(p.question).toMatch(/Devolvemos el mismo día/);
    expect(p.options[0].text).toBe('Vía PSP');
  });

  it('marks the recommended alternative', () => {
    const d = decision({
      options: [option('o1', 'A'), option('o2', 'B')],
      recommendation: { optionId: 'o2', why: 'secreto', at: '2026-08-22' },
    });
    expect(presentableOf(d).options.map((o) => o.recommended)).toEqual([false, true]);
  });

  it('letters the alternatives in order', () => {
    const d = decision({ options: [option('o1', 'A'), option('o2', 'B'), option('o3', 'C')] });
    expect(presentableOf(d).options.map((o) => o.letter)).toEqual(['A', 'B', 'C']);
  });

  it('renders each magnitude for the room', () => {
    const d = decision({
      options: [
        option('o1', 'A', [
          effort(14, 3),
          { criterion: 'coste', text: '', value: { kind: 'money', amount: 140000 } },
          when('2027-01-15'),
          { criterion: 'riesgo', text: '', value: { kind: 'level', level: 'alto' } },
          benefit(4),
        ]),
      ],
    });
    expect(presentableOf(d).options[0].assessments.map((a) => a.value)).toEqual([
      '14 sem · 3 devs',
      '140 k€',
      "ene '27",
      'alto',
      '4 de 5',
    ]);
  });

  it('drops a criterion nobody said anything about', () => {
    const p = presentableOf(decision({ options: [option('o1', 'A', [effort(8)])] }));
    expect(p.options[0].assessments.map((a) => a.criterion)).toEqual(['esfuerzo']);
  });
});

describe('effort against benefit', () => {
  it('places the alternatives that have both magnitudes', () => {
    const d = decision({
      options: [
        option('o1', 'Propia', [effort(14), benefit(4)]),
        option('o2', 'PSP', [effort(8), benefit(4)]),
      ],
    });
    const chart = effortBenefit(d);
    expect(chart.points.map((p) => [p.letter, p.weeks, p.score])).toEqual([
      ['A', 14, 4],
      ['B', 8, 4],
    ]);
    expect(chart.maxWeeks).toBe(14);
  });

  /** A point at zero effort would read as "this one is free". */
  it('leaves out what it cannot place, and names it', () => {
    const d = decision({
      options: [
        option('o1', 'Propia', [effort(14), benefit(4)]),
        option('o2', 'Sin esfuerzo declarado', [benefit(5)]),
        option('o3', 'Sin nada', []),
      ],
    });
    const chart = effortBenefit(d);
    expect(chart.points.map((p) => p.letter)).toEqual(['A']);
    expect(chart.unplotted.map((u) => u.letter)).toEqual(['B', 'C']);
    expect(chart.points.every((p) => p.weeks > 0)).toBe(true);
  });

  it('has nothing to draw when nobody quantified anything', () => {
    const chart = effortBenefit(decision({ options: [option('o1', 'A'), option('o2', 'B')] }));
    expect(chart.points).toEqual([]);
    expect(chart.unplotted).toHaveLength(2);
  });

  it('marks the recommended point', () => {
    const d = decision({
      options: [option('o1', 'A', [effort(8), benefit(3)])],
      recommendation: { optionId: 'o1', why: 'x', at: '2026-08-22' },
    });
    expect(effortBenefit(d).points[0].recommended).toBe(true);
  });
});

describe('when the customer would have it', () => {
  it('places the alternatives that declare a date', () => {
    const d = decision({
      options: [option('o1', 'A', [when('2027-01-15')]), option('o2', 'B', [when('2026-11-02')])],
    });
    const chart = timeline(d, TODAY);
    expect(chart.points.map((p) => [p.letter, p.date])).toEqual([
      ['A', '2027-01-15'],
      ['B', '2026-11-02'],
    ]);
  });

  /** Without today on the axis, "how far off is this" is unreadable. */
  it('stretches the axis to contain today', () => {
    const d = decision({ options: [option('o1', 'A', [when('2027-01-15')])] });
    const chart = timeline(d, TODAY);
    expect(chart.from).toBe(TODAY);
    expect(chart.to).toBe('2027-01-15');
  });

  it('names what has no date', () => {
    const d = decision({
      options: [option('o1', 'A', [when('2026-11-02')]), option('o2', 'B', [effort(4)])],
    });
    expect(timeline(d, TODAY).unplotted.map((u) => u.letter)).toEqual(['B']);
  });

  it('positions a date between the two ends', () => {
    expect(positionOn('2026-01-01', '2026-01-11', '2026-01-06')).toBeCloseTo(0.5, 2);
    expect(positionOn('2026-01-01', '2026-01-11', '2026-01-01')).toBe(0);
    expect(positionOn('2026-01-01', '2026-01-11', '2026-01-11')).toBe(1);
  });

  it('clamps a date outside the span instead of overflowing', () => {
    expect(positionOn('2026-01-01', '2026-01-11', '2025-06-01')).toBe(0);
    expect(positionOn('2026-01-01', '2026-01-11', '2027-06-01')).toBe(1);
  });

  it('survives both ends being the same day', () => {
    expect(positionOn('2026-01-01', '2026-01-01', '2026-01-01')).toBe(0);
  });

  it('ticks every month over a short span', () => {
    const ticks = monthTicks('2026-09-01', '2026-12-15');
    expect(ticks.map((t) => t.label)).toEqual(['SEP', 'OCT', 'NOV', 'DIC']);
  });

  it('thins the ticks over a long span instead of crowding them', () => {
    const ticks = monthTicks('2026-01-01', '2028-01-01');
    expect(ticks.length).toBeLessThan(12);
  });
});
