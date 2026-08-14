import { describe, it, expect } from 'vitest';
import {
  isCompleted,
  pendingPredecessors,
  canComplete,
  completedDependents,
  slipVsBaseline,
  slipVsForecast,
  phaseProgress,
} from './completion';
import type { Item, Phase } from './types';

function item(
  id: string,
  opts: {
    deps?: string[];
    completedDate?: string | null;
    endAtCompletion?: string | null;
    baselineEnd?: string | null;
    milestone?: boolean;
  } = {},
): Item {
  return {
    id,
    label: id,
    colorSlot: 0,
    startDate: '2026-01-05',
    endDate: opts.milestone ? '2026-01-05' : '2026-01-30',
    assigneeId: null,
    notes: '',
    dependsOn: opts.deps ?? [],
    blockers: [],
    isMilestone: opts.milestone ?? false,
    completedDate: opts.completedDate ?? null,
    endAtCompletion: opts.endAtCompletion ?? null,
    baselineEnd: opts.baselineEnd ?? null,
  };
}

function phase(children: Item[]): Phase {
  return {
    id: 'p',
    name: 'p',
    colorSlot: 0,
    expanded: true,
    assigneeId: null,
    notes: '',
    startDate: null,
    endDate: null,
    children,
  };
}

describe('isCompleted', () => {
  it('lee el estado de completitud solo de la fecha', () => {
    expect(isCompleted(item('a'))).toBe(false);
    expect(isCompleted(item('a', { completedDate: '2026-02-01' }))).toBe(true);
  });
});

describe('canComplete', () => {
  it('permite completar un item sin dependencias', () => {
    const a = item('a');
    expect(canComplete(phase([a]), a)).toBe(true);
  });

  it('impide completar un item con un predecesor pendiente', () => {
    const a = item('a');
    const b = item('b', { deps: ['a'] });
    const p = phase([a, b]);
    expect(canComplete(p, b)).toBe(false);
    expect(pendingPredecessors(p, b).map((i) => i.id)).toEqual(['a']);
  });

  it('permite completar cuando todos los predecesores están completados', () => {
    const a = item('a', { completedDate: '2026-02-01' });
    const b = item('b', { deps: ['a'] });
    expect(canComplete(phase([a, b]), b)).toBe(true);
  });

  it('informa solo de los predecesores que siguen pendientes', () => {
    const a = item('a', { completedDate: '2026-02-01' });
    const b = item('b');
    const c = item('c', { deps: ['a', 'b'] });
    expect(pendingPredecessors(phase([a, b, c]), c).map((i) => i.id)).toEqual(['b']);
  });

  it('ignora los ids de dependencia que ya no resuelven', () => {
    const b = item('b', { deps: ['gone'] });
    expect(canComplete(phase([b]), b)).toBe(true);
  });

  it('se aplica igual a los hitos', () => {
    const a = item('a');
    const m = item('m', { deps: ['a'], milestone: true });
    expect(canComplete(phase([a, m]), m)).toBe(false);
  });
});

