import { describe, it, expect } from 'vitest';
import {
  countBlockedChildren,
  countBlockerUsage,
  countUnresolvedEquivalents,
  equivalenceKey,
  featureSuggestions,
  isItemBlocked,
  isPhaseBlocked,
  pendingBlockers,
} from './blockers';
import type { AppData, Item, ItemBlocker, Phase, Roadmap } from './types';

let n = 0;
const nextId = () => `x${++n}`;

function assignment(blockerId: string, feature: string, resolved = false): ItemBlocker {
  return { id: nextId(), blockerId, feature, resolved };
}

function item(label: string, blockers: ItemBlocker[] = []): Item {
  return {
    id: `it-${label}`,
    label,
    colorSlot: 0,
    startDate: '2026-01-05',
    endDate: '2026-01-23',
    assigneeId: null,
    notes: '',
    dependsOn: [],
    blockers,
    isMilestone: false,
    completedDate: null,
    endAtCompletion: null,
    baselineEnd: null,
  };
}

function phase(name: string, children: Item[]): Phase {
  return {
    id: `ph-${name}`,
    name,
    colorSlot: 0,
    expanded: true,
    assigneeId: null,
    notes: '',
    startDate: null,
    endDate: null,
    children,
  };
}

function roadmap(id: string, rows: Phase[]): Roadmap {
  return {
    id,
    name: id,
    colorSlot: 0,
    startDate: '2026-01-01',
    windowDays: 730,
    rows,
    baselineDate: null,
  };
}

function app(roadmaps: Roadmap[]): AppData {
  return {
    roadmaps,
    assignees: [],
    blockers: [{ id: 'bl-checkout', name: 'Checkout', owner: 'Enrique', email: 'a@a.com' }],
    activeId: roadmaps[0]?.id ?? null,
  };
}

describe('clave de equivalencia', () => {
  it('ignora mayúsculas y espacios de los extremos', () => {
    expect(equivalenceKey('bl-1', '  Formulario de Compra ')).toBe(
      equivalenceKey('bl-1', 'formulario de compra'),
    );
  });

  it('distingue funcionalidades distintas del mismo bloqueo', () => {
    expect(equivalenceKey('bl-1', 'formulario')).not.toBe(equivalenceKey('bl-1', 'pasarela 3DS'));
  });

  it('distingue bloqueos distintos con la misma funcionalidad', () => {
    expect(equivalenceKey('bl-1', 'formulario')).not.toBe(equivalenceKey('bl-2', 'formulario'));
  });

  it('no colapsa espacios interiores, que sí distinguen texto', () => {
    expect(equivalenceKey('bl-1', 'form ulario')).not.toBe(equivalenceKey('bl-1', 'formulario'));
  });
});

describe('estado bloqueado', () => {
  it('un item sin asignaciones no está bloqueado', () => {
    expect(isItemBlocked(item('libre'))).toBe(false);
  });

  it('un item con una asignación pendiente está bloqueado', () => {
    expect(isItemBlocked(item('a', [assignment('bl-checkout', 'formulario')]))).toBe(true);
  });

  it('un item con todas las asignaciones resueltas no está bloqueado', () => {
    const it0 = item('a', [
      assignment('bl-checkout', 'formulario', true),
      assignment('bl-checkout', 'pasarela', true),
    ]);
    expect(isItemBlocked(it0)).toBe(false);
    // Resolver no borra: el registro sigue ahí (D4).
    expect(it0.blockers).toHaveLength(2);
  });

  it('basta una pendiente entre varias resueltas', () => {
    const it0 = item('a', [
      assignment('bl-checkout', 'formulario', true),
      assignment('bl-checkout', 'pasarela', false),
    ]);
    expect(isItemBlocked(it0)).toBe(true);
    expect(pendingBlockers(it0)).toHaveLength(1);
  });
});

describe('la fase hereda el estado de sus items', () => {
  it('una fase con un item bloqueado está bloqueada', () => {
    const ph = phase('f', [item('a'), item('b', [assignment('bl-checkout', 'formulario')])]);
    expect(isPhaseBlocked(ph)).toBe(true);
    expect(countBlockedChildren(ph)).toBe(1);
  });

  it('una fase cuyos items están todos resueltos no está bloqueada', () => {
    const ph = phase('f', [item('a', [assignment('bl-checkout', 'formulario', true)])]);
    expect(isPhaseBlocked(ph)).toBe(false);
    expect(countBlockedChildren(ph)).toBe(0);
  });

  it('una fase sin items no está bloqueada', () => {
    expect(isPhaseBlocked(phase('vacía', []))).toBe(false);
  });
});

