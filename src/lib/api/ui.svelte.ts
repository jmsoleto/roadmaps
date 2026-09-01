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
}

export const apiUi = new ApiUiStore();
