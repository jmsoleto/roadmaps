/**
 * Reactive store for Decisions (Svelte 5 runes).
 *
 * Same shape as `store/app.svelte.ts`: the whole document in `$state`, mutations
 * through methods that schedule a debounced save, persistence delegated to a
 * seam. Two things differ, and both come from this app's requirements:
 *
 *  - Loading has **three** outcomes, not two. A store that will not open is not
 *    a store with nothing in it, and the app has to say so instead of showing an
 *    empty list over data it could not read.
 *  - Some mutations are **refused rather than applied**. The recommendation
 *    freezes when the decision is raised (D3), so the store is where that rule
 *    lives — not the component that happens to render the form.
 */

import { uid } from '../util/id';
import { todayIso } from '../time/timeline';
import type { IsoDate } from '../model/types';
import { createDecisionsBackend, type DecisionsBackend } from './storage';
import {
  emptyDecisionsData,
  type Assessment,
  type AssessmentValue,
  type CaptureSource,
  type Decision,
  type DecisionsData,
  type Impact,
  type Option,
} from './model/types';
import {
  canMarkReady,
  isCaptured,
  isOpen,
  openByUrgency,
  phaseOf,
  recommendationIsFrozen,
} from './model/state';
import { normalizeDecisions } from './model/normalize';
import { suggestProjects } from './model/projects';
import type { CriterionId } from './model/criteria';
import { pastedName, rejectionMessage, rejectionOf, type Attachment } from './model/attachments';

const SAVE_DEBOUNCE_MS = 250;

/** Why the app cannot be used right now, or `null` when it can. */
export type Unavailable = { reason: string } | null;

export class DecisionsStore {
  private backend: DecisionsBackend;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  data = $state<DecisionsData>(emptyDecisionsData());
  /**
   * Set when the store could not be opened.
   *
   * While this is set the app refuses to create or change anything: writing
   * over data we failed to read would be irreversible, with no server to
   * recover from.
   */
  unavailable = $state<Unavailable>(null);
  ready = $state<boolean>(false);
  justSaved = $state<boolean>(false);
  /** Which decision the detail panel is showing. */
  selectedId = $state<string | null>(null);

  constructor(backend: DecisionsBackend = createDecisionsBackend()) {
    this.backend = backend;
  }

  async init(): Promise<void> {
    const out = await this.backend.load();
    if (out.kind === 'unavailable') {
      this.unavailable = { reason: out.reason };
    } else {
      // Everything that comes in gets normalised, so nothing downstream has to
      // know that an older format ever existed (D6).
      this.data =
        out.kind === 'loaded'
          ? (normalizeDecisions(out.data) ?? emptyDecisionsData())
          : emptyDecisionsData();
      this.unavailable = null;
      // Only once the document has been read: with the store unavailable we
      // know nothing about what is referenced, and must not delete anything.
      void this.sweepOrphanBlobs();
    }
    this.ready = true;
  }

  /**
   * Drop attachment bytes that no fiche mentions (D4).
   *
   * One direction only. Bytes without a fiche are unreachable — nobody can see
   * them and nothing will ever claim them — so they are rubbish. A fiche
   * without bytes is the opposite: it is exactly what importing produces, and
   * deleting it would destroy the record that the image ever existed.
   */
  private async sweepOrphanBlobs(): Promise<void> {
    try {
      const referenced = new Set(
        this.data.decisions.flatMap((d) => d.attachments.map((a) => a.id)),
      );
      const stored = await this.backend.blobKeys();
      const orphans = stored.filter((id) => !referenced.has(id));
      if (orphans.length > 0) await this.backend.deleteBlobs(orphans);
    } catch {
      // Housekeeping: failing to tidy up must never stop the app from starting.
    }
  }

  // ---- reading ----

  get all(): Decision[] {
    return this.data.decisions;
  }

  get selected(): Decision | null {
    return this.data.decisions.find((d) => d.id === this.selectedId) ?? null;
  }

  /** Open decisions, most urgent first. */
  open(today: IsoDate = todayIso()): Decision[] {
    return openByUrgency(this.data.decisions, today);
  }

  /** Captured and not yet translated: the study debt. */
  get captured(): Decision[] {
    return this.data.decisions.filter(isCaptured);
  }

  countOpen(): number {
    return this.data.decisions.filter(isOpen).length;
  }

  countLapsed(today: IsoDate = todayIso()): number {
    return this.data.decisions.filter((d) => phaseOf(d, today) === 'caducada').length;
  }

  projectSuggestions(query: string): string[] {
    return suggestProjects(this.data.decisions, query);
  }

  select(id: string | null): void {
    this.selectedId = id;
  }

  // ---- capture and edit ----

