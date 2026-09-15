/**
 * Links Hub's interface state: what is on screen, and nothing worth persisting.
 *
 * The same split Decisions and API Hub make. What belongs in the document — the
 * areas, the links, their order — lives in the store. What lives here is the
 * transient: a form that is open, an area awaiting confirmation to be deleted.
 * Reloading into a half-typed link would be a bug, not a feature, and the entry
 * hook clears all of it on the way in (D11).
 */

class LinksUiStore {
  /** The link whose form is open, or `'new'` while creating one. */
  editing = $state<string | null>(null);
  /** Whether the "new area" field is up. */
  creatingArea = $state<boolean>(false);
  /** The area being renamed in place. */
  renamingArea = $state<string | null>(null);
  /**
   * The area whose deletion is awaiting a second click.
   *
   * Confirmation as state rather than `confirm()`: the browser dialog steals
   * focus, cannot be styled, and cannot be driven from a test.
   */
  deletingArea = $state<string | null>(null);
  /**
   * The link whose deletion is awaiting confirmation, inside its own form.
   *
   * Held by id rather than as a flag, so a form that ends up pointing at a
   * different link cannot inherit a confirmation that was asked about another
   * one.
   */
  deletingLink = $state<string | null>(null);

  get creatingLink(): boolean {
    return this.editing === 'new';
  }

  openCreate(): void {
    this.editing = 'new';
  }

  openEdit(id: string): void {
    this.editing = id;
  }

  /**
   * Close the form, and with it any pending deletion.
   *
   * The panel closes three ways — cancel, the scrim, and saving — and a
   * confirmation that outlives the screen that asked for it is a confirmation
   * nobody gave. The rail learnt the same lesson when `startReorder` had to
   * cancel a pending area deletion before dragging.
   */
  closeForm(): void {
    this.editing = null;
    this.deletingLink = null;
  }

  askDeleteLink(id: string): void {
    this.deletingLink = id;
  }

  cancelDeleteLink(): void {
    this.deletingLink = null;
  }

  openCreateArea(): void {
    this.creatingArea = true;
  }

  closeCreateArea(): void {
    this.creatingArea = false;
  }

  askRenameArea(id: string | null): void {
    this.renamingArea = id;
  }

  askDeleteArea(id: string): void {
    this.deletingArea = id;
  }

  cancelDeleteArea(): void {
    this.deletingArea = null;
  }

  /** Everything transient, gone. What the entry hook calls. */
  reset(): void {
    this.editing = null;
    this.creatingArea = false;
    this.renamingArea = null;
    this.deletingArea = null;
    this.deletingLink = null;
  }
}

export const linksUi = new LinksUiStore();
