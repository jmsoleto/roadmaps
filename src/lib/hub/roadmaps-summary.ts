/**
 * What Roadmaps reports to its card on the hub landing.
 *
 * Pure derivations over data that already exists — no new model fields, no
 * stored aggregates. Everything here recomputes from the roadmaps themselves
 * plus the recent-openings list, which is why the card can never drift out of
 * step with the plan it describes.
 *
 * `today` and the palette lookup are parameters rather than calls to
 * `todayIso()` and the theme store, so this file stays testable in isolation —
 * the same shape `getMetaWindow` uses.
 */

import { isCompleted, slipVsBaseline } from '../model/completion';
import { effectiveEnd } from '../model/derive';
import type { Item, Phase, Roadmap, IsoDate } from '../model/types';
import type { Alert, AppSummary, Row, Stat } from './types';
import { byToneDescending } from './types';
import type { RecentEntry } from './usage';

/** How many rows the card shows. */
export const LIST_ROWS = 3;

/** Days of slip a roadmap has to reach before it is worth an alert. */
const SLIP_ALERT_THRESHOLD = 1;

const allItems = (rm: Roadmap): Item[] => rm.rows.flatMap((p) => p.children);

/** A phase counts as active while it still has something unfinished in it. */
function isActivePhase(phase: Phase): boolean {
  return phase.children.length > 0 && phase.children.some((i) => !isCompleted(i));
}

/**
 * A roadmap's slip against its committed plan, in days, or `null` when there is
 * nothing to measure.
 *
 * The measure is the worst single slip in the roadmap, not the sum: slips of
 * items running in parallel are the same delay counted twice, and adding them
 * would make a roadmap look worse the more finely it was broken down.
 *
 * Only completed items with a baseline count. An item still open has not
 * finished slipping, and one added after the plan was fixed has no baseline to
 * slip against (D5 of the completion change).
 */
export function roadmapSlip(rm: Roadmap): number | null {
  let worst: number | null = null;
  for (const item of allItems(rm)) {
    const slip = slipVsBaseline(item);
    if (slip !== null && slip > 0 && (worst === null || slip > worst)) worst = slip;
  }
  return worst;
}

/** Items whose end date has passed with the work still open. */
function overdueItems(rm: Roadmap, today: IsoDate): Item[] {
  return allItems(rm).filter((i) => !isCompleted(i) && i.endDate < today);
}

/** External waits still owed to this roadmap. */
function unresolvedBlockers(rm: Roadmap): number {
  return allItems(rm).reduce((n, i) => n + i.blockers.filter((b) => !b.resolved).length, 0);
}

export function roadmapStats(roadmaps: Roadmap[]): [Stat, Stat, Stat] {
  const activePhases = roadmaps.reduce((n, rm) => n + rm.rows.filter(isActivePhase).length, 0);
  const slipping = roadmaps.filter((rm) => (roadmapSlip(rm) ?? 0) > 0).length;

  return [
    { value: roadmaps.length, label: 'roadmaps', tone: 'neutral' },
    { value: activePhases, label: 'fases activas', tone: 'neutral' },
    // Tone only when there is actually something wrong: a red zero would shout
    // about the absence of a problem.
    { value: slipping, label: 'con desviación', tone: slipping > 0 ? 'danger' : 'neutral' },
  ];
}

/**
 * The state a roadmap is in, phrased for the right-hand side of a list row.
 *
 * Ordered by what most deserves the space: a slip beats a plan, a plan beats
 * having no dates at all.
 */
function roadmapState(rm: Roadmap, today: IsoDate): { meta: string; tone: 'neutral' | 'danger' } {
  const slip = roadmapSlip(rm);
  if (slip !== null && slip > 0) return { meta: `+${slip} d`, tone: 'danger' };

  const overdue = overdueItems(rm, today).length;
  if (overdue > 0) return { meta: `${overdue} vencido${overdue === 1 ? '' : 's'}`, tone: 'danger' };

  if (rm.baselineDate !== null) return { meta: 'en plan', tone: 'neutral' };
  if (rm.rows.every((p) => effectiveEnd(p) === null))
    return { meta: 'sin fechas', tone: 'neutral' };
  return { meta: 'sin plan fijado', tone: 'neutral' };
}

