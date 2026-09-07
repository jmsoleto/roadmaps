/**
 * Links Hub's store: the areas, the links, and which one the keyboard is on.
 *
 * Loads synchronously, unlike Decisions and API Hub. There is no `ready` and no
 * `unavailable` here because `localStorage` cannot leave us waiting (D7), and
 * inventing those states would mean the screen has to handle a case that never
 * happens — while the one case that matters, an outage at 4am, would be the one
 * paying for it.
 *
 * Writes are coalesced the same way the other stores do it: every mutation
 * schedules a debounced save rather than writing straight through.
 */

import { createLinksBackend, type LinksBackend } from './storage';
import {
  EMPTY,
  linksOf,
  newArea,
  newLink,
  type Area,
  type Link,
  type LinkDraft,
  type LinksData,
} from './model';

const SAVE_DEBOUNCE_MS = 300;

export class LinksStore {
  private backend: LinksBackend;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  data = $state<LinksData>(EMPTY);

  /**
   * The area whose grid is on screen, and the link the keyboard is on.
   *
   * Deliberately outside `data`, so neither is persisted. Which area you were
   * looking at last Tuesday is not a fact about the catalogue, and entering the
   * application puts it back at its first area anyway (D11). Within a session
   * they do survive opening a link, which is the requirement that matters: the
   * pattern is to open three or four in a row and come back.
   */
  activeAreaId = $state<string | null>(null);
  focusedLinkId = $state<string | null>(null);

  constructor(backend: LinksBackend = createLinksBackend()) {
    this.backend = backend;
  }

  init(): void {
    this.data = this.backend.load();
    this.activeAreaId = this.data.areas[0]?.id ?? null;
    this.focusedLinkId = null;
  }

  // ---- reading ----

  get areas(): Area[] {
    return this.data.areas;
  }

  get activeArea(): Area | null {
    return this.data.areas.find((a) => a.id === this.activeAreaId) ?? null;
  }

  /** The links of the active area, in order. */
  get visibleLinks(): Link[] {
    return linksOf(this.data, this.activeAreaId);
  }

  countIn(areaId: string): number {
    return this.data.links.reduce((n, l) => n + (l.areaId === areaId ? 1 : 0), 0);
  }

  link(id: string): Link | null {
    return this.data.links.find((l) => l.id === id) ?? null;
  }

  // ---- areas ----

  addArea(name: string): Area | null {
    const trimmed = name.trim();
    if (trimmed === '') return null;
    const area = newArea(trimmed);
    this.data.areas.push(area);
    this.activeAreaId = area.id;
    this.focusedLinkId = null;
    this.schedule();
    return area;
  }

  /**
   * Bring in an area with its links, as a new area at the end.
   *
   * **Adds, never merges**, even when the name is one that is already there.
   * Merging would drop links into an area the user has not opened, and undoing
   * that costs as many gestures as links came in; undoing an area too many
   * costs one. Two people with a "Pagos" area have two different "Pagos".
   *
   * Leaves it open, the way creating one does. It is the visible proof the
   * import happened — an import that changes nothing on screen and only leaves
   * a line of text in the bar is indistinguishable from one that did nothing.
   *
   * Identity arrives already assigned by the importer, which is what makes
   * importing the same file twice give two independent areas.
   */
  importArea(area: Area, links: Link[]): void {
    this.data.areas.push(area);
    this.data.links.push(...links);
    this.activeAreaId = area.id;
    this.focusedLinkId = null;
    this.schedule();
  }

  renameArea(id: string, name: string): void {
    const area = this.data.areas.find((a) => a.id === id);
    if (!area || name.trim() === '') return;
    area.name = name.trim();
    this.schedule();
  }

  /** Deleting an area takes its links with it; the screen warns how many. */
  deleteArea(id: string): void {
    this.data.areas = this.data.areas.filter((a) => a.id !== id);
    this.data.links = this.data.links.filter((l) => l.areaId !== id);
    if (this.activeAreaId === id) {
      this.activeAreaId = this.data.areas[0]?.id ?? null;
      this.focusedLinkId = null;
    }
    this.schedule();
  }

