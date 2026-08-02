/**
 * Roadmap import/export (data-portability).
 *
 * Export produces a self-contained JSON document with the roadmap and the
 * assignees it references. Import accepts both this current format and the
 * legacy single-file format from `roadmap_tool_6_6_2.html`, which comes in two
 * date dialects: integer day offsets from 2026-01-01 (the original tool) and
 * absolute ISO days (its later `schemaVersion: 1` exports). Both are normalized
 * to absolute ISO dates on the way in, deciding per value rather than per
 * document version, so a file that mixes the two still imports correctly.
 */

import type { AppData, Assignee, Item, Phase, Roadmap, IsoDate } from '../model/types';
import { DEFAULT_WINDOW_DAYS } from '../model/types';
import { dateFromDay, dayIndex, isIsoDate } from '../time/timeline';
import { uid } from '../util/id';
import { toSlot } from '../theme/migrate';

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
    return { roadmap: fromLegacy(obj), assignees: asAssignees(obj.assignees) };
  }
  throw new Error('Formato no reconocido.');
}

function asAssignees(v: unknown): Assignee[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (a): a is Assignee => !!a && typeof a === 'object' && typeof (a as Assignee).id === 'string',
    )
    .map((a) => ({
      id: a.id,
      name: String(a.name ?? ''),
      colorSlot: toSlot((a as Assignee & { color?: unknown }).color ?? a.colorSlot),
    }));
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

function normalizePhase(p: Phase & { color?: unknown }): Phase {
  const colorSlot = toSlot(p.color ?? p.colorSlot);
  return {
    id: p.id ?? uid('ph'),
    name: String(p.name ?? 'Fase'),
    colorSlot,
    expanded: p.expanded ?? true,
    assigneeId: p.assigneeId ?? null,
    notes: String(p.notes ?? ''),
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    children: Array.isArray(p.children) ? p.children.map((c) => normalizeItem(c, colorSlot)) : [],
  };
}

function normalizeItem(c: Item & { color?: unknown }, phaseSlot: number): Item {
  const isMilestone = !!c.isMilestone;
  const raw = c.color ?? c.colorSlot;
  return {
    id: c.id ?? uid('it'),
    label: String(c.label ?? 'Item'),
    colorSlot: raw === undefined ? phaseSlot : toSlot(raw),
    startDate: c.startDate,
    endDate: isMilestone ? c.startDate : c.endDate,
    assigneeId: c.assigneeId ?? null,
    notes: String(c.notes ?? ''),
    dependsOn: Array.isArray(c.dependsOn) ? c.dependsOn : [],
    isMilestone,
  };
}

/**
 * Read one legacy date in either dialect: a finite number is a day offset from
 * `LEGACY_ORIGIN`, an ISO day is already absolute. Anything else — including a
 * string that isn't a valid day — counts as "no date", and the caller decides
 * what that means for a phase (stays null) or an item (gets a default).
 */
function legacyDate(v: unknown): IsoDate | null {
  if (typeof v === 'number' && Number.isFinite(v)) return dateFromDay(LEGACY_ORIGIN, v);
  if (isIsoDate(v)) return v;
  return null;
}

/** Convert a legacy document (either date dialect) into the current model. */
function fromLegacy(obj: Record<string, unknown>): Roadmap {
  const rows: Phase[] = (obj.rows as unknown[]).map((pv) => {
    const p = pv as Record<string, unknown>;
    const colorSlot = toSlot(p.color ?? p.colorSlot);
    const children: Item[] = Array.isArray(p.children)
      ? (p.children as unknown[]).map((cv) => {
          const c = cv as Record<string, unknown>;
          const isMilestone = !!c.isMilestone;
          const start = legacyDate(c.start) ?? LEGACY_ORIGIN;
          const end = isMilestone ? start : (legacyDate(c.end) ?? start);
          return {
            id: String(c.id ?? uid('it')),
            label: String(c.label ?? 'Item'),
            colorSlot: c.color === undefined ? colorSlot : toSlot(c.color),
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
      colorSlot,
      expanded: p.expanded !== false,
      assigneeId: (p.assigneeId as string | null) ?? null,
      notes: String(p.notes ?? ''),
      startDate: legacyDate(p.start),
      endDate: legacyDate(p.end),
      children,
    };
  });

  return {
    id: uid('rm'),
    name: String(obj.name ?? 'Roadmap importado'),
    ...fitWindow(rows),
    rows,
  };
}

/**
 * The timeline window for a document that doesn't carry one of its own.
 *
 * Legacy day offsets are counted from `LEGACY_ORIGIN`, so the default window
 * always fits them; absolute ISO dates carry no such guarantee, and content
 * outside the window renders nowhere. So the default is kept whenever the
 * content fits in it, and only widened — from the first of the month, since the
 * grid is drawn by months — when it doesn't.
 */
function fitWindow(rows: Phase[]): { startDate: IsoDate; windowDays: number } {
  const dates: IsoDate[] = [];
  for (const p of rows) {
    if (p.startDate) dates.push(p.startDate);
    if (p.endDate) dates.push(p.endDate);
    for (const c of p.children) dates.push(c.startDate, c.endDate);
  }
  const fallback = { startDate: LEGACY_ORIGIN, windowDays: DEFAULT_WINDOW_DAYS };
  if (dates.length === 0) return fallback;

  const min = dates.reduce((a, b) => (a < b ? a : b));
  const max = dates.reduce((a, b) => (a > b ? a : b));
  const startDate = min < LEGACY_ORIGIN ? `${min.slice(0, 8)}01` : LEGACY_ORIGIN;
  const needed = dayIndex(startDate, max) + 1;
  return { startDate, windowDays: Math.max(DEFAULT_WINDOW_DAYS, needed) };
}

/** Merge imported assignees into the app, skipping ids that already exist. */
export function mergeAssignees(app: AppData, incoming: Assignee[]): void {
  for (const a of incoming) {
    if (!app.assignees.some((x) => x.id === a.id)) app.assignees.push(a);
  }
}
