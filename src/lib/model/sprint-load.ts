/**
 * La carga de un sprint: quién ocupa cuántos días de calendario, y con qué.
 *
 * Puro y sin reactividad, al estilo de `derive.ts` y `completion.ts`, para que
 * se pruebe sin navegador.
 *
 * Tres ideas sostienen este fichero:
 *
 *  - **Se mide el sprint verdadero, no el que la ventana deja ver** (D5). El
 *    rango sale de `sprintRange(num)`, así que el mismo S12 declara la misma
 *    capacidad en un roadmap que empieza en enero y en otro que empieza en
 *    julio. Recortar contra `windowDays` sirve para pintar; para contar, no.
 *  - **Un solo cálculo alimenta el panel y el apagado de filas** (D11). Quién
 *    participa se devuelve aquí mismo, en `memberPhaseIds` y `memberItemIds`,
 *    porque calcularlo otra vez sería admitir dos respuestas posibles a
 *    «¿participa esta fila?», y una fila apagada junto a su item listado en el
 *    panel es un fallo que nadie sabría explicar.
 *  - **La herencia responsable de fase → item vive aquí y solo aquí.** El
 *    modelo tiene `assigneeId` en `Phase` y en `Item` desde siempre, pero
 *    ninguna otra parte del sistema deja que el de la fase alcance a un item: la
 *    rejilla pinta el badge del item y solo el del item. Por eso el reparto
 *    marca con `inherited` de dónde viene cada atribución, para que la
 *    diferencia con la rejilla quede dicha y no descubierta.
 *
 * Lo que se mide es **ocupación de calendario**, no esfuerzo (D12): cuánto
 * cuesta de verdad un item es algo que la aplicación no sabe. Lo que sí detecta
 * es el solape —tres items simultáneos de dos semanas son treinta días en un
 * sprint de diez— que es justo lo que hoy no se ve.
 */

import { sprintRange } from '../time/segments';
import { dayIndex, workdaysBetween } from '../time/timeline';
import { isCompleted } from './completion';
import type { Assignee, IsoDate, Item, Roadmap } from './types';

/** Un item del sprint, con lo que aporta y de dónde le viene el responsable. */
export interface SprintItemLoad {
  itemId: string;
  label: string;
  phaseId: string;
  isMilestone: boolean;
  completed: boolean;
  /** Días laborables que este item aporta al sprint. Un hito aporta cero. */
  days: number;
  /** Responsable efectivo: el suyo, o el de su fase si no tiene uno propio. */
  assigneeId: string | null;
  /** True cuando ese responsable viene de la fase y no del item. */
  inherited: boolean;
  /** True cuando el item cae entero fuera de la ventana temporal del roadmap. */
  offWindow: boolean;
}

/** Los items del sprint de una fase, en el orden en que están en ella. */
export interface SprintPhaseLoad {
  phaseId: string;
  name: string;
  colorSlot: number;
  items: SprintItemLoad[];
}

/** Lo que carga una persona en el sprint. `assigneeId: null` es el trabajo sin responsable. */
export interface SprintAssigneeLoad {
  assigneeId: string | null;
  name: string;
  /** Slot de la paleta del responsable, o `null` para el trabajo sin responsable. */
  colorSlot: number | null;
  days: number;
  /** True cuando sus días pasan de la capacidad del sprint. */
  over: boolean;
  /** True cuando alguno de sus items le llega heredado de la fase. */
  anyInherited: boolean;
  itemCount: number;
}

export interface SprintLoad {
  num: number;
  start: IsoDate;
  /** Inclusivo. */
  end: IsoDate;
  /** Días laborables del sprint completo: la vara contra la que se compara. */
  capacity: number;
  /** De más días a menos, y el trabajo sin responsable siempre al final. */
  byAssignee: SprintAssigneeLoad[];
  /** Solo las fases que aportan algún item al sprint, en orden de roadmap. */
  phases: SprintPhaseLoad[];
  /** Pertenencia, para apagar las filas que no participan sin recalcular nada. */
  memberPhaseIds: Set<string>;
  memberItemIds: Set<string>;
  itemCount: number;
  completedCount: number;
}

/** El nombre con el que se rotula el trabajo que no tiene responsable. */
export const UNASSIGNED_NAME = 'Sin responsable';

/**
 * Días laborables que un item aporta a `[sprintStart, sprintEnd]`.
 *
 * Solo la parte que cae dentro: contar el item entero diría que un desarrollo de
 * ocho semanas ocupa ocho semanas de un sprint de dos. Un hito aporta cero por
 * ser un hito, no por sus fechas —ocupa un día de calendario y ningún día de
 * trabajo—, y un item cuyo solape cae entero en fin de semana aporta cero sin
 * dejar de estar en el sprint.
 */
