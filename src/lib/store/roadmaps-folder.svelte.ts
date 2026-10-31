/**
 * Connecting Roadmaps to a folder and disconnecting it (carpeta-roadmaps, D7).
 *
 * The store reads and writes through whichever backend it is given; this
 * decides which one, and runs the two flows that move between them:
 *
 * ```
 * Conectar ─▶ picker ─▶ inspectFolder
 *    ├─ rejected ────────▶ message; nothing written
 *    ├─ ready, no data ──▶ confirm → create subfolder and marker → write the
 *    │                     browser's data → read it back and compare
 *    │                        ├─ equal → remember the handle; source = folder
 *    │                        └─ not   → remember nothing; message
 *    └─ ready, data ─────▶ confirm ("you will see the folder's; yours stay in
 *                          the browser") → remember the handle → load
 * ```
 *
 * The browser's data is never written by any of this. Disconnecting goes back
 * to it exactly as it was.
 */

import { APPS, ROADMAPS_ID } from '../hub/apps';
import { inspectFolder, type Inspection } from '../folder/connect';
import { pickFolder, readAll, supportsFolders, type FolderDir } from '../folder/fs';
import { connectedName, forgetHandle, loadHandle, saveHandle } from '../folder/handles';
import { queryPermission, requestPermission } from '../folder/permission';
import { FolderBackend } from './folder-backend';
import { FORMAT, serialize } from './folder-format';
import { BrowserBackend, UnavailableBackend } from './storage';
import { store as defaultStore, type AppStore } from './app.svelte';

/** Everything that touches the browser, injectable so the flows can be tested. */
export interface FolderDeps {
  supports(): boolean;
  pick(): Promise<FolderDir | null>;
  connectedName(appId: string): string | null;
  loadHandle(appId: string): Promise<FolderDir | null>;
  saveHandle(appId: string, dir: FolderDir, label: string): Promise<void>;
  forgetHandle(appId: string): Promise<void>;
}

const browserDeps: FolderDeps = {
  supports: supportsFolders,
  pick: pickFolder,
  connectedName,
  loadHandle,
  saveHandle,
  forgetHandle,
};

/**
 * What choosing a folder led to, for the dialog to show.
 *
 * A plan is not carried out until `confirm` is called with it: the dialog
 * says what is about to happen first, which is what the spec asks of the
 * folder that already has data.
 */
export type ConnectPlan =
  | { kind: 'cancelled' }
  | { kind: 'rejected'; message: string }
  | { kind: 'dump'; folder: string; inspection: Extract<Inspection, { kind: 'ready' }> }
  | { kind: 'adopt'; folder: string; inspection: Extract<Inspection, { kind: 'ready' }> };

export type ConnectOutcome = { ok: true } | { ok: false; message: string };

const appName = (id: string) => APPS.find((a) => a.id === id)?.name ?? id;

const PERMISSION_REASON = (folder: string) =>
  `La carpeta «${folder}» sigue conectada, pero el navegador no ha conservado el permiso para usarla.`;

export class RoadmapsFolder {
  /** The connected folder's name, or `null` when Roadmaps lives in the browser. */
  folderName = $state<string | null>(null);
  /** The handle waiting for the user to grant permission, if any. */
  private waiting: FolderDir | null = null;

  constructor(
    private store: AppStore = defaultStore,
    private deps: FolderDeps = browserDeps,
  ) {}

  get supported(): boolean {
    return this.deps.supports();
  }

  /** Whether the boot can await this application: true unless a folder is remembered. */
  get startsInBrowser(): boolean {
    return this.deps.connectedName(ROADMAPS_ID) === null;
  }

  /**
   * Boot: the browser when nothing is remembered, otherwise the remembered
   * folder, if the browser kept the permission over it.
   *
   * Never prompts: there is no gesture at boot. A missing permission becomes
   * the «falta permiso» state, and `grant()` is what a click calls.
   */
  async start(): Promise<void> {
    const name = this.deps.connectedName(ROADMAPS_ID);
    if (name === null) {
      this.folderName = null;
      this.store.useBackend(new BrowserBackend());
      await this.store.init();
      return;
    }
    this.folderName = name;

    let handle: FolderDir | null = null;
    try {
      handle = await this.deps.loadHandle(ROADMAPS_ID);
    } catch {
      handle = null;
    }
    if (!handle) {
      this.store.useBackend(
        new UnavailableBackend(
          `No se encuentra la conexión con la carpeta «${name}». Desconecta y vuelve a conectarla.`,
          { cause: 'carpeta-ausente' },
        ),
      );
      await this.store.init();
      return;
    }

    let permission: Awaited<ReturnType<typeof queryPermission>>;
    try {
      permission = await queryPermission(handle);
    } catch (e) {
      // Nobody awaits this at boot when a folder is remembered, so nothing may
      // escape as a rejection: it becomes the unavailable screen, with why.
      const detail = e instanceof Error ? e.message : String(e);
      this.store.useBackend(
        new UnavailableBackend(`No se pudo comprobar el acceso a «${name}»: ${detail}`, {
          cause: 'error',
          detail,
        }),
      );
      await this.store.init();
      return;
    }
    if (permission === 'granted') {
      this.waiting = null;
      this.store.useBackend(new FolderBackend(handle));
    } else {
      this.waiting = handle;
      this.store.useBackend(new UnavailableBackend(PERMISSION_REASON(name), { cause: 'permiso' }));
    }
    await this.store.init();
  }

