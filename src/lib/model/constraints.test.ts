import { describe, it, expect } from 'vitest';
import { getMinStart, wouldCreateCycle, enforceConstraints } from './constraints';
import type { Item, Phase, Roadmap } from './types';

function item(
  id: string,
  start: string,
  end: string,
  deps: string[] = [],
  milestone = false,
): Item {
  return {
    id,
    label: id,
    colorSlot: 0,
    startDate: start,
    endDate: milestone ? start : end,
    assigneeId: null,
    notes: '',
    dependsOn: deps,
    blockers: [],
    isMilestone: milestone,
    completedDate: null,
    endAtCompletion: null,
    baselineEnd: null,
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

function roadmap(p: Phase): Roadmap {
  return {
    id: 'r',
    name: 'r',
    colorSlot: 0,
    startDate: '2026-01-01',
    windowDays: 730,
    rows: [p],
    baselineDate: null,
  };
}

/*
 * Estos valores cambiaron con `un-dependiente-empieza-despues`, y conviene saber
 * por qué antes de "arreglar" ninguno: no decían algo falso cuando se
 * escribieron, decían lo que la aplicación hacía mientras el fin de una barra
 * era exclusivo. Al pasar a inclusivo, «el fin del predecesor» dejó de
 * significar «justo después» y pasó a significar un día de solape, y estos
 * tests siguieron en verde afirmándolo.
 *
 * Si algún día vuelve a moverse la convención de fechas, este bloque es el que
 * tiene que cambiar de valor. Que la vez anterior no lo hiciera es lo que dejó
 * el defecto vivo un change entero.
 */
describe('getMinStart', () => {
  it('is the day after the latest predecessor end', () => {
    const a = item('a', '2026-01-05', '2026-01-20');
    const b = item('b', '2026-01-06', '2026-01-30');
    const c = item('c', '2026-02-01', '2026-02-10', ['a', 'b']);
    const p = phase([a, b, c]);
    // `b` ocupa hasta el 30 incluido, así que lo más pronto es el 31. Sin
    // ajustar a día laborable: de eso se encarga `enforceConstraints`.
    expect(getMinStart(p, c)).toBe('2026-01-31');
  });

  it('is the day after a milestone predecessor’s date', () => {
    const m = item('m', '2026-01-15', '2026-01-15', [], true);
    const c = item('c', '2026-02-01', '2026-02-10', ['m']);
    // Un hito ocupa su día igual que una barra ocupa el suyo, así que su
    // dependiente arranca al siguiente. Sin excepción por ser hito.
    expect(getMinStart(phase([m, c]), c)).toBe('2026-01-16');
  });

  it('has no minimum without predecessors', () => {
    const a = item('a', '2026-01-05', '2026-01-20');
    expect(getMinStart(phase([a]), a)).toBe(null);
  });
});

describe('wouldCreateCycle', () => {
  it('detects direct and transitive cycles', () => {
    const a = item('a', '2026-01-05', '2026-01-10');
    const b = item('b', '2026-01-11', '2026-01-20', ['a']);
    const p = phase([a, b]);
    // a depends on b would close a<->b cycle (b already depends on a)
    expect(wouldCreateCycle(p, a, b)).toBe(true);
    // self-dependency
    expect(wouldCreateCycle(p, a, a)).toBe(true);
  });

  it('allows a valid new dependency', () => {
    const a = item('a', '2026-01-05', '2026-01-10');
    const b = item('b', '2026-01-11', '2026-01-20');
    expect(wouldCreateCycle(phase([a, b]), b, a)).toBe(false);
  });
});

describe('enforceConstraints', () => {
  it('pushes a dependent that starts too early to after its predecessor (snapped forward)', () => {
    const a = item('a', '2026-01-05', '2026-01-23'); // ends Fri 23 Jan
    const b = item('b', '2026-01-10', '2026-01-20', ['a']); // starts before a ends
    const rm = roadmap(phase([a, b]));
    const changed = enforceConstraints(rm);
    expect(changed).toBe(true);
    // El 23 es viernes y es día ocupado, así que el mínimo es el sábado 24 y
    // `snapForward` lo lleva al lunes 26. Es el caso que comprueba que el salto
    // de fin de semana sigue viniendo de aquí y no se ha duplicado dentro de
    // `getMinStart`.
    expect(b.startDate).toBe('2026-01-26');
    // Duration (10 days) is preserved.
    expect(b.endDate).toBe('2026-02-05');
  });

  it('pushes a dependent that starts exactly on its predecessor’s last day', () => {
    // El caso que este change existe para arreglar: no arrancaba «antes» de su
    // predecesor, arrancaba encima de su último día de trabajo.
    const a = item('a', '2026-01-05', '2026-01-26'); // lunes 26
    const b = item('b', '2026-01-26', '2026-02-04', ['a']);
    const rm = roadmap(phase([a, b]));
    expect(enforceConstraints(rm)).toBe(true);
    expect(b.startDate).toBe('2026-01-27');
    // Se desplaza, no se alarga: los 9 días de diferencia se conservan.
    expect(b.endDate).toBe('2026-02-05');
    // Y el predecesor no se mueve.
    expect(a.startDate).toBe('2026-01-05');
    expect(a.endDate).toBe('2026-01-26');
  });

  it('leaves a satisfied dependency untouched', () => {
    const a = item('a', '2026-01-05', '2026-01-20');
    const b = item('b', '2026-02-01', '2026-02-10', ['a']);
    const rm = roadmap(phase([a, b]));
    expect(enforceConstraints(rm)).toBe(false);
    expect(b.startDate).toBe('2026-02-01');
  });

  it('pushes a milestone dependent to the day after its predecessor', () => {
    const a = item('a', '2026-01-05', '2026-01-26'); // Mon 26 Jan
    const m = item('m', '2026-01-10', '2026-01-10', ['a'], true);
    const rm = roadmap(phase([a, m]));
    enforceConstraints(rm);
    // Martes 27, no el lunes 26: el hito no puede caer sobre el último día de
    // trabajo de aquello de lo que depende.
    expect(m.startDate).toBe('2026-01-27');
    expect(m.endDate).toBe('2026-01-27');
  });
});

describe('enforceConstraints with completed items', () => {
  it('does not drag a completed dependent forward', () => {
    const a = item('a', '2026-01-05', '2026-03-02'); // predecessor pushed out
    const b = item('b', '2026-01-12', '2026-01-30', ['a']);
    b.completedDate = '2026-01-30';
    b.endAtCompletion = '2026-01-30';
    const rm = roadmap(phase([a, b]));
    expect(enforceConstraints(rm)).toBe(false);
    expect(b.startDate).toBe('2026-01-12');
    expect(b.endDate).toBe('2026-01-30');
  });

  it('does not collapse a completed milestone onto its predecessor', () => {
    const a = item('a', '2026-01-05', '2026-03-02');
    const m = item('m', '2026-01-12', '2026-01-12', ['a'], true);
    m.completedDate = '2026-01-12';
    const rm = roadmap(phase([a, m]));
    expect(enforceConstraints(rm)).toBe(false);
    expect(m.startDate).toBe('2026-01-12');
  });

  it('still drags an open dependent behind a completed predecessor', () => {
    // Freezing a completed item stops it from moving; it does not stop its end
    // from constraining whoever follows.
    const a = item('a', '2026-01-05', '2026-01-26'); // Mon 26 Jan
    a.completedDate = '2026-01-26';
    const b = item('b', '2026-01-12', '2026-01-20', ['a']);
    const rm = roadmap(phase([a, b]));
    expect(enforceConstraints(rm)).toBe(true);
    expect(a.startDate).toBe('2026-01-05');
    expect(b.startDate).toBe('2026-01-27');
  });

  it('getMinStart counts a completed predecessor', () => {
    const a = item('a', '2026-01-05', '2026-01-26');
    a.completedDate = '2026-01-26';
    const b = item('b', '2026-01-12', '2026-01-20', ['a']);
    expect(getMinStart(phase([a, b]), b)).toBe('2026-01-27');
  });
});
