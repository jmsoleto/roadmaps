/**
 * Reactive wrapper over the usage preferences (D6).
 *
 * Rides the existing `getPref`/`setPref` seam, exactly like `theme.svelte.ts`,
 * so `Storage` did not have to grow anything for this.
 *
 * The recent list is **per application**. `usage.ts` was already written that
 * way — it is entries of `{ id, at }` and knows nothing about roadmaps — but
 * the wiring here held a single list, which made "recently opened" mean
 * "recently opened in Roadmaps". API Hub is the second application to need one,
 * and two applications writing the same key would blend their lists.
 */

import { createStorage, type Storage } from '../store/storage';
import { APPS } from './apps';
import {
  liveRecent,
  parseRecent,
  parseStamp,
  serializeRecent,
  touchRecent,
  type RecentEntry,
} from './usage';

/**
 * Where one application's openings are kept.
 *
 * Roadmaps keeps the unscoped key it has been writing since before there was a
 * second application: rescoping it would silently empty the list of anyone who
 * updates, and this is a preference nobody would think to back up.
 */
const PREF_RECENT = (appId: string) =>
  appId === LEGACY_APP ? 'hub.recent' : `hub.recent:${appId}`;
const LEGACY_APP = 'roadmaps';
const PREF_LAST_SEEN = 'hub.lastSeen';

export class UsageStore {
  private storage: Storage;

  /** Openings by application id. Absent means "none recorded". */
  recent = $state<Record<string, RecentEntry[]>>({});
  /**
   * When the previous session was, or `null` on a first run.
   *
   * Frozen at boot: it is read *before* this session's stamp is written, or it
   * would always report "now". It belongs to the container, not to any
   * application, so it is not scoped.
   */
  lastSeen = $state<number | null>(null);
  ready = $state<boolean>(false);

  constructor(storage: Storage = createStorage()) {
    this.storage = storage;
  }

  async init(now: number = Date.now()): Promise<void> {
    const lists: Record<string, RecentEntry[]> = {};
    for (const app of APPS) {
      lists[app.id] = parseRecent(await this.storage.getPref(PREF_RECENT(app.id)));
    }
    this.recent = lists;
    // Read before write. The order is the whole requirement.
    this.lastSeen = parseStamp(await this.storage.getPref(PREF_LAST_SEEN));
    await this.storage.setPref(PREF_LAST_SEEN, String(now));
    this.ready = true;
  }

  /** Note that something was opened, whichever way it was opened. */
  touch(appId: string, id: string, at: number = Date.now()): void {
    const next = touchRecent(this.recent[appId] ?? [], id, at);
    this.recent = { ...this.recent, [appId]: next };
    void this.storage.setPref(PREF_RECENT(appId), serializeRecent(next));
  }

  /** Recent openings for one application, minus the ones whose target is gone. */
  live(appId: string, liveIds: Iterable<string>): RecentEntry[] {
    return liveRecent(this.recent[appId] ?? [], liveIds);
  }
}

export const usage = new UsageStore();
