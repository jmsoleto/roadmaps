/**
 * Reactive application store (Svelte 5 runes).
 *
 * Holds the full `AppData` plus view state (zoom, meta view). Mutations go
 * through methods that schedule a debounced save, mirroring the original
 * `queueSave`/`flushSaves` behavior. Persistence is delegated to the
 * `Storage` seam, so a different backend can replace it later untouched.
 */

import type { AppData, Assignee, Blocker, Item, Phase, Roadmap, IsoDate } from '../model/types';
import { DEFAULT_DAY_W, DEFAULT_SIDEBAR_W, ZOOM_LEVELS } from '../config';
import { clampSidebarDrag, readSidebarPref } from '../util/sidebar-width';
import { createStorage, type Storage } from './storage';
import { seedAppData, newRoadmap } from '../seed';
import { uid } from '../util/id';
import { nameKey } from '../util/roadmap-name';
import { addDays, isIsoDate, snapToWorkday, todayIso } from '../time/timeline';
import { effectiveStart, effectiveEnd, moveInArray } from '../model/derive';
import { enforceConstraints } from '../model/constraints';
import { canComplete, completedDependents, isCompleted } from '../model/completion';
import {
  countBlockerUsage,
  countUnresolvedEquivalents,
  equivalenceKey,
  featureSuggestions,
} from '../model/blockers';
import { exportRoadmap, parseImport, mergeAssignees, mergeBlockers } from '../io/portability';
import { normalizeColors } from '../theme/migrate';
import { normalizeBlockers, normalizeCompletion, normalizeRoadmapColors } from '../model/normalize';
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
   * Ancho de la columna de nombres en cada vista, en píxeles.
   *
   * Dos y no uno porque son dos listas distintas: nombres de roadmap en
   * "Todos", nombres de fase e item —indentados y con su progreso al lado— en
   * un roadmap. Que quisieran el mismo ancho sería casualidad. El de la vista
   * de roadmap sí es el mismo para todos los roadmaps: es una preferencia de
   * cómo mira el usuario, no un atributo del plan.
   *
   * Viven aquí y no en `ui.svelte.ts` porque se persisten, y aquella se declara
   * a sí misma «Transient UI state». Son hermanos de `dayW` en todo: se
   * hidratan en `init()`, se escriben con `setPref` y no entran en `AppData`,
   * así que no viajan en la exportación (D2).
   */
  sidebarW = $state<number>(DEFAULT_SIDEBAR_W);
  metaSidebarW = $state<number>(DEFAULT_SIDEBAR_W);
  /**
   * True while the "Todos" view (portfolio of every roadmap) is showing.
   *
   * It is **Roadmaps' home, not the session's**: the session now starts on the
   * hub landing, one level up (`hub/location.svelte.ts`). Entering Roadmaps by
   * any route — its card, the app switcher, the browser's back button — runs an
   * entry hook that sets this back to `true`, so the app always opens on
   * "Todos"; the one exception is entering while naming a roadmap, where the
   * caller runs `setActive` afterwards and wins.
   *
   * Still deliberately not persisted, for the same reason as before: where you
   * are is decided on arrival, not remembered. `data.activeId` therefore means
   * "the roadmap opened last" — which one to show on leaving "Todos", and whose
   * name the topbar breadcrumb carries.
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
    const loaded = normalizeRoadmapColors(
      normalizeCompletion(normalizeBlockers(normalizeColors(await this.storage.load()))),
    );
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
    this.sidebarW = readSidebarPref(await this.storage.getPref('sidebar-w'));
    this.metaSidebarW = readSidebarPref(await this.storage.getPref('meta-sidebar-w'));
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

  /*
   * Fijar y guardar están separados a propósito. Un arrastre genera decenas de
   * posiciones intermedias y ninguna de ellas es una decisión: la vista llama a
   * `set…` en cada movimiento y a `save…` una sola vez al soltar. `setPref`
   * escribe en el almacén sin agrupar, a diferencia del autosave de los datos.
   *
   * El ancho disponible llega como parámetro en lugar de mirarse la ventana
   * aquí, para que estas cuatro operaciones se prueben sin navegador.
   */

  setSidebarW(px: number, portW: number): void {
    this.sidebarW = clampSidebarDrag(px, portW);
  }

  saveSidebarW(): void {
    void this.storage.setPref('sidebar-w', String(this.sidebarW));
  }

  setMetaSidebarW(px: number, portW: number): void {
    this.metaSidebarW = clampSidebarDrag(px, portW);
  }

  saveMetaSidebarW(): void {
    void this.storage.setPref('meta-sidebar-w', String(this.metaSidebarW));
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
    // The slot only applies when the document brings none; where it lands is
    // the only thing that can decide it (D4).
    const { roadmap, assignees, blockers } = parseImport(
      text,
      this.data.roadmaps.length % PALETTE_SLOTS,
    );
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

  /**
   * Why a name would be rejected at creation time, or `null` if it is fine.
   *
   * Returned rather than kept private because the creation dialog has to say
   * *why* it refuses — and, for a clash, which roadmap it clashed with, so the
   * rejection reads as "you already have this one" instead of arbitrary. The
   * rule then lives here alone; `addRoadmap` is the guard, this is the reason.
   *
   * Emptiness is checked on the key, so "   " needs no separate rule.
   */
  roadmapNameError(
    name: string,
  ): { kind: 'empty' } | { kind: 'duplicate'; existing: string } | null {
    const key = nameKey(name);
    if (key === '') return { kind: 'empty' };
    const clash = this.data.roadmaps.find((r) => nameKey(r.name) === key);
    return clash ? { kind: 'duplicate', existing: clash.name } : null;
  }

  /**
   * Create a roadmap under an explicit name, reporting whether it went through.
   *
   * The name is stored verbatim: `nameKey` only decides whether it collides.
   * Uniqueness is enforced *here only* — `renameRoadmap` and `importFromText`
   * deliberately do not check it, so those paths can still end up with two
   * roadmaps sharing a name (roadmap-editor, "Alcance de la unicidad").
   */
  addRoadmap(name: string): boolean {
    if (this.roadmapNameError(name)) return false;
    const rm = newRoadmap(name, this.data.roadmaps.length % PALETTE_SLOTS);
    this.data.roadmaps.push(rm);
    this.data.activeId = rm.id;
    this.metaView = false;
    this.scheduleSave();
    return true;
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

  /**
   * Move a roadmap to another position in the list.
   *
   * This is the order of the roadmaps everywhere, not of one view: both the
   * "Todos" view and the switcher walk this array as it stands, so fixing it
   * once fixes both places a roadmap gets picked from (D1).
   *
   * `scheduleSave` and not `commit`, for the reason `movePhase` gives — and
   * doubly so here, since `commit` only ever looks at the active roadmap.
   */
  moveRoadmap(id: string, toIndex: number): void {
    const from = this.data.roadmaps.findIndex((r) => r.id === id);
    if (from === -1 || toIndex === from || toIndex < 0 || toIndex >= this.data.roadmaps.length) {
      return;
    }
    this.data.roadmaps = moveInArray(this.data.roadmaps, from, toIndex);
    this.scheduleSave();
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

  /**
   * Move a phase to another position among its roadmap's phases.
   *
   * Deliberately `scheduleSave` and not `commit` (design decision D4).
   * `commit` runs `enforceConstraints`, which is a fixed point over the
   * `dependsOn` graph and is indifferent to the order of the array: permuting
   * `rows` changes no date and no edge, so the sweep would have nothing to do.
   * Adding it "just in case" would buy a full pass per drop in exchange for
   * nothing.
   */
  movePhase(phaseId: string, toIndex: number): void {
    const rm = this.activeRoadmap;
    if (!rm) return;
    const from = rm.rows.findIndex((p) => p.id === phaseId);
    if (from === -1 || toIndex === from || toIndex < 0 || toIndex >= rm.rows.length) return;
    rm.rows = moveInArray(rm.rows, from, toIndex);
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
      completedDate: null,
      endAtCompletion: null,
      baselineEnd: null,
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
      completedDate: null,
      endAtCompletion: null,
      baselineEnd: null,
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

  /** Move an item's dates. Does nothing to a completed item: it is frozen (D4). */
  /**
   * Move an item to another position among its phase's children.
   *
   * An item never leaves its phase (D2): `dependsOn` is resolved strictly
   * within one phase, so a cross-phase move would leave dangling predecessor
   * ids that `getMinStart` and the arrow drawing both skip in silence.
   *
   * No `commit` here either, for the reason spelled out on `movePhase`. This
   * holds for a completed item too, which reorders like any other: freezing is
   * about the time axis, and a position in a list is not a date (D9).
   */
  moveItem(phaseId: string, itemId: string, toIndex: number): void {
    const phase = this.findPhase(phaseId);
    if (!phase) return;
    const from = phase.children.findIndex((c) => c.id === itemId);
    if (from === -1 || toIndex === from || toIndex < 0 || toIndex >= phase.children.length) return;
    phase.children = moveInArray(phase.children, from, toIndex);
    this.scheduleSave();
  }

  setItemDates(phaseId: string, itemId: string, startDate: IsoDate, endDate: IsoDate): void {
    const item = this.findItem(phaseId, itemId);
    if (item && !isCompleted(item)) {
      item.startDate = startDate;
      item.endDate = item.isMilestone ? startDate : endDate;
      this.commit();
    }
  }

  /**
   * Swap an item between a span and a milestone.
   *
   * Refused on a completed item: this writes `endDate`, so it is one of the
   * four doors through which a frozen item could otherwise move (D4).
   */
  toggleMilestone(phaseId: string, itemId: string): void {
    const item = this.findItem(phaseId, itemId);
    if (!item || isCompleted(item)) return;
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

  /**
   * Declare `depId` as a predecessor of `itemId`.
   *
   * A completed item only accepts predecessors that are completed too. Without
   * that, a new dependency on open work would break rule B retroactively and
   * hand the cascade a frozen bar to push (D4).
   */
  addDependency(phaseId: string, itemId: string, depId: string): void {
    const phase = this.findPhase(phaseId);
    const item = phase?.children.find((c) => c.id === itemId);
    if (!phase || !item || item.dependsOn.includes(depId)) return;
    const dep = phase.children.find((c) => c.id === depId);
    if (isCompleted(item) && (!dep || !isCompleted(dep))) return;
    item.dependsOn.push(depId);
    this.commit();
  }

  removeDependency(phaseId: string, itemId: string, depId: string): void {
    const item = this.findItem(phaseId, itemId);
    if (item) {
      item.dependsOn = item.dependsOn.filter((d) => d !== depId);
      this.commit();
    }
  }

  // ---- completion ----
  //
  // `completedDate` alone carries the state (D2). Completing does not go
  // through `commit()`: it changes no dates, and freezing an item can never
  // create a constraint violation. Uncompleting does, because it thaws items
  // that `enforceConstraints` had been skipping.

  /**
   * Mark an item completed, returning false when rule B forbids it.
   *
   * `date` defaults to today and may be corrected backwards — work gets ticked
   * off after it is finished — but never forwards, since a future completion is
   * just the end date the item already has (D2).
   *
   * The end date in force at this instant is frozen into `endAtCompletion`, so
   * later drags cannot rewrite what was measured (D6).
   */
  completeItem(phaseId: string, itemId: string, date?: IsoDate): boolean {
    const phase = this.findPhase(phaseId);
    const item = phase?.children.find((c) => c.id === itemId);
    if (!phase || !item || isCompleted(item)) return false;
    if (!canComplete(phase, item)) return false;

    const today = todayIso();
    const when = date ?? today;
    if (!isIsoDate(when) || when > today) return false;

    item.completedDate = when;
    item.endAtCompletion = item.endDate;
    this.scheduleSave();
    return true;
  }

  /**
   * Correct the completion date of an item that is already completed.
   *
   * Same window as `completeItem` — never in the future — and deliberately not
   * a re-completion: `endAtCompletion` keeps the end date in force when the
   * work actually closed, which is the thing the forecast slip measures. Fixing
   * a typo in the date must not be a reason to lose it, and it must not cost a
   * trip through the destructive uncomplete cascade either.
   */
  setCompletedDate(phaseId: string, itemId: string, date: IsoDate): boolean {
    const item = this.findItem(phaseId, itemId);
    if (!item || !isCompleted(item)) return false;
    if (!isIsoDate(date) || date > todayIso()) return false;
    item.completedDate = date;
    this.scheduleSave();
    return true;
  }

  /**
   * How many completed items would be dragged along by uncompleting this one —
   * the reach the confirmation has to state before anything is cleared (D9).
   */
  countCompletedDependents(phaseId: string, itemId: string): number {
    const phase = this.findPhase(phaseId);
    const item = phase?.children.find((c) => c.id === itemId);
    if (!phase || !item) return 0;
    return completedDependents(phase, item).length;
  }

  /**
   * Uncomplete an item and every completed item downstream of it.
   *
   * The cascade is what keeps rule B true going backwards: a completed item
   * cannot be left with an open predecessor. `baselineEnd` survives untouched —
   * the baseline belongs to the plan, not to the completion (D9).
   *
   * Destructive and unguarded: the caller confirms first, using
   * `countCompletedDependents`.
   */
  uncompleteItem(phaseId: string, itemId: string): void {
    const phase = this.findPhase(phaseId);
    const item = phase?.children.find((c) => c.id === itemId);
    if (!phase || !item) return;
    for (const target of [item, ...completedDependents(phase, item)]) {
      target.completedDate = null;
      target.endAtCompletion = null;
    }
    this.commit();
  }

  /**
   * Fix the plan of a roadmap: copy every item's planned end into its baseline
   * and stamp the day it was done.
   *
   * Repeatable, and repeating it restarts the accumulated drift — the caller
   * warns before calling again. Items created afterwards keep `baselineEnd`
   * null, which is how they read as scope added after the plan (D5).
   */
  setBaseline(roadmapId: string): void {
    const rm = this.data.roadmaps.find((r) => r.id === roadmapId);
    if (!rm) return;
    for (const phase of rm.rows) {
      for (const item of phase.children) item.baselineEnd = item.endDate;
    }
    rm.baselineDate = todayIso();
    this.scheduleSave();
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
