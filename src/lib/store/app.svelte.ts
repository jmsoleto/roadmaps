/**
 * Reactive application store (Svelte 5 runes).
 *
 * Holds the full `AppData` plus view state (zoom, meta view). Mutations go
 * through methods that schedule a debounced save, mirroring the original
 * `queueSave`/`flushSaves` behavior. Persistence is delegated to the
 * `Storage` seam, so a different backend can replace it later untouched.
 */

import type { AppData, Assignee, Blocker, Item, Phase, Roadmap, IsoDate } from '../model/types';
import { DEFAULT_DAY_W, ZOOM_LEVELS } from '../config';
import { createStorage, type Storage } from './storage';
import { seedAppData, newRoadmap } from '../seed';
import { uid } from '../util/id';
import { addDays, snapToWorkday, todayIso } from '../time/timeline';
import { effectiveStart, effectiveEnd } from '../model/derive';
import { enforceConstraints } from '../model/constraints';
import {
  countBlockerUsage,
  countUnresolvedEquivalents,
  equivalenceKey,
  featureSuggestions,
} from '../model/blockers';
import { exportRoadmap, parseImport, mergeAssignees, mergeBlockers } from '../io/portability';
import { normalizeColors } from '../theme/migrate';
import { normalizeBlockers } from '../model/normalize';
import { PALETTE_SLOTS } from '../theme/tokens';

const SAVE_DEBOUNCE_MS = 250;

const minIso = (a: IsoDate, b: IsoDate): IsoDate => (a < b ? a : b);
const maxIso = (a: IsoDate, b: IsoDate): IsoDate => (a > b ? a : b);

export class AppStore {
  private storage: Storage;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  data = $state<AppData>({ roadmaps: [], assignees: [], blockers: [], activeId: null });
  dayW = $state<number>(DEFAULT_DAY_W);
  /**
   * True while the "Todos" view (portfolio of every roadmap) is showing. It is
   * the app's home: the session always starts here, never inside a roadmap, so
   * this is deliberately not persisted. `data.activeId` therefore means "the
   * roadmap opened last" — which one to show on leaving "Todos", and whose name
   * the topbar breadcrumb carries.
   */
  metaView = $state<boolean>(true);
  /** Briefly true right after a save, to drive the "guardado ✓" indicator. */
  justSaved = $state<boolean>(false);
  /** True once the initial async load has completed. */
  ready = $state<boolean>(false);

  constructor(storage: Storage = createStorage()) {
    this.storage = storage;
  }

  /** Load persisted state (or seed on first run). Must be awaited before mount. */
  async init(): Promise<void> {
    const loaded = normalizeBlockers(normalizeColors(await this.storage.load()));
    if (loaded) {
      this.data = loaded;
    } else {
      this.data = seedAppData();
      await this.flush();
    }
    if (this.data.activeId === null && this.data.roadmaps.length > 0) {
      this.data.activeId = this.data.roadmaps[0].id;
    }
    const zoom = Number(await this.storage.getPref('zoom'));
    if (ZOOM_LEVELS.includes(zoom as (typeof ZOOM_LEVELS)[number])) this.dayW = zoom;
    this.ready = true;
  }

  get activeRoadmap(): Roadmap | null {
    return this.data.roadmaps.find((r) => r.id === this.data.activeId) ?? null;
  }

  private findPhase(phaseId: string): Phase | undefined {
    return this.activeRoadmap?.rows.find((p) => p.id === phaseId);
  }

  private findItem(phaseId: string, itemId: string): Item | undefined {
    return this.findPhase(phaseId)?.children.find((c) => c.id === itemId);
  }

  // ---- view state ----

  setActive(id: string): void {
    this.data.activeId = id;
    this.metaView = false;
    this.scheduleSave();
  }

  toggleMetaView(on: boolean): void {
    this.metaView = on;
  }

  zoomIn(): void {
    const i = ZOOM_LEVELS.indexOf(this.dayW as (typeof ZOOM_LEVELS)[number]);
    if (i < ZOOM_LEVELS.length - 1) this.dayW = ZOOM_LEVELS[i + 1];
    else if (i === -1) this.dayW = DEFAULT_DAY_W;
    void this.storage.setPref('zoom', String(this.dayW));
  }

  zoomOut(): void {
    const i = ZOOM_LEVELS.indexOf(this.dayW as (typeof ZOOM_LEVELS)[number]);
    if (i > 0) this.dayW = ZOOM_LEVELS[i - 1];
    else if (i === -1) this.dayW = DEFAULT_DAY_W;
    void this.storage.setPref('zoom', String(this.dayW));
  }

  // ---- import / export (data-portability) ----

