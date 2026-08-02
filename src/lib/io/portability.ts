/**
 * Roadmap import/export (data-portability).
 *
 * Export produces a self-contained JSON document with the roadmap and the
 * assignees it references. Import accepts both this current format and the
 * legacy single-file format from `roadmap_tool_6_6_2.html`, whose dates are
 * integer day offsets from 2026-01-01 — those are converted to absolute ISO
 * dates on the way in.
 */

import type { AppData, Assignee, Item, Phase, Roadmap, IsoDate } from '../model/types';
import { DEFAULT_WINDOW_DAYS } from '../model/types';
import { dateFromDay } from '../time/timeline';
import { uid } from '../util/id';

const FORMAT = 'roadmaps.v1';
const LEGACY_ORIGIN: IsoDate = '2026-01-01';

export interface RoadmapExport {
  format: typeof FORMAT;
  exportedAt: string;
  roadmap: Roadmap;
  assignees: Assignee[];
}

/** Serialize a roadmap plus the assignees it references to a JSON string. */
export function exportRoadmap(rm: Roadmap, allAssignees: Assignee[]): string {
  const used = new Set<string>();
  for (const p of rm.rows) {
    if (p.assigneeId) used.add(p.assigneeId);
    for (const c of p.children) if (c.assigneeId) used.add(c.assigneeId);
  }
  const doc: RoadmapExport = {
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    roadmap: rm,
    assignees: allAssignees.filter((a) => used.has(a.id)),
  };
  return JSON.stringify(doc, null, 2);
}

/** Parse imported JSON (current or legacy) into a roadmap + its assignees. */
export function parseImport(text: string): { roadmap: Roadmap; assignees: Assignee[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es JSON válido.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Formato no reconocido.');

  const obj = parsed as Record<string, unknown>;
  if (obj.format === FORMAT && obj.roadmap) {
    return { roadmap: normalizeRoadmap(obj.roadmap), assignees: asAssignees(obj.assignees) };
  }
  if (Array.isArray(obj.rows)) {
    return { roadmap: fromLegacy(obj), assignees: [] };
  }
  throw new Error('Formato no reconocido.');
}

function asAssignees(v: unknown): Assignee[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (a): a is Assignee => !!a && typeof a === 'object' && typeof (a as Assignee).id === 'string',
    )
    .map((a) => ({ id: a.id, name: String(a.name ?? ''), color: String(a.color ?? '#22D3EE') }));
}

/** Accept a current-format roadmap, giving it a fresh id to avoid collisions. */
function normalizeRoadmap(v: unknown): Roadmap {
  const r = v as Roadmap;
  return {
    id: uid('rm'),
    name: String(r.name ?? 'Roadmap importado'),
    startDate: r.startDate ?? LEGACY_ORIGIN,
    windowDays: typeof r.windowDays === 'number' ? r.windowDays : DEFAULT_WINDOW_DAYS,
    rows: Array.isArray(r.rows) ? r.rows.map(normalizePhase) : [],
  };
}

function normalizePhase(p: Phase): Phase {
  return {
    id: p.id ?? uid('ph'),
    name: String(p.name ?? 'Fase'),
    color: p.color ?? '#22D3EE',
    expanded: p.expanded ?? true,
    assigneeId: p.assigneeId ?? null,
    notes: String(p.notes ?? ''),
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    children: Array.isArray(p.children) ? p.children.map((c) => normalizeItem(c, p.color)) : [],
  };
}

function normalizeItem(c: Item, phaseColor: string): Item {
  const isMilestone = !!c.isMilestone;
  return {
    id: c.id ?? uid('it'),
    label: String(c.label ?? 'Item'),
    color: c.color ?? phaseColor,
    startDate: c.startDate,
    endDate: isMilestone ? c.startDate : c.endDate,
    assigneeId: c.assigneeId ?? null,
    notes: String(c.notes ?? ''),
    dependsOn: Array.isArray(c.dependsOn) ? c.dependsOn : [],
    isMilestone,
  };
}

/** Convert the legacy day-index format into the current ISO-date model. */
function fromLegacy(obj: Record<string, unknown>): Roadmap {
  const day = (n: unknown): IsoDate | null =>
    typeof n === 'number' ? dateFromDay(LEGACY_ORIGIN, n) : null;

  const rows: Phase[] = (obj.rows as unknown[]).map((pv) => {
    const p = pv as Record<string, unknown>;
    const color = String(p.color ?? '#22D3EE');
    const children: Item[] = Array.isArray(p.children)
      ? (p.children as unknown[]).map((cv) => {
          const c = cv as Record<string, unknown>;
          const isMilestone = !!c.isMilestone;
          const start = day(c.start) ?? LEGACY_ORIGIN;
          const end = isMilestone ? start : (day(c.end) ?? start);
          return {
            id: String(c.id ?? uid('it')),
            label: String(c.label ?? 'Item'),
            color: String(c.color ?? color),
            startDate: start,
            endDate: end,
            assigneeId: (c.assigneeId as string | null) ?? null,
            notes: String(c.notes ?? ''),
            dependsOn: Array.isArray(c.dependsOn) ? (c.dependsOn as string[]) : [],
            isMilestone,
          };
        })
      : [];
    return {
      id: String(p.id ?? uid('ph')),
      name: String(p.label ?? p.name ?? 'Fase'),
      color,
      expanded: p.expanded !== false,
      assigneeId: (p.assigneeId as string | null) ?? null,
      notes: String(p.notes ?? ''),
      startDate: day(p.start),
      endDate: day(p.end),
      children,
    };
  });

  return {
    id: uid('rm'),
    name: String(obj.name ?? 'Roadmap importado'),
    startDate: LEGACY_ORIGIN,
    windowDays: DEFAULT_WINDOW_DAYS,
    rows,
  };
}

/** Merge imported assignees into the app, skipping ids that already exist. */
export function mergeAssignees(app: AppData, incoming: Assignee[]): void {
  for (const a of incoming) {
    if (!app.assignees.some((x) => x.id === a.id)) app.assignees.push(a);
  }
}
