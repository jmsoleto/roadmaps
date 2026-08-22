/**
 * What Decisions reports to its card on the hub landing.
 *
 * Written against the `HubApp` contract exactly as Roadmaps' summary is, and
 * that is the point: if this file had needed the contract to grow, the contract
 * would have been wrong.
 *
 * Pure, with `today` as a parameter, the same shape `roadmaps-summary.ts` uses.
 */

import type { IsoDate } from '../model/types';
import type { Alert, AppSummary, Row, Stat } from '../hub/types';
import { byToneDescending } from '../hub/types';
import { daysToDeadline, isCaptured, isOpen, openByUrgency, phaseOf } from './model/state';
import type { Decision } from './model/types';

/** How many rows the card shows. */
export const LIST_ROWS = 3;

/** Days ahead at which a deadline starts being worth an alert. */
const SOON_DAYS = 7;
/** Drafts you can carry without it meaning anything. */
const DRAFT_PILEUP = 3;

/** The swatch colour of a row, by how much the decision is asking for. */
function rowColour(d: Decision, today: IsoDate): string {
  const phase = phaseOf(d, today);
  if (phase === 'caducada') return 'var(--danger)';
  const days = daysToDeadline(d, today);
  if (days !== null && days <= SOON_DAYS) return 'var(--accent)';
  return 'var(--text-dim)';
}

/** The right-hand detail of a row: when it is due, or that it already was. */
function rowMeta(d: Decision, today: IsoDate): { meta: string; tone: Row['metaTone'] } {
  const phase = phaseOf(d, today);
  if (phase === 'captura') return { meta: 'sin traducir', tone: 'neutral' };
  if (d.deadline === null) return { meta: 'sin fecha', tone: 'neutral' };

  const days = daysToDeadline(d, today)!;
  if (days < 0) return { meta: `venció ${shortDate(d.deadline)}`, tone: 'danger' };
  if (days === 0) return { meta: 'hoy', tone: 'danger' };
  if (days <= SOON_DAYS) return { meta: shortDate(d.deadline), tone: 'warn' };
  return { meta: shortDate(d.deadline), tone: 'neutral' };
}

/** `YYYY-MM-DD` as `DD/MM`. */
function shortDate(iso: IsoDate): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function decisionStats(decisions: Decision[], today: IsoDate): [Stat, Stat, Stat] {
  const open = decisions.filter((d) => isOpen(d)).length;
  const captured = decisions.filter(isCaptured).length;
  const lapsed = decisions.filter((d) => phaseOf(d, today) === 'caducada').length;

  return [
    // Open and not the historical total: the total only ever goes up and stops
    // saying anything after three months.
    { value: open, label: 'abiertas', tone: 'neutral' },
    { value: captured, label: 'sin traducir', tone: 'neutral' },
    { value: lapsed, label: 'caducadas', tone: lapsed > 0 ? 'danger' : 'neutral' },
  ];
}

/**
 * The rows: what actually needs talking about.
 *
 * Drafts are deliberately excluded here even though they count in the figures —
 * a decision that has not been translated cannot be put to anyone yet, so it
 * does not belong under "toca hablarlas". Their number is the second figure.
 */
export function decisionRows(decisions: Decision[], today: IsoDate): Row[] {
  return openByUrgency(decisions, today)
    .filter((d) => !isCaptured(d))
    .slice(0, LIST_ROWS)
    .map((d) => {
      const { meta, tone } = rowMeta(d, today);
      return {
        id: d.id,
        color: rowColour(d, today),
        label: d.question.trim() || d.origin,
        meta,
        metaTone: tone,
      };
    });
}

export function decisionAlerts(decisions: Decision[], today: IsoDate): Alert[] {
  const out: Alert[] = [];

  for (const d of decisions) {
    if (phaseOf(d, today) !== 'caducada') continue;
    out.push({
      id: `lapsed:${d.id}`,
      text: `Venció sin resolución: ${d.question.trim() || d.origin}`,
      source: d.project.trim() ? `Decisions · ${d.project.trim()}` : 'Decisions',
      tone: 'danger',
    });
  }

  const soon = decisions.filter((d) => {
    if (!isOpen(d) || isCaptured(d) || phaseOf(d, today) === 'caducada') return false;
    const days = daysToDeadline(d, today);
    return days !== null && days >= 0 && days <= SOON_DAYS;
  }).length;
  if (soon > 0) {
    out.push({
      id: 'soon',
      text: soon === 1 ? 'Una decisión vence esta semana' : `${soon} decisiones vencen esta semana`,
      source: 'Decisions',
      tone: 'warn',
    });
  }

  const drafts = decisions.filter(isCaptured).length;
  if (drafts >= DRAFT_PILEUP) {
    out.push({
      id: 'drafts',
      text: `${drafts} decisiones capturadas sin traducir a negocio`,
      source: 'Decisions',
      tone: 'neutral',
    });
  }

  return out.sort(byToneDescending);
}

export function decisionsSummary(decisions: Decision[], today: IsoDate): AppSummary {
  return {
    stats: decisionStats(decisions, today),
    list: {
      label: 'TOCA HABLARLAS',
      rows: decisionRows(decisions, today),
      emptyLabel: 'nada pendiente de hablar',
    },
    alerts: decisionAlerts(decisions, today),
  };
}
