/**
 * What Links Hub reports to the landing.
 *
 * Pure, like the other three summaries: links and recent openings in, the
 * card's contract out. The store wiring is in `hub/registry.ts`.
 */

import { formatRelative } from '../hub/relative-time';
import type { RecentEntry } from '../hub/usage';
import type { Alert, AppSummary, Row, Stat } from '../hub/types';
import type { LinksData } from './model';

/** How many rows the card shows. */
const LIST_ROWS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many distinct links were opened today.
 *
 * "Today" is the calendar day of `now` in local time, not the last 24 hours: on
 * a shift that starts in the evening, "hoy" is the shift, and a rolling window
 * would keep counting yesterday's checks well into it.
 *
 * Distinct because `usage` is a trace and not a tally — it keeps one entry per
 * link, the last time it was opened — so this counts links touched today, which
 * is the honest reading of what it stores.
 */
export function openedToday(recent: RecentEntry[], now: number): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const from = start.getTime();
  return recent.reduce((n, e) => n + (e.at >= from && e.at <= now + DAY_MS ? 1 : 0), 0);
}

function stats(data: LinksData, recent: RecentEntry[], now: number): [Stat, Stat, Stat] {
  return [
    { value: data.links.length, label: 'enlaces', tone: 'neutral' },
    { value: data.areas.length, label: 'áreas', tone: 'neutral' },
    { value: openedToday(recent, now), label: 'abiertos hoy', tone: 'neutral' },
  ];
}

/**
 * The links opened most recently, newest first.
 *
 * Recency and not frequency, and the correction is worth keeping written down:
 * `usage` deduplicates by id, so there are no repeated openings to rank by. It
 * is also the better list — from the landing, mid-shift, the question is what
 * you have already checked in this round.
 *
 * `recent` arrives already filtered to live ids by the caller; anything that
 * still fails to resolve is skipped rather than rendered as a blank row.
 */
export function recentRows(
  data: LinksData,
  recent: RecentEntry[],
  now: number,
  slotColor: (slot: number) => string,
): Row[] {
  const out: Row[] = [];
  for (const entry of recent) {
    const link = data.links.find((l) => l.id === entry.id);
    if (link === undefined) continue;
    out.push({
      // The link's own first slot, so the swatch on the card is the colour its
      // button carries in the grid.
      id: link.id,
      color: slotColor(link.from),
      label: link.name,
      meta: formatRelative(entry.at, now),
      metaTone: 'neutral',
    });
    if (out.length === LIST_ROWS) break;
  }
  return out;
}

/**
 * Links Hub contributes no alerts, and that is not a special case (D9).
 *
 * The strip aggregates what it is given, so being given nothing costs the
 * landing no branch. A panel of links has nothing urgent to say, and an invented
 * alert would spend the room of one that is.
 */
export function linkAlerts(): Alert[] {
  return [];
}

export function linksSummary(
  data: LinksData,
  recent: RecentEntry[],
  now: number,
  slotColor: (slot: number) => string,
): AppSummary {
  return {
    stats: stats(data, recent, now),
    list: {
      label: 'ABIERTOS RECIENTEMENTE',
      rows: recentRows(data, recent, now, slotColor),
      emptyLabel: 'aún no has abierto ninguno',
    },
    alerts: linkAlerts(),
  };
}
