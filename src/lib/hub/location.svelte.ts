/**
 * Where the user is: the hub, or one live application.
 *
 * The single source of truth for the outer level of navigation. What happens
 * *inside* an application is that application's business — `store.metaView`
 * still decides whether Roadmaps shows "Todos" or a roadmap.
 *
 * Entering an application resets it to its own home. That rule lives here, as a
 * hook each app registers, rather than in the landing: reaching Roadmaps with
 * the browser's back button has to reset it just as much as clicking its card
 * does, and the landing is not involved in the former.
 */

import { HUB, hashFor, parseHash, sameLocation, type Location } from './routes';

class LocationStore {
  current = $state<Location>(HUB);

  /** Per-app "you just arrived, go to your home" callbacks. */
  private entryHooks = new Map<string, () => void>();
  /** Set while we are the ones writing the hash, so the listener stays quiet. */
  private writing = false;

  /**
   * Register what an application does when it is entered.
   *
   * Called before `init`, so that the location restored from the URL on boot
   * lands the app on its home too.
   */
  onEnter(appId: string, fn: () => void): void {
    this.entryHooks.set(appId, fn);
  }

  /** Adopt the location in the URL and start following the browser's history. */
  init(): () => void {
    this.apply(parseHash(window.location.hash), { push: false });

    const onHashChange = () => {
      if (this.writing) return;
      this.apply(parseHash(window.location.hash), { push: false });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }

  go(location: Location): void {
    this.apply(location, { push: true });
  }

  goHub(): void {
    this.go(HUB);
  }

  goApp(id: string): void {
    this.go({ kind: 'app', id });
  }

  get inHub(): boolean {
    return this.current.kind === 'hub';
  }

  /** The id of the app being shown, or `null` in the hub. */
  get appId(): string | null {
    return this.current.kind === 'app' ? this.current.id : null;
  }

  /**
   * Move, then let the app arrange itself.
   *
   * The entry hook runs synchronously, before this returns, so a caller that
   * wants something more specific than the app's home — opening a named roadmap
   * straight from the landing — can simply do it afterwards and win.
   */
  private apply(next: Location, opts: { push: boolean }): void {
    const changed = !sameLocation(this.current, next);
    this.current = next;

    if (opts.push) this.writeHash(next);
    else this.normalizeHash(next);

    if (changed && next.kind === 'app') this.entryHooks.get(next.id)?.();
  }

  /**
   * Correct a hash that names somewhere other than where it landed.
   *
   * `#/decisions` and `#/nonsense` both resolve to the hub, and leaving them in
   * the bar would make the URL lie: a reload would show the hub under a route
   * that claims otherwise, and a copied link would be wrong.
   *
   * `replaceState` rather than assignment, so correcting a bad route does not
   * add a history entry the back button then has to walk through — and it does
   * not fire `hashchange`, so no guard is needed.
   *
   * An empty hash is left alone: the bare URL is already the hub, and it is
   * what the PWA's `start_url` opens.
   */
  private normalizeHash(location: Location): void {
    const current = window.location.hash;
    if (current === '') return;

    const canonical = hashFor(location);
    if (current === canonical) return;
    history.replaceState(null, '', canonical);
  }

  private writeHash(location: Location): void {
    const hash = hashFor(location);
    if (window.location.hash === hash) return;
    // Guard the listener: assigning `location.hash` fires `hashchange`, and
    // re-entering `apply` from there would run the entry hook a second time
    // and undo whatever the caller did right after navigating.
    this.writing = true;
    window.location.hash = hash;
    // `hashchange` is queued as a task, so the flag has to outlive this tick.
    setTimeout(() => (this.writing = false), 0);
  }
}

export const location = new LocationStore();
