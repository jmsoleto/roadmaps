/**
 * Where the app definitions meet the stores: the list the landing iterates.
 *
 * This is the only file that knows both "what an application is" and "what
 * Roadmaps is". `apps.ts` stays pure data and `HubLanding.svelte` stays free of
 * any domain, so registering a third app means adding a definition there and a
 * branch here — never touching the landing or the card.
 */

import { store } from '../store/app.svelte';
import { ui } from '../store/ui.svelte';
import { theme } from '../theme/theme.svelte';
import { todayIso } from '../time/timeline';
import { APPS, ROADMAPS_ID, type AppDefinition } from './apps';
import { location } from './location.svelte';
import { roadmapsSummary } from './roadmaps-summary';
import { usage } from './usage.svelte';
import type { AppSummary, HubApp } from './types';

/** Roadmaps' own home, run whenever the app is entered by any route. */
function roadmapsHome(): void {
  store.toggleMetaView(true);
}

/**
 * Wire the entry hooks.
 *
 * Called from `main.ts` before `location.init()`, so that a session restored
 * straight into `#/roadmaps` lands on "Todos" just as a click on its card does.
 */
export function initHub(): void {
  location.onEnter(ROADMAPS_ID, roadmapsHome);
}

function roadmapsSummaryNow(): AppSummary {
  const roadmaps = store.data.roadmaps;
  return roadmapsSummary(roadmaps, usage.live(roadmaps.map((r) => r.id)), todayIso(), (slot) =>
    theme.slotColor(slot),
  );
}

function openRoadmap(id: string): void {
  // Order matters: entering the app runs its entry hook and lands on "Todos",
  // so naming a roadmap has to come after it to win.
  location.goApp(ROADMAPS_ID);
  store.setActive(id);
  usage.touch(id);
}

/** Behaviour for the apps that have any. Everything absent here is not live. */
const BEHAVIOUR: Record<string, Pick<HubApp, 'summary' | 'open' | 'create' | 'openRow'>> = {
  [ROADMAPS_ID]: {
    summary: roadmapsSummaryNow,
    open: () => location.goApp(ROADMAPS_ID),
    create: () => {
      location.goApp(ROADMAPS_ID);
      ui.openNewRoadmap();
    },
    openRow: openRoadmap,
  },
};

function compose(def: AppDefinition): HubApp {
  const behaviour = BEHAVIOUR[def.id];
  return {
    ...def,
    summary: behaviour?.summary ?? null,
    open: behaviour?.open ?? null,
    create: behaviour?.create ?? null,
    openRow: behaviour?.openRow ?? null,
  };
}

/** The registry the landing and the switcher read. */
export function hubApps(): HubApp[] {
  return APPS.map(compose);
}

export function hubApp(id: string): HubApp | undefined {
  const def = APPS.find((a) => a.id === id);
  return def ? compose(def) : undefined;
}