  /** Serialize the active roadmap (with referenced assignees) to JSON. */
  exportActive(): string | null {
    const rm = this.activeRoadmap;
    if (!rm) return null;
    return exportRoadmap(
      $state.snapshot(rm),
      $state.snapshot(this.data.assignees),
      $state.snapshot(this.data.blockers),
    );
  }

  /** Import a roadmap from JSON text (current or legacy format). */
  importFromText(text: string): void {
    const { roadmap, assignees, blockers } = parseImport(text);
    mergeAssignees(this.data, assignees);
    // Merge before pruning: the document brings its own catalog entries along,
    // and its assignments have to resolve against the post-merge catalog.
    mergeBlockers(this.data, blockers);
    const known = new Set(this.data.blockers.map((b) => b.id));
    for (const phase of roadmap.rows) {
      for (const item of phase.children) {
        item.blockers = item.blockers.filter((a) => known.has(a.blockerId));
      }
    }
    this.data.roadmaps.push(roadmap);
    this.data.activeId = roadmap.id;
    this.metaView = false;
    this.scheduleSave();
  }

  // ---- roadmap-level mutations ----

  addRoadmap(): void {
    const rm = newRoadmap(`Roadmap ${this.data.roadmaps.length + 1}`);
    this.data.roadmaps.push(rm);
    this.data.activeId = rm.id;
    this.metaView = false;
    this.scheduleSave();
  }

  renameRoadmap(id: string, name: string): void {
    const rm = this.data.roadmaps.find((r) => r.id === id);
    if (rm) {
      rm.name = name;
      this.scheduleSave();
    }
  }

  /** Set the active roadmap's timeline start (timeline-config). Item dates are absolute and unchanged. */
  setRoadmapStart(startDate: IsoDate): void {
    // Ignore invalid/partial values (e.g. mid-edit output from a native date input).
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return;
    const rm = this.activeRoadmap;
    if (rm) {
      rm.startDate = startDate;
      this.scheduleSave();
    }
  }

  /** Set the active roadmap's visible window length in days (min 90). */
  setRoadmapWindow(days: number): void {
    const rm = this.activeRoadmap;
    if (rm && Number.isFinite(days)) {
      rm.windowDays = Math.max(90, Math.round(days));
      this.scheduleSave();
    }
  }

  deleteRoadmap(id: string): void {
    this.data.roadmaps = this.data.roadmaps.filter((r) => r.id !== id);
    if (this.data.activeId === id) {
      this.data.activeId = this.data.roadmaps[0]?.id ?? null;
    }
    this.scheduleSave();
  }

  // ---- phase mutations ----

  togglePhaseExpanded(phaseId: string): void {
    const phase = this.findPhase(phaseId);
    if (phase) {
      phase.expanded = !phase.expanded;
      this.scheduleSave();
    }
  }

  addPhase(): void {
    const rm = this.activeRoadmap;
    if (!rm) return;
    const phase: Phase = {
      id: uid('ph'),
      name: 'Nueva fase',
      colorSlot: rm.rows.length % PALETTE_SLOTS,
      expanded: true,
      assigneeId: null,
      notes: '',
      startDate: null,
      endDate: null,
      children: [],
    };
    rm.rows.push(phase);
    this.scheduleSave();
  }

  renamePhase(phaseId: string, name: string): void {
    const phase = this.findPhase(phaseId);
    if (phase) {
      phase.name = name;
      this.scheduleSave();
    }
  }

  deletePhase(phaseId: string): void {
    const rm = this.activeRoadmap;
    if (!rm) return;
    rm.rows = rm.rows.filter((p) => p.id !== phaseId);
    this.scheduleSave();
  }

  setPhaseDates(phaseId: string, startDate: IsoDate, endDate: IsoDate): void {
    const phase = this.findPhase(phaseId);
    if (phase) {
      phase.startDate = startDate;
      phase.endDate = endDate;
      this.commit();
    }
  }

  // ---- item mutations ----

  addItem(phaseId: string, opts: { startDate?: IsoDate; endDate?: IsoDate } = {}): void {
    const rm = this.activeRoadmap;
    const phase = this.findPhase(phaseId);
    if (!rm || !phase) return;

    let start: IsoDate;
    let end: IsoDate;
    if (opts.startDate && opts.endDate) {
      start = opts.startDate;
      end = opts.endDate;
    } else {
      const ps = effectiveStart(phase);
      const pe = effectiveEnd(phase);
      if (ps && pe && phase.children.length === 0) {
        start = ps;
        end = pe;
        phase.startDate = null;
        phase.endDate = null;
      } else if (ps && pe) {
        start = ps;
        end = minIso(addDays(ps, 30), pe);
      } else {
        start = maxIso(todayIso(), rm.startDate);
        end = addDays(start, 30);
      }
    }
    start = snapToWorkday(start);
    end = snapToWorkday(end);
    if (end <= start) end = addDays(start, 1);

    phase.children.push({
      id: uid('it'),
      label: 'Nuevo item',
      colorSlot: phase.colorSlot,
      startDate: start,
      endDate: end,
      assigneeId: null,
      notes: '',
      dependsOn: [],
      blockers: [],
      isMilestone: false,
    });
    phase.expanded = true;
    this.scheduleSave();
  }

