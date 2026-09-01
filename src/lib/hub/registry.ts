/**
 * Where the app definitions meet the stores: the list the shell iterates.
 *
 * This is the only file that knows both "what an application is" and "what
 * Roadmaps is". `apps.ts` stays pure data and the shell — the landing, the
 * card, `App.svelte`, the topbar — stays free of any domain, so registering a
 * third app means adding a definition there and a branch here, and nothing
 * else. That promise used to hold for the landing and quietly fail for the
 * shell; since D1 it holds for both.
 */

import { store } from '../store/app.svelte';
import { ui } from '../store/ui.svelte';
import { theme } from '../theme/theme.svelte';
import { todayIso } from '../time/timeline';
import { API_ID, APPS, DECISIONS_ID, ROADMAPS_ID, type AppDefinition } from './apps';
import { decisions } from '../decisions/store.svelte';
import { decisionsUi } from '../decisions/ui.svelte';
import { decisionsSummary } from '../decisions/summary';
import { exportDecisions, parseDecisionsImport } from '../decisions/io';
import { apiContracts } from '../api/store.svelte';
import { apiUi } from '../api/ui.svelte';
import { apiSummary } from '../api/summary';
import { location } from './location.svelte';
import { roadmapsSummary } from './roadmaps-summary';
import { usage } from './usage.svelte';
import { downloadText } from './download';
import type { AppAction, AppSummary, HubApp } from './types';
import RoadmapsApp from '../components/RoadmapsApp.svelte';
import RoadmapSwitcher from '../components/RoadmapSwitcher.svelte';
import DecisionsApp from '../components/decisions/DecisionsApp.svelte';
import ApiApp from '../components/api/ApiApp.svelte';
import ContractSwitcher from '../components/api/ContractSwitcher.svelte';

/** Roadmaps' own home, run whenever the app is entered by any route. */
function roadmapsHome(): void {
  store.toggleMetaView(true);
}

/**
 * Decisions' own home: the open decisions, nothing selected.
 *
 * Same rule as Roadmaps — arriving at an app puts it back at its start — and
 * the same escape hatch: a caller naming one decision runs after this and wins.
 */
/**
 * API Hub's own home: the contract you were last working on.
 *
 * The other two applications reset to a neutral view on entry — "Todos", the
 * open decisions — and this one deliberately does not. `hub-shell` lets each
 * application define its own start, and the start of a tool used while
 * conducting a meeting is where you left off. What the hook does clear is the
 * transient interface: a half-typed new contract or a delete awaiting
 * confirmation has no business surviving a trip through the hub.
 */
function apiHome(): void {
  apiUi.closeCreate();
  apiUi.cancelDelete();
}

function decisionsHome(): void {
  decisionsUi.setFilter('abiertas');
  decisionsUi.setProject('');
  decisions.select(null);
}

/**
 * Wire the entry hooks.
 *
 * Called from `main.ts` before `location.init()`, so that a session restored
 * straight into `#/roadmaps` lands on "Todos" just as a click on its card does.
 */
export function initHub(): void {
  location.onEnter(ROADMAPS_ID, roadmapsHome);
  location.onEnter(DECISIONS_ID, decisionsHome);
  location.onEnter(API_ID, apiHome);
}

function roadmapsSummaryNow(): AppSummary {
  const roadmaps = store.data.roadmaps;
  return roadmapsSummary(
    roadmaps,
    usage.live(
      ROADMAPS_ID,
      roadmaps.map((r) => r.id),
    ),
    todayIso(),
    (slot) => theme.slotColor(slot),
  );
}

function decisionsSummaryNow(): AppSummary {
  return decisionsSummary(decisions.all, todayIso());
}

function apiSummaryNow(): AppSummary {
  const contracts = apiContracts.contracts;
  return apiSummary(
    contracts,
    usage.live(
      API_ID,
      contracts.map((c) => c.id),
    ),
    (slot) => theme.slotColor(slot),
  );
}

function openContract(id: string): void {
  // Same ordering as the other two: entering runs the entry hook and lands on
  // the app's home, so naming one has to come after it to win.
  location.goApp(API_ID);
  apiContracts.setOpen(id);
  usage.touch(API_ID, id);
}

function apiActions(): AppAction[] {
  // Nothing may be created while the store is down, or before it has answered:
  // a contract written into a document we have not read yet would be lost the
  // moment the real one arrives.
  const down = apiContracts.unavailable !== null || !apiContracts.ready;
  return [
    {
      kind: 'button',
      label: '+ nuevo contrato',
      disabled: down,
      run: () => {
        apiContracts.setOpen(null);
        apiUi.openCreate();
      },
    },
    {
      kind: 'button',
      label: '↑ exportar',
      title: 'exportar el contrato abierto',
      // Nothing to export without a contract open, and the export panel reads
      // the open one.
      disabled: down || apiContracts.open === null,
      run: () => apiUi.openExport(),
    },
  ];
}

