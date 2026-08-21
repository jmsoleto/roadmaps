import { describe, it, expect } from 'vitest';
import type { Item, Phase, Roadmap } from '../model/types';
import {
  recentRows,
  roadmapAlerts,
  roadmapSlip,
  roadmapStats,
  roadmapsSummary,
} from './roadmaps-summary';

const TODAY = '2026-08-20';

let seq = 0;
const item = (over: Partial<Item> = {}): Item => ({
  id: `i${++seq}`,
  label: 'item',
  colorSlot: 0,
  startDate: '2026-08-01',
  endDate: '2026-08-10',
  assigneeId: null,
  notes: '',
  dependsOn: [],
  blockers: [],
  isMilestone: false,
  completedDate: null,
  endAtCompletion: null,
  baselineEnd: null,
  ...over,
});

const phase = (children: Item[], over: Partial<Phase> = {}): Phase => ({
  id: `p${++seq}`,
  name: 'fase',
  colorSlot: 0,
  expanded: true,
  assigneeId: null,
  notes: '',
  startDate: null,
  endDate: null,
  children,
  ...over,
});

const roadmap = (name: string, rows: Phase[], over: Partial<Roadmap> = {}): Roadmap => ({
  id: name,
  name,
  startDate: '2026-01-01',
  windowDays: 730,
  rows,
  baselineDate: null,
  ...over,
});

/** An item completed `slip` days after the end its committed plan gave it. */
const slipped = (slip: number): Item =>
  item({
    baselineEnd: '2026-08-10',
    endAtCompletion: '2026-08-10',
    completedDate: `2026-08-${String(10 + slip).padStart(2, '0')}`,
  });

const palette = (slot: number) => `#slot${slot}`;

describe('the three figures', () => {
  it('counts roadmaps, active phases and slipping roadmaps', () => {
    const rms = [
      roadmap('a', [phase([item(), item()]), phase([slipped(3)])], { baselineDate: '2026-06-02' }),
      roadmap('b', [phase([item()])]),
    ];
    const [roadmaps, phases, slipping] = roadmapStats(rms);

    expect(roadmaps.value).toBe(2);
    // Three phases exist; the one whose only item is completed is not active.
    expect(phases.value).toBe(2);
    expect(slipping.value).toBe(1);
    expect(slipping.tone).toBe('danger');
  });

  it('does not count an empty phase as active', () => {
    const [, phases] = roadmapStats([roadmap('a', [phase([])])]);
    expect(phases.value).toBe(0);
  });

  it('reads all zeroes and no tone when there is nothing', () => {
    const [roadmaps, phases, slipping] = roadmapStats([]);
    expect([roadmaps.value, phases.value, slipping.value]).toEqual([0, 0, 0]);
    expect(slipping.tone).toBe('neutral');
  });

  /**
   * An item that has no baseline was added after the plan was fixed (D5 of the
   * completion change), so it has nothing to slip against — not a slip of zero.
   */
  it('does not call a roadmap without a fixed plan slipping', () => {
    const rm = roadmap('a', [phase([item({ completedDate: '2026-08-19' })])]);
    expect(roadmapSlip(rm)).toBe(null);
    expect(roadmapStats([rm])[2].value).toBe(0);
  });

  it('reports the worst slip, not the sum of parallel ones', () => {
    const rm = roadmap('a', [phase([slipped(3), slipped(9), slipped(2)])]);
    expect(roadmapSlip(rm)).toBe(9);
  });

  it('ignores an item that finished early', () => {
    const early = item({
      baselineEnd: '2026-08-10',
      endAtCompletion: '2026-08-10',
      completedDate: '2026-08-04',
    });
    expect(roadmapSlip(roadmap('a', [phase([early])]))).toBe(null);
  });
});