  /**
   * Quick capture: one line of text and nothing else (D7).
   *
   * The text always lands in `origin`, because in a meeting there is no asking
   * which kind of thing you just heard. Translating it later proposes it as the
   * question, so a decision born in business language costs no retyping (D4).
   */
  capture(origin: string, originContext = '', source: CaptureSource = 'tecleado'): Decision | null {
    if (this.unavailable) return null;
    const text = origin.trim();
    if (text === '') return null;

    const d: Decision = {
      id: uid('dec'),
      origin: text,
      originContext: originContext.trim(),
      capturedAt: todayIso(),
      captureSource: source,
      question: '',
      project: '',
      stakeholder: '',
      deadline: null,
      impact: null,
      notes: '',
      internalNote: '',
      attachments: [],
      options: [],
      readyAt: null,
      recommendation: null,
      resolution: null,
    };
    this.data.decisions.push(d);
    this.scheduleSave();
    return d;
  }

  /**
   * The question to propose when preparing a decision for the first time.
   *
   * Its own text once written, the origin while it is still a draft. This is
   * what keeps the two-text model from charging a toll to the decisions that
   * were already business-ready (D4).
   */
  proposedQuestion(d: Decision): string {
    return d.question.trim() === '' ? d.origin : d.question;
  }

  setQuestion(id: string, question: string): void {
    this.patch(id, (d) => {
      d.question = question;
    });
  }

  setOrigin(id: string, origin: string, originContext?: string): void {
    this.patch(id, (d) => {
      d.origin = origin;
      if (originContext !== undefined) d.originContext = originContext;
    });
  }

  setField(
    id: string,
    patch: Partial<Pick<Decision, 'project' | 'stakeholder' | 'notes' | 'internalNote'>> & {
      deadline?: IsoDate | null;
      impact?: Impact | null;
    },
  ): void {
    this.patch(id, (d) => Object.assign(d, patch));
  }

  delete(id: string): void {
    if (this.unavailable) return;
    const i = this.data.decisions.findIndex((d) => d.id === id);
    if (i === -1) return;
    const orphaned = this.data.decisions[i].attachments.map((a) => a.id);
    this.data.decisions.splice(i, 1);
    void this.backend.deleteBlobs(orphaned).catch(() => {
      // Swept on the next load if this fails.
    });
    if (this.selectedId === id) this.selectedId = null;
    this.scheduleSave();
  }

  // ---- visual support ----

  /**
   * Attach an image, writing its bytes before recording the fiche.
   *
   * That order matters: a fiche whose bytes never made it would show as a
   * permanent absence, while bytes without a fiche are swept on next load.
   * Failing safe means failing towards the recoverable side.
   *
   * Returns the rejection message when the file is not admissible.
   */
  async attach(id: string, file: File | Blob, name?: string): Promise<string | null> {
    if (this.unavailable) return 'Las decisiones no están disponibles.';
    const d = this.find(id);
    if (!d) return null;

    const mime = file.type;
    const reason = rejectionOf({ type: mime, size: file.size });
    if (reason) return rejectionMessage(reason, file.size);

    const attachment: Attachment = {
      id: uid('att'),
      name: name?.trim() || (file instanceof File ? file.name : '') || pastedName(new Date(), mime),
      size: file.size,
      mime,
      addedAt: todayIso(),
    };

    try {
      await this.backend.putBlob(attachment.id, file);
    } catch (e) {
      return e instanceof Error ? e.message : 'No se pudo guardar el adjunto.';
    }

    d.attachments.push(attachment);
    this.scheduleSave();
    return null;
  }

  /** Remove an attachment and the bytes behind it. */
  detach(id: string, attachmentId: string): void {
    this.patch(id, (d) => {
      d.attachments = d.attachments.filter((a) => a.id !== attachmentId);
    });
    void this.backend.deleteBlobs([attachmentId]).catch(() => {
      // The fiche is already gone; the bytes get swept on the next load.
    });
  }

  /** The bytes of an attachment, or `null` when they are not on this machine. */
  async blobFor(attachmentId: string): Promise<Blob | null> {
    if (this.unavailable) return null;
    return this.backend.getBlob(attachmentId);
  }

  // ---- alternatives ----

  addOption(id: string, text = ''): void {
    this.patch(id, (d) => {
      d.options.push({ id: uid('opt'), text, assessments: [] });
    });
  }

  setOptionText(id: string, optionId: string, text: string): void {
    this.patch(id, (d) => {
      const o = d.options.find((x) => x.id === optionId);
      if (o) o.text = text;
    });
  }

  /**
   * Assess an alternative on one criterion.
   *
   * Text and value are independent: a criterion described in a sentence but
   * never quantified is a complete answer for the room and merely invisible to
   * a chart. An assessment with neither is dropped rather than kept empty.
   */
  setAssessment(
    id: string,
    optionId: string,
    criterion: CriterionId,
    patch: { text?: string; value?: AssessmentValue | null },
  ): void {
    this.patch(id, (d) => {
      const o = d.options.find((x) => x.id === optionId);
      if (!o) return;
      const current = o.assessments.find((a) => a.criterion === criterion);
      const next: Assessment = {
        criterion,
        text: patch.text ?? current?.text ?? '',
        value: patch.value !== undefined ? patch.value : (current?.value ?? null),
      };
      const rest = o.assessments.filter((a) => a.criterion !== criterion);
      o.assessments = next.text.trim() === '' && next.value === null ? rest : [...rest, next];
    });
  }