function overlapDays(item: Item, sprintStart: IsoDate, sprintEnd: IsoDate): number {
  if (item.isMilestone) return 0;
  const from = item.startDate > sprintStart ? item.startDate : sprintStart;
  const to = item.endDate < sprintEnd ? item.endDate : sprintEnd;
  return workdaysBetween(from, to);
}

/** Whether an item's dates touch the sprint at all, weekends included. */
function touchesSprint(item: Item, sprintStart: IsoDate, sprintEnd: IsoDate): boolean {
  return item.startDate <= sprintEnd && item.endDate >= sprintStart;
}

/** Whether an item falls entirely outside the roadmap's visible window. */
function isOffWindow(item: Item, rm: Roadmap): boolean {
  return (
    dayIndex(rm.startDate, item.endDate) < 0 ||
    dayIndex(rm.startDate, item.startDate) >= rm.windowDays
  );
}

/**
 * La carga del sprint `num` en un roadmap.
 *
 * Solo cuentan los items. Una fase con fechas propias y sin items no aporta
 * carga en ningún sprint —una fase sin items no es trabajo, es un título— y su
 * responsable sigue sirviendo de responsable heredado de los items que sí tenga.
 */
export function sprintLoad(rm: Roadmap, assignees: Assignee[], num: number): SprintLoad {
  const { start, end } = sprintRange(num);
  const capacity = workdaysBetween(start, end);

  const phases: SprintPhaseLoad[] = [];
  const memberPhaseIds = new Set<string>();
  const memberItemIds = new Set<string>();
  let itemCount = 0;
  let completedCount = 0;

  // Acumulador por responsable efectivo. `null` es el trabajo sin responsable, y
  // se acumula igual que los demás para no tener dos caminos que puedan
  // discrepar; lo único distinto es dónde acaba en el orden.
  const tally = new Map<string | null, { days: number; items: number; inherited: boolean }>();

  for (const phase of rm.rows) {
    const items: SprintItemLoad[] = [];
    for (const item of phase.children) {
      if (!touchesSprint(item, start, end)) continue;

      const own = resolveAssignee(assignees, item.assigneeId);
      const fromPhase = resolveAssignee(assignees, phase.assigneeId);
      const assigneeId = own ?? fromPhase;
      const inherited = own === null && fromPhase !== null;
      const days = overlapDays(item, start, end);

      items.push({
        itemId: item.id,
        label: item.label,
        phaseId: phase.id,
        isMilestone: item.isMilestone,
        completed: isCompleted(item),
        days,
        assigneeId,
        inherited,
        offWindow: isOffWindow(item, rm),
      });

      memberItemIds.add(item.id);
      itemCount++;
      if (isCompleted(item)) completedCount++;

      const entry = tally.get(assigneeId) ?? { days: 0, items: 0, inherited: false };
      entry.days += days;
      entry.items++;
      entry.inherited ||= inherited;
      tally.set(assigneeId, entry);
    }
    if (items.length > 0) {
      memberPhaseIds.add(phase.id);
      phases.push({ phaseId: phase.id, name: phase.name, colorSlot: phase.colorSlot, items });
    }
  }

  return {
    num,
    start,
    end,
    capacity,
    byAssignee: rankAssignees(tally, assignees, capacity),
    phases,
    memberPhaseIds,
    memberItemIds,
    itemCount,
    completedCount,
  };
}

/**
 * El id de un responsable que existe de verdad, o `null`.
 *
 * Un id que no resuelve —un documento importado a medias, un responsable
 * borrado— se trata como trabajo sin responsable. Es la lectura honesta: no
 * sabemos quién lo hace.
 */
function resolveAssignee(assignees: Assignee[], id: string | null): string | null {
  return id !== null && assignees.some((a) => a.id === id) ? id : null;
}

/**
 * El reparto ordenado: de más cargado a menos, porque el que se pasa es lo que
 * se ha venido a ver. El trabajo sin responsable va siempre al final, sea cuanto
 * sea: no compite con las personas, se declara aparte.
 */
function rankAssignees(
  tally: Map<string | null, { days: number; items: number; inherited: boolean }>,
  assignees: Assignee[],
  capacity: number,
): SprintAssigneeLoad[] {
  const rows: SprintAssigneeLoad[] = [];
  for (const [assigneeId, entry] of tally) {
    const person = assignees.find((a) => a.id === assigneeId) ?? null;
    rows.push({
      assigneeId,
      name: person?.name ?? UNASSIGNED_NAME,
      colorSlot: person?.colorSlot ?? null,
      days: entry.days,
      over: entry.days > capacity,
      anyInherited: entry.inherited,
      itemCount: entry.items,
    });
  }
  // El nombre desempata para que dos personas con los mismos días no bailen
  // entre renders; el orden de un panel no puede depender del de un `Map`.
  rows.sort((a, b) => {
    if (a.assigneeId === null) return 1;
    if (b.assigneeId === null) return -1;
    return b.days - a.days || a.name.localeCompare(b.name, 'es');
  });
  return rows;
}
