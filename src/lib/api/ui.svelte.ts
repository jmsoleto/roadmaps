/**
 * API Hub's interface state: what is on screen, and nothing that is worth
 * persisting.
 *
 * The same split Decisions makes. What belongs in the document — which contract
 * is open, which view inside it — lives in the store and survives a reload,
 * because `api-contracts` promises the work comes back as it was left. What
 * lives here is the transient: a dialog that is open, a contract awaiting
 * confirmation to be deleted. Reloading into a half-open dialog would be a bug,
 * not a feature.
 */

class ApiUiStore {
  /** Whether the "new contract" dialog is up. */
  creating = $state<boolean>(false);
  /**
   * The contract whose deletion is awaiting a second click.
   *
   * Confirmation as a state rather than a `confirm()`: the browser dialog steals
   * focus and cannot be styled, and the store must stay drivable from a test.
   */
  deletingId = $state<string | null>(null);

  openCreate(): void {
    this.creating = true;
  }

  closeCreate(): void {
    this.creating = false;
  }

  askDelete(id: string): void {
    this.deletingId = id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  // ---- the field tree ----

  /**
   * Which fields have their advanced strip open.
   *
   * Session state, unlike the fold state of a branch, which lives on the node
   * and is persisted: a folded branch is a decision about *this contract*, and
   * an open options strip is something you did two seconds ago.
   */
  private advanced = $state<Set<string>>(new Set());

  isAdvancedOpen(nodeId: string): boolean {
    return this.advanced.has(nodeId);
  }

  toggleAdvanced(nodeId: string): void {
    const next = new Set(this.advanced);
    if (!next.delete(nodeId)) next.add(nodeId);
    this.advanced = next;
  }

  /**
   * What should take the focus next, named by its identifier.
   *
   * Set when a field or a parameter is chained with Enter, and consumed by
   * whichever row turns out to be the one: the store creates and returns the
   * new element, but it has no business knowing what focus is, so the id is
   * handed over here instead.
   *
   * It lives with the transient rather than in the document for the reason this
   * whole file exists: reloading into a pending focus would be a bug, not a
   * feature. It is the same line `creating` and `pasteTargetId` are on.
   *
   * **One field covers both the tree and the parameters** because identifiers
   * are already unique across the application — `uid('nod')` and `uid('par')`
   * never collide — so there is nothing to disambiguate and no reason to keep
   * two of these.
   */
  private focusing = $state<string | null>(null);

  /** Ask for the name box of `id` to take the focus once it is on screen. */
  wantFocus(id: string): void {
    this.focusing = id;
  }

  /**
   * True once, for whoever is `id`. Consuming it clears it.
   *
   * A question rather than a value to read, so that the caller cannot forget to
   * clear it and leave a row stealing the focus on every repaint.
   */
  takeFocus(id: string): boolean {
    if (this.focusing !== id) return false;
    this.focusing = null;
    return true;
  }

  /** The field whose paste dialog is up, or `null`. */
  pasteTargetId = $state<string | null>(null);
  /** Why the last paste was refused, shown inside the dialog. */
  pasteError = $state<string | null>(null);

  openPaste(nodeId: string): void {
    this.pasteTargetId = nodeId;
    this.pasteError = null;
  }

  closePaste(): void {
    this.pasteTargetId = null;
    this.pasteError = null;
  }

  /**
   * Whether the example panel is showing (D4).
   *
   * Open by default, because watching the shape of the response appear while
   * the field names are typed is half the value of the tool in a projected
   * meeting. Not persisted: it is a preference about the screen, not about the
   * contract. If reopening it every session turns out to grate, the right home
   * is the same `getPref` seam where Roadmaps keeps its zoom.
   */
  exampleOpen = $state<boolean>(true);

  toggleExample(): void {
    this.exampleOpen = !this.exampleOpen;
  }

  /**
   * Whether the panel is showing the example or the mock.
   *
   * `example` by default, and that is not a detail: the switch is **the promise
   * that nothing already written changed meaning, made visible**. Somebody who
   * wants to check it flips to `example` and sees the JSON they always saw.
   *
   * Not persisted, same as `exampleOpen` and for the same reason: it is a
   * preference about the screen, not about the contract.
   */
  panelMode = $state<'example' | 'mock'>('example');

  setPanelMode(mode: 'example' | 'mock'): void {
    this.panelMode = mode;
  }

  /**
   * Which page or variant each block is showing, by block id.
   *
   * Kept per block rather than one number for the panel: stepping to the third
   * page of a response and then looking at the request body must not move the
   * response back to the first. Keyed by the block's id, so it also survives
   * leaving the endpoint and coming back.
   */
  private steps = $state<Record<string, number>>({});

  step(blockId: string): number {
    return this.steps[blockId] ?? 0;
  }

  /** Move within a block, clamped: there is no page before the first. */
  setStep(blockId: string, index: number, count: number): void {
    const last = Math.max(0, count - 1);
    this.steps = { ...this.steps, [blockId]: Math.min(last, Math.max(0, index)) };
  }

  /**
   * Which parent a nested endpoint is showing, by endpoint id.
   *
   * `undefined` means «the one the path parameter's example names», which is what
   * the contract already says. Stepping overrides it for as long as the session
   * lasts, and never writes anything into the contract.
   */
  private parents = $state<Record<string, number>>({});

  parentStep(endpointId: string): number | null {
    return this.parents[endpointId] ?? null;
  }

  setParentStep(endpointId: string, index: number, count: number): void {
    const last = Math.max(0, count - 1);
    this.parents = { ...this.parents, [endpointId]: Math.min(last, Math.max(0, index)) };
  }

  /** Whether a block has been stepped, so a default can apply while it has not. */
  hasStep(blockId: string): boolean {
    return this.steps[blockId] !== undefined;
  }

  /** Whether the value sources dialog is up. */
  sources = $state<boolean>(false);

  openSources(): void {
    this.sources = true;
  }

  closeSources(): void {
    this.sources = false;
  }

  /** Whether the library is up. */
  library = $state<boolean>(false);

  openLibrary(): void {
    this.library = true;
  }

  closeLibrary(): void {
    this.library = false;
  }

  /** Whether the export panel is up. */
  exporting = $state<boolean>(false);

  openExport(): void {
    this.exporting = true;
  }

  closeExport(): void {
    this.exporting = false;
  }

  /**
   * Whether any of API Hub's dialogs is up.
   *
   * One question, so that the keyboard shortcut does not have to know the list
   * — and so that a new dialog joins it here and nowhere else.
   */
  anyDialogOpen(): boolean {
    return (
      this.creating ||
      this.deletingId !== null ||
      this.pasteTargetId !== null ||
      this.sources ||
      this.library ||
      this.exporting
    );
  }

  // ---- the field search ----

  /**
   * What is being searched, and in which contract.
   *
   * Session state: reloading into a half-typed search would be a bug. Kept here
   * rather than in the rail because the rail repaints when the view changes,
   * and changing the view is exactly what going through the results does.
   *
   * Tied to a contract so that switching contracts empties it: the results of
   * one mean nothing in another.
   */
  private search = $state<{ contractId: string; text: string } | null>(null);

  queryFor(contractId: string): string {
    return this.search?.contractId === contractId ? this.search.text : '';
  }

  setQuery(contractId: string, text: string): void {
    this.search = text === '' ? null : { contractId, text };
    this.chosen = null;
  }

  /** The result last gone to, marked in the list so the next one is easy to find. */
  chosen = $state<string | null>(null);

  /**
   * Where the focus was before ⌘K, to give it back on Esc.
   *
   * Not reactive: nothing paints from it, it is only read once.
   */
  searchReturn: HTMLElement | null = null;

  /**
   * The field or parameter that should scroll into view and light up.
   *
   * Separate from `focusing` on purpose (D6): going to look at a field is not
   * going to rewrite it, so the key is neither focused nor selected, and the
   * focus stays in the search box to carry on through the results.
   */
  private revealing = $state<string | null>(null);

  wantReveal(id: string): void {
    this.revealing = id;
  }

  /**
   * Who is waiting to be revealed, readable so a row already on screen notices.
   *
   * Unlike the focus after Enter — always a row about to mount — going through
   * the results lands on rows that are already there, so they must be able to
   * react to the request rather than only check it when they mount.
   */
  get pendingReveal(): string | null {
    return this.revealing;
  }

  /** True once, for whoever is `id`. Consuming it clears it. */
  takeReveal(id: string): boolean {
    if (this.revealing !== id) return false;
    this.revealing = null;
    return true;
  }
}

export const apiUi = new ApiUiStore();