/**
 * The most recently opened roadmaps, newest first.
 *
 * `recent` is already filtered to live ids by the caller; anything that still
 * fails to resolve here is skipped rather than rendered as a blank row.
 */
export function recentRows(
  roadmaps: Roadmap[],
  recent: RecentEntry[],
  today: IsoDate,
  slotColor: (slot: number) => string,
): Row[] {
  const out: Row[] = [];
  for (const entry of recent) {
    const rm = roadmaps.find((r) => r.id === entry.id);
    if (rm === undefined) continue;
    const state = roadmapState(rm, today);
    out.push({
      id: rm.id,
      // The roadmap's own slot, so the colour on the card is the colour of its
      // bar in "Todos" — and stays that colour when the list is reordered.
      color: slotColor(rm.colorSlot),
      label: rm.name,
      meta: state.meta,
      metaTone: state.tone,
    });
    if (out.length === LIST_ROWS) break;
  }
  return out;
}

/**
 * What Roadmaps contributes to "lo que no puede esperar" (D8).
 *
 * Note what is *not* here: the mock's "3 dependencias externas sin fecha
 * confirmada". `Blocker` is `{ id, name, owner, email }` — there is no date, so
 * that alert cannot be derived, and giving blockers a committed date is a
 * change to `blockers`, not to the hub. The third rule below is the derivable
 * thing that alert was reaching for.
 */
export function roadmapAlerts(roadmaps: Roadmap[], today: IsoDate): Alert[] {
  const out: Alert[] = [];

  for (const rm of roadmaps) {
    const slip = roadmapSlip(rm);
    if (slip !== null && slip >= SLIP_ALERT_THRESHOLD) {
      out.push({
        id: `slip:${rm.id}`,
        text: `${rm.name} acumula ${slip} ${slip === 1 ? 'día' : 'días'} de desviación`,
        source: `Roadmaps · plan fijado el ${fmtShort(rm.baselineDate)}`,
        tone: 'danger',
      });
    }
  }

  const overdue = roadmaps.reduce((n, rm) => n + overdueItems(rm, today).length, 0);
  if (overdue > 0) {
    out.push({
      id: 'overdue',
      text:
        overdue === 1
          ? 'Un item pasó de fecha sin cerrarse'
          : `${overdue} items pasaron de fecha sin cerrarse`,
      source: 'Roadmaps',
      tone: 'warn',
    });
  }

  const waiting = roadmaps.reduce((n, rm) => n + unresolvedBlockers(rm), 0);
  if (waiting > 0) {
    out.push({
      id: 'blockers',
      text:
        waiting === 1
          ? 'Una dependencia externa sigue sin resolver'
          : `${waiting} dependencias externas siguen sin resolver`,
      source: 'Roadmaps',
      tone: 'neutral',
    });
  }

  return out.sort(byToneDescending);
}

/** `YYYY-MM-DD` as `DD/MM/YY`, for the source line of an alert. */
function fmtShort(iso: IsoDate | null): string {
  if (iso === null) return 'sin fijar';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export function roadmapsSummary(
  roadmaps: Roadmap[],
  recent: RecentEntry[],
  today: IsoDate,
  slotColor: (slot: number) => string,
): AppSummary {
  return {
    stats: roadmapStats(roadmaps),
    list: {
      label: 'ABIERTOS RECIENTEMENTE',
      rows: recentRows(roadmaps, recent, today, slotColor),
      emptyLabel: 'todavía no has abierto ninguno',
    },
    alerts: roadmapAlerts(roadmaps, today),
  };
}
