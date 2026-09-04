import { describe, it, expect, beforeEach } from 'vitest';
import { ui } from './ui.svelte';

describe('el foco de sprint', () => {
  beforeEach(() => {
    ui.clearSprint();
    ui.closeDrawer();
  });

  it('elegir un sprint lo pone en foco', () => {
    ui.selectSprint(12);
    expect(ui.selectedSprint).toBe(12);
  });

  it('volver a elegir el mismo lo suelta', () => {
    ui.selectSprint(12);
    ui.selectSprint(12);
    expect(ui.selectedSprint).toBeNull();
  });

  it('elegir otro traslada el foco sin pasar por ningún estado intermedio', () => {
    ui.selectSprint(12);
    ui.selectSprint(13);
    expect(ui.selectedSprint).toBe(13);
  });

  it('sobrevive a abrir y cerrar el detalle de un item, que es cuando hace falta', () => {
    // La razón de estar fuera de `DrawerState`: ves que alguien va al 120%,
    // abres su item, y el foco tiene que seguir ahí cuando vuelvas (D7).
    ui.selectSprint(12);
    ui.openDetail('p1', 'i1');
    expect(ui.selectedSprint).toBe(12);
    ui.closeDrawer();
    expect(ui.selectedSprint).toBe(12);
  });

  it('el drawer tampoco se entera de que hay un sprint elegido', () => {
    ui.openDetail('p1', 'i1');
    ui.selectSprint(12);
    expect(ui.drawer).toEqual({ kind: 'detail', phaseId: 'p1', itemId: 'i1' });
  });
});

describe('el foco se suelta cuando el sprint no cabe en la ventana', () => {
  beforeEach(() => ui.clearSprint());

  // S09 empieza en el ancla, 2026-06-29. S12 empieza 42 días después.
  it('se queda si el sprint elegido se ve', () => {
    ui.selectSprint(12);
    ui.dropSprintOutOfWindow('2026-06-29', 120);
    expect(ui.selectedSprint).toBe(12);
  });

  it('se suelta al abrir un roadmap cuya ventana no lo contiene', () => {
    ui.selectSprint(12);
    ui.dropSprintOutOfWindow('2027-01-01', 90);
    expect(ui.selectedSprint).toBeNull();
  });

  it('se suelta también cuando el sprint queda por detrás de la ventana', () => {
    ui.selectSprint(1);
    ui.dropSprintOutOfWindow('2026-06-29', 120);
    expect(ui.selectedSprint).toBeNull();
  });

  it('sin foco no hace nada', () => {
    ui.dropSprintOutOfWindow('2027-01-01', 90);
    expect(ui.selectedSprint).toBeNull();
  });
});
