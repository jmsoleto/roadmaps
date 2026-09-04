import { describe, it, expect } from 'vitest';
import {
  getSprintSegments,
  getQuarterSegments,
  sprintRange,
  sprintIntersectsWindow,
} from './segments';
import { dayIndex, dayOfWeek, spanDays, workdaysBetween } from './timeline';
import { SPRINT_ANCHOR_DATE, SPRINT_ANCHOR_NUM } from '../config';

describe('getSprintSegments', () => {
  it('numbers Sprint 09 at its absolute anchor (2026-06-29) from a 2026-01-01 window', () => {
    const segs = getSprintSegments('2026-01-01', 730);
    const anchor = segs.find((s) => s.start === 179); // 2026-06-29 is day 179
    expect(anchor?.num).toBe(9);
  });

  it('covers the whole window with contiguous 14-day sprints', () => {
    const segs = getSprintSegments('2026-01-01', 730);
    expect(segs[0].start).toBe(0);
    expect(segs[segs.length - 1].end).toBe(730);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].start).toBe(segs[i - 1].end);
      expect(segs[i].num).toBe(segs[i - 1].num + 1);
    }
  });

  it('keeps absolute numbering when the roadmap starts on a different date', () => {
    // Starting two weeks later shifts the anchor offset but not its number.
    const segs = getSprintSegments('2026-01-15', 730);
    const anchor = segs.find((s) => s.num === 9);
    expect(anchor).toBeDefined();
  });
});

describe('sprintRange — el sprint verdadero, sin ventana', () => {
  it('el ancla se devuelve a sí misma', () => {
    expect(sprintRange(SPRINT_ANCHOR_NUM).start).toBe(SPRINT_ANCHOR_DATE);
  });

  it('el anterior y el siguiente caen a catorce días', () => {
    expect(dayIndex(sprintRange(8).start, sprintRange(9).start)).toBe(14);
    expect(dayIndex(sprintRange(9).start, sprintRange(10).start)).toBe(14);
  });

  it('el fin es inclusivo: catorce días contando los dos extremos', () => {
    const s = sprintRange(12);
    expect(spanDays(s.start, s.end)).toBe(14);
  });

  it('todo sprint empieza en lunes', () => {
    for (let n = -20; n <= 60; n++) expect(dayOfWeek(sprintRange(n).start), `S${n}`).toBe(1);
  });

  it('todo sprint tiene diez días laborables, que es la capacidad', () => {
    for (let n = -20; n <= 60; n++) {
      const s = sprintRange(n);
      expect(workdaysBetween(s.start, s.end), `S${n}`).toBe(10);
    }
  });
});

describe('sprintRange y getSprintSegments hablan del mismo sprint', () => {
  // La etiqueta que se pincha y el rango que se cuenta no pueden referirse a
  // sprints distintos: uno sale del recorte contra la ventana y el otro del
  // número absoluto, y tienen que coincidir día a día.
  it.each(['2026-01-01', '2026-06-29', '2026-07-06', '2027-03-08'])(
    'coinciden en un roadmap que empieza el %s',
    (origin) => {
      const segs = getSprintSegments(origin, 400);
      for (const seg of segs) {
        const real = sprintRange(seg.num);
        // El segmento visible es el rango real recortado por la ventana.
        expect(seg.start, `S${seg.num}`).toBe(Math.max(dayIndex(origin, real.start), 0));
        expect(seg.end, `S${seg.num}`).toBe(Math.min(dayIndex(origin, real.end) + 1, 400));
      }
    },
  );
});

describe('sprintIntersectsWindow', () => {
  const origin = '2026-06-29'; // el propio ancla, S09

  it('un sprint dentro de la ventana interseca', () => {
    expect(sprintIntersectsWindow(9, origin, 120)).toBe(true);
    expect(sprintIntersectsWindow(12, origin, 120)).toBe(true);
  });

  it('un sprint anterior al primer día no interseca', () => {
    expect(sprintIntersectsWindow(8, origin, 120)).toBe(false);
  });

  it('un sprint posterior al último día no interseca', () => {
    expect(sprintIntersectsWindow(30, origin, 120)).toBe(false);
  });

  it('asomar por el borde ya es intersecar', () => {
    // Ventana de un solo día: solo el sprint que lo contiene.
    expect(sprintIntersectsWindow(9, origin, 1)).toBe(true);
    expect(sprintIntersectsWindow(10, origin, 1)).toBe(false);
  });
});

describe('getQuarterSegments', () => {
  it('produces quarters within the window in day-offset space', () => {
    const segs = getQuarterSegments('2026-01-01', 730);
    expect(segs.length).toBeGreaterThan(0);
    expect(segs[0].start).toBe(0);
    expect(segs.every((s) => s.q >= 1 && s.q <= 4)).toBe(true);
    // Q1 boundary (1 Mar 2026) is day 59.
    const q1 = segs.find((s) => s.q === 1 && s.year === 2026);
    expect(q1?.start).toBe(59);
  });
});