function openDecision(id: string): void {
  // Same ordering as Roadmaps: entering runs the entry hook and lands on the
  // app's home, so naming one has to come after it to win.
  location.goApp(DECISIONS_ID);
  decisionsUi.setFilter('todas');
  decisions.select(id);
}

function openRoadmap(id: string): void {
  // Order matters: entering the app runs its entry hook and lands on "Todos",
  // so naming a roadmap has to come after it to win.
  location.goApp(ROADMAPS_ID);
  store.setActive(id);
  usage.touch(ROADMAPS_ID, id);
}

const JSON_FILES = 'application/json,.json';

function exportActiveRoadmap(): void {
  const json = store.exportActive();
  if (!json) return;
  const name = (store.activeRoadmap?.name ?? 'roadmap').replace(/[^\w.-]+/g, '_');
  downloadText(`${name}.json`, json);
}

function roadmapsActions(): AppAction[] {
  return [
    { kind: 'button', label: '+ nuevo', run: () => ui.openNewRoadmap() },
    {
      kind: 'file',
      label: '↓ importar',
      title: 'importar JSON',
      accept: JSON_FILES,
      run: (text) => store.importFromText(text),
    },
    {
      kind: 'button',
      label: '↑ exportar',
      title: 'exportar roadmap activo',
      disabled: !store.activeRoadmap,
      run: exportActiveRoadmap,
    },
  ];
}

function exportDecisionsFile(): void {
  // The proxied array is fine here: `exportDecisions` serialises with
  // `JSON.stringify`, which reads straight through a `$state` proxy. It is
  // `structuredClone` that cannot, and that one lives in the storage seam.
  downloadText('decisiones.json', exportDecisions(decisions.all));
}

function decisionsActions(): AppAction[] {
  // With the store down, nothing may be created or changed: offering a control
  // that would silently do nothing is worse than not offering it.
  const down = decisions.unavailable !== null;
  return [
    { kind: 'button', label: '+ capturar', disabled: down, run: () => decisionsUi.openCapture() },
    {
      kind: 'file',
      label: '↓ importar',
      title: 'importar decisiones JSON',
      disabled: down,
      accept: JSON_FILES,
      run: (text) => decisions.append(parseDecisionsImport(text)),
    },
    {
      kind: 'button',
      label: '↑ exportar',
      title: 'exportar decisiones',
      disabled: decisions.all.length === 0,
      run: exportDecisionsFile,
    },
  ];
}

/** Behaviour for the apps that have any. Everything absent here is not live. */
type Behaviour = Pick<
  HubApp,
  'summary' | 'open' | 'create' | 'openRow' | 'root' | 'context' | 'actions'
>;

const BEHAVIOUR: Record<string, Partial<Behaviour>> = {
  [ROADMAPS_ID]: {
    summary: roadmapsSummaryNow,
    open: () => location.goApp(ROADMAPS_ID),
    create: () => {
      location.goApp(ROADMAPS_ID);
      ui.openNewRoadmap();
    },
    openRow: openRoadmap,
    root: RoadmapsApp,
    context: RoadmapSwitcher,
    actions: roadmapsActions,
  },
  [DECISIONS_ID]: {
    summary: decisionsSummaryNow,
    open: () => location.goApp(DECISIONS_ID),
    create: () => {
      location.goApp(DECISIONS_ID);
      decisionsUi.openCapture();
    },
    openRow: openDecision,
    root: DecisionsApp,
    // No second breadcrumb level: the open decision shows in the list, not in
    // the bar. The topbar fills the gap itself.
    context: null,
    actions: decisionsActions,
  },
  [API_ID]: {
    summary: apiSummaryNow,
    open: () => location.goApp(API_ID),
    create: () => {
      location.goApp(API_ID);
      // The form, not the contract: the store may still be opening, and writing
      // into a document that has not been read yet would lose it.
      apiUi.openCreate();
    },
    openRow: openContract,
    root: ApiApp,
    context: ContractSwitcher,
    actions: apiActions,
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
    root: behaviour?.root ?? null,
    context: behaviour?.context ?? null,
    actions: behaviour?.actions ?? null,
  };
}

/** The registry the shell and the landing read. */
export function hubApps(): HubApp[] {
  return APPS.map(compose);
}

export function hubApp(id: string): HubApp | undefined {
  const def = APPS.find((a) => a.id === id);
  return def ? compose(def) : undefined;
}