  moveArea(id: string, to: number): void {
    const from = this.data.areas.findIndex((a) => a.id === id);
    if (from === -1 || to < 0 || to >= this.data.areas.length) return;
    const [area] = this.data.areas.splice(from, 1);
    this.data.areas.splice(to, 0, area);
    this.schedule();
  }

  setActiveArea(id: string | null): void {
    if (id !== null && !this.data.areas.some((a) => a.id === id)) return;
    this.activeAreaId = id;
    this.focusedLinkId = null;
  }

  /** Move to the area `step` places along. Used by the left and right arrows. */
  stepArea(step: number): void {
    const areas = this.data.areas;
    if (areas.length === 0) return;
    const at = areas.findIndex((a) => a.id === this.activeAreaId);
    const next = at === -1 ? 0 : (at + step + areas.length) % areas.length;
    this.setActiveArea(areas[next].id);
  }

  // ---- links ----

  addLink(draft: LinkDraft, areaId: string | null = this.activeAreaId): Link | null {
    if (areaId === null || !this.data.areas.some((a) => a.id === areaId)) return null;
    const link = newLink(areaId, draft, this.data.links.length);
    this.data.links.push(link);
    this.focusedLinkId = link.id;
    this.schedule();
    return link;
  }

  updateLink(id: string, patch: Partial<Omit<Link, 'id' | 'areaId'>>): void {
    const link = this.data.links.find((l) => l.id === id);
    if (!link) return;
    Object.assign(link, patch);
    this.schedule();
  }

  deleteLink(id: string): void {
    this.data.links = this.data.links.filter((l) => l.id !== id);
    if (this.focusedLinkId === id) this.focusedLinkId = null;
    this.schedule();
  }

  /**
   * Move a link within its own area, by position among that area's links.
   *
   * Reorders the area's own sequence and writes it back into the positions that
   * area already occupies in the flat list, so a move never disturbs the links
   * of any other area.
   */
  moveLink(id: string, to: number): void {
    const link = this.link(id);
    if (!link) return;
    const siblings = linksOf(this.data, link.areaId);
    const from = siblings.findIndex((l) => l.id === id);
    if (from === -1 || to < 0 || to >= siblings.length || to === from) return;

    const reordered = [...siblings];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const slots: number[] = [];
    this.data.links.forEach((l, i) => {
      if (l.areaId === link.areaId) slots.push(i);
    });
    slots.forEach((pos, i) => (this.data.links[pos] = reordered[i]));
    this.schedule();
  }

  setFocus(id: string | null): void {
    this.focusedLinkId = id;
  }

  /** Move the focus `step` places within the active area. */
  stepFocus(step: number): void {
    const links = this.visibleLinks;
    if (links.length === 0) return;
    const at = links.findIndex((l) => l.id === this.focusedLinkId);
    const next =
      at === -1 ? (step > 0 ? 0 : links.length - 1) : (at + step + links.length) % links.length;
    this.focusedLinkId = links[next].id;
  }

  /**
   * Put the focus on one link wherever it lives, activating its area.
   *
   * What a row of the landing card does: it takes you to the link, it does not
   * open it. From the landing the row leads to the place; opening is a decision
   * you make once you are already inside.
   */
  reveal(id: string): void {
    const link = this.link(id);
    if (!link) return;
    this.activeAreaId = link.areaId;
    this.focusedLinkId = id;
  }

  /** Back to the first area, which is where entering the application lands. */
  home(): void {
    this.activeAreaId = this.data.areas[0]?.id ?? null;
    this.focusedLinkId = null;
  }

  // ---- persistence ----

  private schedule(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    // `$state.snapshot` and not the proxy: `JSON.stringify` would read through
    // it, but the backend is a seam and the next one behind it may not.
    this.backend.save($state.snapshot(this.data) as LinksData);
  }
}

export const links = new LinksStore();