describe('equivalentes repartidas entre roadmaps', () => {
  const build = () =>
    app([
      roadmap('rm-1', [
        phase('f1', [
          item('tarjeta', [assignment('bl-checkout', 'Creación de formulario de compra')]),
          item('paypal', [assignment('bl-checkout', 'creación de FORMULARIO de compra  ')]),
        ]),
      ]),
      roadmap('rm-2', [
        phase('f2', [
          item('confirmación', [assignment('bl-checkout', 'Pasarela 3DS')]),
          item('otro', [assignment('bl-checkout', 'Creación de formulario de compra', true)]),
        ]),
      ]),
    ]);

  it('cuenta las pendientes equivalentes de otros roadmaps', () => {
    const data = build();
    const target = data.roadmaps[0].rows[0].children[0].blockers[0];
    expect(countUnresolvedEquivalents(data, target.blockerId, target.feature, target.id)).toBe(1);
  });

  it('no cuenta las equivalentes ya resueltas', () => {
    const data = build();
    // "otro" declara la misma funcionalidad pero está resuelta, así que queda fuera
    // del recuento; solo "paypal" sigue pendiente.
    const target = data.roadmaps[0].rows[0].children[0].blockers[0];
    const n = countUnresolvedEquivalents(data, target.blockerId, target.feature, target.id);
    expect(n).toBe(1);
  });

  it('no cuenta funcionalidades distintas del mismo bloqueo', () => {
    const data = build();
    const pasarela = data.roadmaps[1].rows[0].children[0].blockers[0];
    expect(
      countUnresolvedEquivalents(data, pasarela.blockerId, pasarela.feature, pasarela.id),
    ).toBe(0);
  });

  it('se excluye a sí misma del recuento', () => {
    const data = app([
      roadmap('rm-1', [phase('f', [item('solo', [assignment('bl-checkout', 'formulario')])])]),
    ]);
    const only = data.roadmaps[0].rows[0].children[0].blockers[0];
    expect(countUnresolvedEquivalents(data, only.blockerId, only.feature, only.id)).toBe(0);
  });
});

describe('sugerencias de funcionalidad', () => {
  it('reúne las de todos los roadmaps sin repetir y con el texto original', () => {
    const data = app([
      roadmap('rm-1', [
        phase('f1', [
          item('a', [assignment('bl-checkout', 'Creación de formulario de compra')]),
          item('b', [assignment('bl-checkout', 'creación de formulario de compra')]),
        ]),
      ]),
      roadmap('rm-2', [phase('f2', [item('c', [assignment('bl-checkout', 'Pasarela 3DS')])])]),
    ]);
    expect(featureSuggestions(data, 'bl-checkout')).toEqual([
      'Creación de formulario de compra',
      'Pasarela 3DS',
    ]);
  });

  it('ignora las de otros bloqueos', () => {
    const data = app([roadmap('rm-1', [phase('f', [item('a', [assignment('bl-otro', 'algo')])])])]);
    expect(featureSuggestions(data, 'bl-checkout')).toEqual([]);
  });

  it('descarta funcionalidades vacías', () => {
    const data = app([
      roadmap('rm-1', [phase('f', [item('a', [assignment('bl-checkout', '   ')])])]),
    ]);
    expect(featureSuggestions(data, 'bl-checkout')).toEqual([]);
  });
});

describe('alcance de un borrado en cascada', () => {
  it('cuenta items, no asignaciones', () => {
    const data = app([
      roadmap('rm-1', [
        phase('f', [
          item('a', [
            assignment('bl-checkout', 'formulario'),
            assignment('bl-checkout', 'pasarela'),
          ]),
          item('b', [assignment('bl-checkout', 'otra', true)]),
          item('c'),
        ]),
      ]),
    ]);
    expect(countBlockerUsage(data, 'bl-checkout')).toBe(2);
  });

  it('cuenta también las resueltas, que también se pierden al borrar', () => {
    const data = app([
      roadmap('rm-1', [phase('f', [item('a', [assignment('bl-checkout', 'x', true)])])]),
    ]);
    expect(countBlockerUsage(data, 'bl-checkout')).toBe(1);
  });

  it('un bloqueo sin uso cuenta cero', () => {
    const data = app([roadmap('rm-1', [phase('f', [item('a')])])]);
    expect(countBlockerUsage(data, 'bl-checkout')).toBe(0);
  });
});