describe('completedDependents', () => {
  it('es vacío para un item del que no depende nada', () => {
    const a = item('a', { completedDate: '2026-02-01' });
    expect(completedDependents(phase([a]), a)).toEqual([]);
  });

  it('alcanza toda una cadena de tres', () => {
    const a = item('a', { completedDate: '2026-02-01' });
    const b = item('b', { deps: ['a'], completedDate: '2026-02-05' });
    const c = item('c', { deps: ['b'], completedDate: '2026-02-09' });
    const ids = completedDependents(phase([a, b, c]), a)
      .map((i) => i.id)
      .sort();
    expect(ids).toEqual(['b', 'c']);
  });

  it('recoge solo los completados', () => {
    const a = item('a', { completedDate: '2026-02-01' });
    const b = item('b', { deps: ['a'] });
    expect(completedDependents(phase([a, b]), a)).toEqual([]);
  });

  it('atraviesa un item pendiente para alcanzar uno completado más abajo', () => {
    // Rule B forbids this state, so it can only arrive from a hand-edited
    // document. The count still has to be honest about what it would clear.
    const a = item('a', { completedDate: '2026-02-01' });
    const b = item('b', { deps: ['a'] });
    const c = item('c', { deps: ['b'], completedDate: '2026-02-09' });
    expect(completedDependents(phase([a, b, c]), a).map((i) => i.id)).toEqual(['c']);
  });

  it('no se cicla en un rombo de dependencias', () => {
    const a = item('a', { completedDate: '2026-02-01' });
    const b = item('b', { deps: ['a'], completedDate: '2026-02-02' });
    const c = item('c', { deps: ['a'], completedDate: '2026-02-03' });
    const d = item('d', { deps: ['b', 'c'], completedDate: '2026-02-04' });
    const ids = completedDependents(phase([a, b, c, d]), a)
      .map((i) => i.id)
      .sort();
    expect(ids).toEqual(['b', 'c', 'd']);
  });
});

describe('desviaciones', () => {
  it('es positiva cuando el trabajo cerró después de la línea base', () => {
    const a = item('a', { completedDate: '2026-02-15', baselineEnd: '2026-01-31' });
    expect(slipVsBaseline(a)).toBe(15);
  });

  it('es negativa cuando el trabajo cerró antes de tiempo', () => {
    const a = item('a', { completedDate: '2026-01-25', baselineEnd: '2026-01-31' });
    expect(slipVsBaseline(a)).toBe(-6);
  });

  it('es null, no cero, para un item sin línea base', () => {
    const a = item('a', { completedDate: '2026-02-15', endAtCompletion: '2026-02-15' });
    expect(slipVsBaseline(a)).toBeNull();
    expect(slipVsForecast(a)).toBe(0);
  });

  it('es null para un item sin completar', () => {
    const a = item('a', { baselineEnd: '2026-01-31' });
    expect(slipVsBaseline(a)).toBeNull();
    expect(slipVsForecast(a)).toBeNull();
  });

  it('separa un plan movido de un plan incumplido', () => {
    // Plan committed at 31 Jan, dragged to 15 Feb, then closed on the day.
    const a = item('a', {
      completedDate: '2026-02-15',
      endAtCompletion: '2026-02-15',
      baselineEnd: '2026-01-31',
    });
    expect(slipVsBaseline(a)).toBe(15);
    expect(slipVsForecast(a)).toBe(0);
    // The gap between the two is the replanning itself.
    expect(slipVsBaseline(a)! - slipVsForecast(a)!).toBe(15);
  });
});

describe('phaseProgress', () => {
  it('es null para una fase sin items', () => {
    expect(phaseProgress(phase([]))).toBeNull();
  });

  it('es cero cuando no hay nada completado', () => {
    expect(phaseProgress(phase([item('a'), item('b')]))).toBe(0);
  });

  it('es la mitad cuando la mitad está completada', () => {
    const p = phase([
      item('a', { completedDate: '2026-02-01' }),
      item('b', { completedDate: '2026-02-01' }),
      item('c'),
      item('d'),
    ]);
    expect(phaseProgress(p)).toBe(50);
  });

  it('es cien cuando todo está completado', () => {
    const p = phase([
      item('a', { completedDate: '2026-02-01' }),
      item('b', { completedDate: '2026-02-01' }),
    ]);
    expect(phaseProgress(p)).toBe(100);
  });

  it('cuenta el hito como un item más y no pondera por duración', () => {
    // A 25-day item done, a zero-day milestone pending: weighting by duration
    // would read 100%, which is exactly the reading that hides the delivery.
    const p = phase([item('a', { completedDate: '2026-02-01' }), item('m', { milestone: true })]);
    expect(phaseProgress(p)).toBe(50);
  });
});