describe('the short list', () => {
  const rms = [
    roadmap('uno', [phase([item({ endDate: '2026-09-30' })])]),
    roadmap('dos', [phase([slipped(9)])], { baselineDate: '2026-06-02' }),
  ];

  it('follows the order of the recent openings', () => {
    const rows = recentRows(
      rms,
      [
        { id: 'dos', at: 2 },
        { id: 'uno', at: 1 },
      ],
      TODAY,
      palette,
    );
    expect(rows.map((r) => r.id)).toEqual(['dos', 'uno']);
  });

  it('colours a row by the roadmap position, as the "Todos" view does', () => {
    const rows = recentRows(rms, [{ id: 'dos', at: 1 }], TODAY, palette);
    expect(rows[0].color).toBe('#slot1');
  });

  it('shows the slip as the row detail, in danger tone', () => {
    const rows = recentRows(rms, [{ id: 'dos', at: 1 }], TODAY, palette);
    expect(rows[0].meta).toBe('+9 d');
    expect(rows[0].metaTone).toBe('danger');
  });

  it('shows overdue work when there is no slip yet', () => {
    const rm = roadmap('tarde', [phase([item({ endDate: '2026-08-01' })])]);
    const rows = recentRows([rm], [{ id: 'tarde', at: 1 }], TODAY, palette);
    expect(rows[0].meta).toBe('1 vencido');
    expect(rows[0].metaTone).toBe('danger');
  });

  it('says "en plan" for a roadmap with a fixed plan and nothing wrong', () => {
    const rm = roadmap('ok', [phase([item({ endDate: '2026-09-30' })])], {
      baselineDate: '2026-06-02',
    });
    expect(recentRows([rm], [{ id: 'ok', at: 1 }], TODAY, palette)[0].meta).toBe('en plan');
  });

  it('says "sin fechas" for a roadmap with no dated work', () => {
    const rm = roadmap('vacio', [phase([])]);
    expect(recentRows([rm], [{ id: 'vacio', at: 1 }], TODAY, palette)[0].meta).toBe('sin fechas');
  });

  it('shows at most three rows', () => {
    const many = ['a', 'b', 'c', 'd'].map((n) => roadmap(n, [phase([item()])]));
    const recent = many.map((r, i) => ({ id: r.id, at: i }));
    expect(recentRows(many, recent, TODAY, palette)).toHaveLength(3);
  });

  it('skips an opening whose roadmap is gone', () => {
    const rows = recentRows(
      rms,
      [
        { id: 'fantasma', at: 2 },
        { id: 'uno', at: 1 },
      ],
      TODAY,
      palette,
    );
    expect(rows.map((r) => r.id)).toEqual(['uno']);
  });

  it('is empty when nothing has been opened', () => {
    expect(recentRows(rms, [], TODAY, palette)).toEqual([]);
  });
});

describe('alerts', () => {
  it('reports a roadmap that accumulated slip, naming it and its plan', () => {
    const rm = roadmap('Checkout v3', [phase([slipped(9)])], { baselineDate: '2026-06-02' });
    const [alert] = roadmapAlerts([rm], TODAY);

    expect(alert.text).toBe('Checkout v3 acumula 9 días de desviación');
    expect(alert.source).toBe('Roadmaps · plan fijado el 02/06/26');
    expect(alert.tone).toBe('danger');
  });

  it('reports work that passed its date without closing', () => {
    const rm = roadmap('a', [
      phase([item({ endDate: '2026-08-01' }), item({ endDate: '2026-08-05' })]),
    ]);
    const alert = roadmapAlerts([rm], TODAY).find((a) => a.id === 'overdue');
    expect(alert?.text).toBe('2 items pasaron de fecha sin cerrarse');
    expect(alert?.tone).toBe('warn');
  });

  it('does not call completed work overdue', () => {
    const rm = roadmap('a', [
      phase([item({ endDate: '2026-08-01', completedDate: '2026-08-03' })]),
    ]);
    expect(roadmapAlerts([rm], TODAY).find((a) => a.id === 'overdue')).toBeUndefined();
  });

  it('reports unresolved external dependencies', () => {
    const rm = roadmap('a', [
      phase([
        item({
          endDate: '2026-09-30',
          blockers: [
            { id: 'b1', blockerId: 'x', feature: 'algo', resolved: false },
            { id: 'b2', blockerId: 'x', feature: 'otra', resolved: true },
          ],
        }),
      ]),
    ]);
    const alert = roadmapAlerts([rm], TODAY).find((a) => a.id === 'blockers');
    expect(alert?.text).toBe('Una dependencia externa sigue sin resolver');
    expect(alert?.tone).toBe('neutral');
  });

  /**
   * The mock asked for "dependencias externas sin fecha confirmada". Blockers
   * carry no date, so nothing here may claim one.
   */
  it('never claims a blocker has a committed date', () => {
    const rm = roadmap('a', [
      phase([
        item({
          endDate: '2026-09-30',
          blockers: [{ id: 'b1', blockerId: 'x', feature: 'algo', resolved: false }],
        }),
      ]),
    ]);
    for (const alert of roadmapAlerts([rm], TODAY)) {
      expect(alert.text).not.toMatch(/fecha confirmada/);
    }
  });

  it('says nothing when there is nothing to say', () => {
    const rm = roadmap('a', [phase([item({ endDate: '2026-09-30' })])]);
    expect(roadmapAlerts([rm], TODAY)).toEqual([]);
    expect(roadmapAlerts([], TODAY)).toEqual([]);
  });

  it('orders alerts loudest first', () => {
    const rm = roadmap('a', [
      phase([
        slipped(4),
        item({ endDate: '2026-08-01' }),
        item({
          endDate: '2026-09-30',
          blockers: [{ id: 'b1', blockerId: 'x', feature: 'algo', resolved: false }],
        }),
      ]),
    ]);
    expect(roadmapAlerts([rm], TODAY).map((a) => a.tone)).toEqual(['danger', 'warn', 'neutral']);
  });
});

describe('the whole summary', () => {
  it('titles the list with the label Roadmaps chose', () => {
    const summary = roadmapsSummary([], [], TODAY, palette);
    expect(summary.list.label).toBe('ABIERTOS RECIENTEMENTE');
    expect(summary.list.emptyLabel).not.toBe('');
    expect(summary.stats).toHaveLength(3);
  });
});