  removeOption(id: string, optionId: string): void {
    this.patch(id, (d) => {
      d.options = d.options.filter((o) => o.id !== optionId);
      // A recommendation pointing at an alternative that no longer exists would
      // be a dangling reference; it can only happen before raising, when the
      // recommendation is still the author's to change.
      if (d.recommendation?.optionId === optionId && d.readyAt === null) d.recommendation = null;
    });
  }

  moveOption(id: string, optionId: string, delta: number): void {
    this.patch(id, (d) => {
      const i = d.options.findIndex((o) => o.id === optionId);
      const j = i + delta;
      if (i === -1 || j < 0 || j >= d.options.length) return;
      const [o] = d.options.splice(i, 1);
      d.options.splice(j, 0, o);
    });
  }

  // ---- recommend, raise, resolve ----

  /**
   * Record or change what you would recommend.
   *
   * Refused once the decision has been raised. The rule lives here rather than
   * in the form because it is what makes the measure worth anything: a
   * recommendation editable after the answer is known always turns out right.
   */
  recommend(id: string, optionId: string, why: string): boolean {
    const d = this.find(id);
    if (!d || this.unavailable || recommendationIsFrozen(d)) return false;
    if (!d.options.some((o) => o.id === optionId)) return false;
    d.recommendation = { optionId, why, at: todayIso() };
    this.scheduleSave();
    return true;
  }

  clearRecommendation(id: string): boolean {
    const d = this.find(id);
    if (!d || this.unavailable || recommendationIsFrozen(d)) return false;
    d.recommendation = null;
    this.scheduleSave();
    return true;
  }

  /**
   * Declare the study finished: the decision is ready to present.
   *
   * The one transition the data cannot imply — three alternatives written down
   * do not mean the thinking is done — so it is an explicit gesture that stamps
   * the day and freezes the recommendation (D1, D2).
   */
  markReady(id: string, at: IsoDate = todayIso()): boolean {
    const d = this.find(id);
    if (!d || this.unavailable || !canMarkReady(d)) return false;
    d.readyAt = at;
    // The recommendation's stamp becomes the day it stopped being arguable,
    // which is now — not the day it was drafted.
    if (d.recommendation) d.recommendation = { ...d.recommendation, at };
    this.scheduleSave();
    return true;
  }

  /** Resolve into one of the alternatives. Only from phase 3. */
  resolveWithOption(id: string, optionId: string, at: IsoDate = todayIso()): boolean {
    const d = this.find(id);
    if (!d || this.unavailable || d.readyAt === null) return false;
    if (!d.options.some((o) => o.id === optionId)) return false;
    d.resolution = { optionId, text: '', at };
    this.scheduleSave();
    return true;
  }

  /** Resolve into something that was not on the table. Only from phase 3. */
  resolveWithText(id: string, text: string, at: IsoDate = todayIso()): boolean {
    const d = this.find(id);
    if (!d || this.unavailable || d.readyAt === null) return false;
    if (text.trim() === '') return false;
    d.resolution = { optionId: null, text: text.trim(), at };
    this.scheduleSave();
    return true;
  }

  /** Undo a resolution, putting the decision back into phase 3. */
  reopen(id: string): void {
    this.patch(id, (d) => {
      d.resolution = null;
    });
  }

  // ---- persistence ----

  private find(id: string): Decision | undefined {
    return this.data.decisions.find((d) => d.id === id);
  }

  /** Mutate one decision and schedule a save, refusing when the store is down. */
  private patch(id: string, fn: (d: Decision) => void): void {
    if (this.unavailable) return;
    const d = this.find(id);
    if (!d) return;
    fn(d);
    this.scheduleSave();
  }

  scheduleSave(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.unavailable) return;
    try {
      await this.backend.save($state.snapshot(this.data) as DecisionsData);
      this.justSaved = true;
      setTimeout(() => (this.justSaved = false), 1200);
    } catch (e) {
      // Unlike Roadmaps' localStorage backend, a failure here is worth showing:
      // it means the store went away underneath us, and further edits would be
      // lost silently.
      this.unavailable = { reason: e instanceof Error ? e.message : String(e) };
    }
  }

  /** Replace everything, for import. */
  replaceAll(decisions: Decision[]): void {
    if (this.unavailable) return;
    this.data = { decisions };
    this.scheduleSave();
  }

  /** Append imported decisions to the ones already here. */
  append(decisions: Decision[]): void {
    if (this.unavailable) return;
    this.data.decisions.push(...decisions);
    this.scheduleSave();
  }
}

export const decisions = new DecisionsStore();

export type { Decision, Option };