  /** «Conceder acceso». Must run inside the click that asked for it. */
  async grant(): Promise<boolean> {
    const handle = this.waiting;
    if (!handle) return false;
    if ((await requestPermission(handle)) !== 'granted') return false;
    this.waiting = null;
    this.store.useBackend(new FolderBackend(handle));
    await this.store.init();
    return true;
  }

  /** «Reintentar»: read the folder again, from the top. */
  async retry(): Promise<void> {
    await this.start();
  }

  /** Ask for a folder and say what connecting to it would do. Writes nothing. */
  async choose(): Promise<ConnectPlan> {
    const chosen = await this.deps.pick();
    if (!chosen) return { kind: 'cancelled' };
    const inspection = await inspectFolder(chosen, ROADMAPS_ID, FORMAT);
    switch (inspection.kind) {
      case 'foreign':
        return {
          kind: 'rejected',
          message: `La carpeta «${chosen.name}» es de ${appName(inspection.app)}. Elige la raíz del repo, o una carpeta de Roadmaps.`,
        };
      case 'not-ours':
        return {
          kind: 'rejected',
          message: `La carpeta «${inspection.folder}» no la creó Tech Lead Hub, y no se va a escribir en ella. Elige otra, o la raíz de un repo que no tenga una carpeta «roadmaps».`,
        };
      case 'future':
        return {
          kind: 'rejected',
          message: `Los roadmaps de «${chosen.name}» se guardaron con una versión más nueva de Tech Lead Hub. Actualiza la aplicación para abrirlos.`,
        };
      case 'ready':
        return {
          kind: inspection.hasData ? 'adopt' : 'dump',
          folder: chosen.name,
          inspection,
        };
    }
  }

  /** Carry out a plan the user has confirmed. */
  async confirm(plan: ConnectPlan): Promise<ConnectOutcome> {
    if (plan.kind !== 'dump' && plan.kind !== 'adopt') return { ok: false, message: '' };
    if (this.store.source !== 'browser' || this.store.unavailable) {
      return { ok: false, message: 'Roadmaps ya está conectado a una carpeta.' };
    }

    // Land in the browser whatever was still waiting for the debounce: it
    // belongs there, and the browser is what disconnecting will go back to.
    await this.store.flush();

    const failed = (e: unknown): ConnectOutcome => ({
      ok: false,
      message: `No se pudo escribir en la carpeta: ${e instanceof Error ? e.message : String(e)}. Roadmaps sigue en el navegador, con todo.`,
    });

    let dir: FolderDir;
    try {
      dir = await plan.inspection.prepare();
    } catch (e) {
      return failed(e);
    }
    const backend = new FolderBackend(dir);

    if (plan.kind === 'dump') {
      const data = $state.snapshot(this.store.data);
      try {
        await backend.save(data);
        const back = await readAll(dir);
        const written = serialize(data);
        const mismatch = [...written].find(([name, text]) => back.get(name) !== text);
        if (mismatch) {
          return {
            ok: false,
            message: `Al releer «${dir.name}/${mismatch[0]}» no coincide con lo escrito. Roadmaps sigue en el navegador, con todo; revisa la carpeta con git antes de volver a intentarlo.`,
          };
        }
      } catch (e) {
        return failed(e);
      }
    }

    // Named as the user would find it: the repo, then the subfolder, unless
    // the subfolder itself was what they chose.
    const label = plan.folder === dir.name ? dir.name : `${plan.folder}/${dir.name}`;
    await this.deps.saveHandle(ROADMAPS_ID, dir, label);
    this.folderName = label;
    this.waiting = null;
    this.store.useBackend(backend);
    await this.store.init();
    return { ok: true };
  }

  /**
   * Go back to the browser's data, as it was before connecting.
   *
   * Pending writes to the folder finish first: they are the user's work and
   * the folder is where they belong. The folder itself is not touched.
   */
  async disconnect(): Promise<void> {
    if (this.store.source === 'folder') {
      await this.store.flush();
      await this.store.backend.settled();
    }
    await this.deps.forgetHandle(ROADMAPS_ID);
    this.folderName = null;
    this.waiting = null;
    this.store.useBackend(new BrowserBackend());
    await this.store.init();
  }
}

export const roadmapsFolder = new RoadmapsFolder();
