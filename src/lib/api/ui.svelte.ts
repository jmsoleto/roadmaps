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
}

export const apiUi = new ApiUiStore();