  addMilestone(phaseId: string, opts: { startDate?: IsoDate } = {}): void {
    const rm = this.activeRoadmap;
    const phase = this.findPhase(phaseId);
    if (!rm || !phase) return;
    let date = opts.startDate ?? effectiveEnd(phase) ?? maxIso(todayIso(), rm.startDate);
    date = snapToWorkday(date);
    phase.children.push({
      id: uid('mi'),
      label: 'Nuevo hito',
      colorSlot: phase.colorSlot,
      startDate: date,
      endDate: date,
      assigneeId: null,
      notes: '',
      dependsOn: [],
      blockers: [],
      isMilestone: true,
    });
    phase.expanded = true;
    this.scheduleSave();
  }

  renameItem(phaseId: string, itemId: string, label: string): void {
    const item = this.findItem(phaseId, itemId);
    if (item) {
      item.label = label;
      this.scheduleSave();
    }
  }

  deleteItem(phaseId: string, itemId: string): void {
    const phase = this.findPhase(phaseId);
    if (!phase) return;
    phase.children = phase.children.filter((c) => c.id !== itemId);
    // Drop dangling dependencies referencing the removed item.
    for (const c of phase.children) c.dependsOn = c.dependsOn.filter((d) => d !== itemId);
    this.commit();
  }

  setItemDates(phaseId: string, itemId: string, startDate: IsoDate, endDate: IsoDate): void {
    const item = this.findItem(phaseId, itemId);
    if (item) {
      item.startDate = startDate;
      item.endDate = item.isMilestone ? startDate : endDate;
      this.commit();
    }
  }

  toggleMilestone(phaseId: string, itemId: string): void {
    const item = this.findItem(phaseId, itemId);
    if (!item) return;
    if (item.isMilestone) {
      item.isMilestone = false;
      let end = snapToWorkday(addDays(item.startDate, 7));
      if (end <= item.startDate) end = addDays(item.startDate, 1);
      item.endDate = end;
    } else {
      item.isMilestone = true;
      item.endDate = item.startDate;
    }
    this.commit();
  }

  // ---- assignment / notes ----

  setAssignee(phaseId: string, itemId: string | null, assigneeId: string | null): void {
    const target = itemId ? this.findItem(phaseId, itemId) : this.findPhase(phaseId);
    if (target) {
      target.assigneeId = assigneeId;
      this.scheduleSave();
    }
  }

  setNotes(phaseId: string, itemId: string | null, notes: string): void {
    const target = itemId ? this.findItem(phaseId, itemId) : this.findPhase(phaseId);
    if (target) {
      target.notes = notes;
      this.scheduleSave();
    }
  }

  // ---- dependencies ----

  addDependency(phaseId: string, itemId: string, depId: string): void {
    const item = this.findItem(phaseId, itemId);
    if (item && !item.dependsOn.includes(depId)) {
      item.dependsOn.push(depId);
      this.commit();
    }
  }

  removeDependency(phaseId: string, itemId: string, depId: string): void {
    const item = this.findItem(phaseId, itemId);
    if (item) {
      item.dependsOn = item.dependsOn.filter((d) => d !== depId);
      this.commit();
    }
  }

  // ---- blockers (global catalog) ----
  //
  // None of these go through `commit()`, and that is the point: `commit()` runs
  // `enforceConstraints`, which moves dates. A blocker says an item cannot be
  // finished, not when it happens, so it must never shift the timeline.

  addBlocker(): Blocker {
    const b: Blocker = {
      id: uid('bl'),
      name: 'Nuevo bloqueo',
      owner: '',
      email: '',
    };
    this.data.blockers.push(b);
    this.scheduleSave();
    return b;
  }

  updateBlocker(id: string, patch: Partial<Omit<Blocker, 'id'>>): void {
    const b = this.data.blockers.find((x) => x.id === id);
    if (!b) return;
    if (patch.name !== undefined) b.name = patch.name;
    if (patch.owner !== undefined) b.owner = patch.owner;
    if (patch.email !== undefined) b.email = patch.email;
    this.scheduleSave();
  }

  /** How many items reference this blocker — the reach shown before deleting (D7). */
  blockerUsage(id: string): number {
    return countBlockerUsage(this.data, id);
  }

