/**
 * Reactive wrapper over the usage preferences (D6).
 *
 * Rides the existing `getPref`/`setPref` seam, exactly like `theme.svelte.ts`,
 * so `Storage` did not have to grow anything for this.
 */

import { createStorage, type Storage } from '../store/storage';
import {
  liveRecent,
  parseRecent,
  parseStamp,
  serializeRecent,
  touchRecent,
  type RecentEntry,
} from './usage';

const PREF_RECENT = 'hub.recent';
const PREF_LAST_SEEN = 'hub.lastSeen';

export class UsageStore {
  private storage: Storage;

  recent = $state<RecentEntry[]>([]);
  /**
   * When the previous session was, or `null` on a first run.
   *
   * Frozen at boot: it is read *before* this session's stamp is written, or it
   * would always report "now".
   */
  lastSeen = $state<number | null>(null);
  ready = $state<boolean>(false);

  constructor(storage: Storage = createStorage()) {
    this.storage = storage;
  }

  async init(now: number = Date.now()): Promise<void> {
    this.recent = parseRecent(await this.storage.getPref(PREF_RECENT));
    // Read before write. The order is the whole requirement.
    this.lastSeen = parseStamp(await this.storage.getPref(PREF_LAST_SEEN));
    await this.storage.setPref(PREF_LAST_SEEN, String(now));
    this.ready = true;
  }

  /** Note that a roadmap was opened, whichever way it was opened. */
  touch(id: string, at: number = Date.now()): void {
    this.recent = touchRecent(this.recent, id, at);
    void this.storage.setPref(PREF_RECENT, serializeRecent(this.recent));
  }

  /** Recent openings, minus the ones whose roadmap is gone. */
  live(liveIds: Iterable<string>): RecentEntry[] {
    return liveRecent(this.recent, liveIds);
  }
}

export const usage = new UsageStore();