  /** Remove a blocker and every assignment of it, across all roadmaps (D7). */
  deleteBlocker(id: string): void {
    for (const rm of this.data.roadmaps) {
      for (const p of rm.rows) {
        for (const c of p.children) {
          if (c.blockers.some((a) => a.blockerId === id)) {
            c.blockers = c.blockers.filter((a) => a.blockerId !== id);
          }
        }
      }
    }
    this.data.blockers = this.data.blockers.filter((x) => x.id !== id);
    this.scheduleSave();
  }

  // ---- blocker assignments (on an item) ----

  addItemBlocker(phaseId: string, itemId: string, blockerId: string, feature: string): void {
    const item = this.findItem(phaseId, itemId);
    if (!item || !this.data.blockers.some((b) => b.id === blockerId)) return;
    item.blockers.push({ id: uid('ib'), blockerId, feature, resolved: false });
    this.scheduleSave();
  }

  removeItemBlocker(phaseId: string, itemId: string, assignmentId: string): void {
    const item = this.findItem(phaseId, itemId);
    if (!item) return;
    item.blockers = item.blockers.filter((a) => a.id !== assignmentId);
    this.scheduleSave();
  }

  setItemBlockerFeature(phaseId: string, itemId: string, assignmentId: string, feature: string) {
    const a = this.findItem(phaseId, itemId)?.blockers.find((x) => x.id === assignmentId);
    if (a) {
      a.feature = feature;
      this.scheduleSave();
    }
  }

  /** Resolve (or unresolve) exactly one assignment. Never touches the others. */
  setItemBlockerResolved(
    phaseId: string,
    itemId: string,
    assignmentId: string,
    resolved: boolean,
  ): void {
    const a = this.findItem(phaseId, itemId)?.blockers.find((x) => x.id === assignmentId);
    if (a) {
      a.resolved = resolved;
      this.scheduleSave();
    }
  }

  /**
   * How many other assignments describe the same wait and are still pending.
   * Drives the propagation offer; zero means no offer is shown (D3).
   */
  unresolvedEquivalents(blockerId: string, feature: string, excludeId: string): number {
    return countUnresolvedEquivalents(this.data, blockerId, feature, excludeId);
  }

  /**
   * Mark every assignment equivalent to this one as resolved, app-wide.
   *
   * Only ever called from the explicit offer — resolving one assignment must
   * not silently reach into other roadmaps (D3).
   */
  resolveEquivalentBlockers(blockerId: string, feature: string): void {
    const key = equivalenceKey(blockerId, feature);
    for (const rm of this.data.roadmaps) {
      for (const p of rm.rows) {
        for (const c of p.children) {
          for (const a of c.blockers) {
            if (equivalenceKey(a.blockerId, a.feature) === key) a.resolved = true;
          }
        }
      }
    }
    this.scheduleSave();
  }

  /** Feature names already used with this blocker, for the assign-time datalist. */
  blockerFeatureSuggestions(blockerId: string): string[] {
    return featureSuggestions(this.data, blockerId);
  }

  // ---- assignees (global catalog) ----

  addAssignee(): Assignee {
    const a: Assignee = {
      id: uid('as'),
      name: 'Nuevo responsable',
      colorSlot: this.data.assignees.length % PALETTE_SLOTS,
    };
    this.data.assignees.push(a);
    this.scheduleSave();
    return a;
  }

  renameAssignee(id: string, name: string): void {
    const a = this.data.assignees.find((x) => x.id === id);
    if (a) {
      a.name = name;
      this.scheduleSave();
    }
  }

  cycleAssigneeColor(id: string): void {
    const a = this.data.assignees.find((x) => x.id === id);
    if (a) {
      a.colorSlot = (a.colorSlot + 1) % PALETTE_SLOTS;
      this.scheduleSave();
    }
  }

  deleteAssignee(id: string): void {
    for (const rm of this.data.roadmaps) {
      for (const p of rm.rows) {
        if (p.assigneeId === id) p.assigneeId = null;
        for (const c of p.children) if (c.assigneeId === id) c.assigneeId = null;
      }
    }
    this.data.assignees = this.data.assignees.filter((x) => x.id !== id);
    this.scheduleSave();
  }

  // ---- persistence ----

  /** Apply dependency constraints then schedule a save (for date/dep edits). */
  private commit(): void {
    const rm = this.activeRoadmap;
    if (rm) enforceConstraints(rm);
    this.scheduleSave();
  }

  scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  /** Persist immediately (e.g. on window close) so no pending change is lost. */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.storage.save($state.snapshot(this.data));
    this.justSaved = true;
    setTimeout(() => (this.justSaved = false), 800);
  }
}

export const store = new AppStore();
