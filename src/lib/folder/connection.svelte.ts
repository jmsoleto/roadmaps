/**
 * Connecting an application to a folder and disconnecting it
 * (carpeta-roadmaps D7, generalised in carpeta-api-hub D3).
 *
 * An application keeps one or more documents, each in its own store. Each
 * store is a **participant**: it knows how to read its data from the browser,
 * from a folder, or to show why it cannot. The connection decides which, for
 * all of them at once, and runs the two flows that move between them:
 *
 * ```
 * Conectar ─▶ picker ─▶ inspectFolder
 *    ├─ rejected ────────▶ message; nothing written
 *    ├─ ready, no data ──▶ confirm → create subfolder and marker → write every
 *    │                     participant's browser data → read it back, compare
 *    │                        ├─ all equal → remember the handle; folder
 *    │                        └─ any not   → remember nothing; message
 *    └─ ready, data ─────▶ confirm ("you will see the folder's; yours stay in
 *                          the browser") → remember the handle → load
 * ```
 *
 * The browser's data is never written by any of this. Disconnecting goes back
 * to it exactly as it was.
 *
 * Knows no application: its id, its names and its stores come from the caller.
 */

import { inspectFolder, type Inspection } from './connect';
import type { FileMap, Unavailability } from './file-sync';
import { pickFolder, readAll, supportsFolders, type FolderDir, type PermissionState } from './fs';
import { connectedName, forgetHandle, loadHandle, saveHandle } from './handles';
import { queryPermission, requestPermission } from './permission';

/** Everything that touches the browser, injectable so the flows can be tested. */
export interface FolderDeps {
  supports(): boolean;
  pick(): Promise<FolderDir | null>;
  connectedName(appId: string): string | null;
  loadHandle(appId: string): Promise<FolderDir | null>;
  saveHandle(appId: string, dir: FolderDir, label: string): Promise<void>;
  forgetHandle(appId: string): Promise<void>;
}

export const browserDeps: FolderDeps = {
  supports: supportsFolders,
  pick: pickFolder,
  connectedName,
  loadHandle,
  saveHandle,
  forgetHandle,
};

/** One document of the application, as the connection sees it. */
export interface Participant {
  /** Its data is in the browser and could be read: what connecting starts from. */
  readonly inBrowser: boolean;
  /** Its data is in a folder (readable or not). */
  readonly inFolder: boolean;
  /** Write whatever is pending, and wait until it is written. */
  flush(): Promise<void>;
  /** Read from the browser. */
  browser(): Promise<void>;
  /** Read from the folder. */
  folder(dir: FolderDir): Promise<void>;
  /** Show that it cannot be read, and why. */
  unavailable(reason: string, why: Unavailability): Promise<void>;
  /** Write its current data into the folder; returns the files that should now be there. */
  dump(dir: FolderDir): Promise<FileMap>;
}

export interface ConnectionConfig {
  /** The application's id: the subfolder's name and the marker's `app`. */
  appId: string;
  /** The format version the application writes. */
  format: number;
  /** The application as named in a sentence, e.g. «Roadmaps». */
  appName: string;
  /** Its data as named in a sentence, e.g. «los roadmaps». */
  dataNoun: string;
  /** Another application's name, from its id, for refusing its folder. */
  nameOf(appId: string): string;
}

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

export class FolderConnection {
  /** The connected folder's name, or `null` when the application lives in the browser. */
  folderName = $state<string | null>(null);
  /** The handle waiting for the user to grant permission, if any. */
  private waiting: FolderDir | null = null;

  constructor(
    readonly config: ConnectionConfig,
    private participants: Participant[],
    private deps: FolderDeps = browserDeps,
  ) {}

  get supported(): boolean {
    return this.deps.supports();
  }

  /** Whether the boot can await this application: true unless a folder is remembered. */
  get startsInBrowser(): boolean {
    return this.deps.connectedName(this.config.appId) === null;
  }

  private async all(fn: (p: Participant) => Promise<unknown>): Promise<void> {
    await Promise.all(this.participants.map(fn));
  }

  private unavailableAll(reason: string, why: Unavailability): Promise<void> {
    return this.all((p) => p.unavailable(reason, why));
  }

  /**
   * Boot: the browser when nothing is remembered, otherwise the remembered
   * folder, if the browser kept the permission over it.
   *
   * Never prompts: there is no gesture at boot. A missing permission becomes
   * the «falta permiso» state, and `grant()` is what a click calls. One
   * question about the permission serves every participant: it is one folder.
   */
  async start(): Promise<void> {
    const name = this.deps.connectedName(this.config.appId);
    if (name === null) {
      this.folderName = null;
      await this.all((p) => p.browser());
      return;
    }
    this.folderName = name;

    let handle: FolderDir | null = null;
    try {
      handle = await this.deps.loadHandle(this.config.appId);
    } catch {
      handle = null;
    }
    if (!handle) {
      await this.unavailableAll(
        `No se encuentra la conexión con la carpeta «${name}». Desconecta y vuelve a conectarla.`,
        { cause: 'carpeta-ausente' },
      );
      return;
    }

    let permission: PermissionState;
    try {
      permission = await queryPermission(handle);
    } catch (e) {
      // Nobody awaits this at boot when a folder is remembered, so nothing may
      // escape as a rejection: it becomes the unavailable screen, with why.
      const detail = e instanceof Error ? e.message : String(e);
      await this.unavailableAll(`No se pudo comprobar el acceso a «${name}»: ${detail}`, {
        cause: 'error',
        detail,
      });
      return;
    }
    if (permission === 'granted') {
      this.waiting = null;
      const dir = handle;
      await this.all((p) => p.folder(dir));
    } else {
      this.waiting = handle;
      await this.unavailableAll(
        `La carpeta «${name}» sigue conectada, pero el navegador no ha conservado el permiso para usarla.`,
        { cause: 'permiso' },
      );
    }
  }

  /** «Conceder acceso». Must run inside the click that asked for it. */
  async grant(): Promise<boolean> {
    const handle = this.waiting;
    if (!handle) return false;
    if ((await requestPermission(handle)) !== 'granted') return false;
    this.waiting = null;
    await this.all((p) => p.folder(handle));
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
    const { appId, appName, dataNoun, format } = this.config;
    const inspection = await inspectFolder(chosen, appId, format);
    switch (inspection.kind) {
      case 'foreign':
        return {
          kind: 'rejected',
          message: `La carpeta «${chosen.name}» es de ${this.config.nameOf(inspection.app)}. Elige la raíz del repo, o una carpeta de ${appName}.`,
        };
      case 'not-ours':
        return {
          kind: 'rejected',
          message: `La carpeta «${inspection.folder}» no la creó Tech Lead Hub, y no se va a escribir en ella. Elige otra, o la raíz de un repo que no tenga una carpeta «${appId}».`,
        };
      case 'future':
        return {
          kind: 'rejected',
          message: `${capitalize(dataNoun)} de «${chosen.name}» se guardaron con una versión más nueva de Tech Lead Hub. Actualiza la aplicación para abrirlos.`,
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
    const { appId, appName } = this.config;
    if (this.participants.some((p) => !p.inBrowser)) {
      return { ok: false, message: `${appName} ya está conectado a una carpeta.` };
    }

    // Land in the browser whatever was still waiting for the debounce: it
    // belongs there, and the browser is what disconnecting will go back to.
    await this.all((p) => p.flush());

    const failed = (e: unknown): ConnectOutcome => ({
      ok: false,
      message: `No se pudo escribir en la carpeta: ${e instanceof Error ? e.message : String(e)}. ${appName} sigue en el navegador, con todo.`,
    });

    let dir: FolderDir;
    try {
      dir = await plan.inspection.prepare();
    } catch (e) {
      return failed(e);
    }

    if (plan.kind === 'dump') {
      try {
        // One after another: the participants share the folder, and a failure
        // in any of them must leave all of them in the browser.
        const written: FileMap = new Map();
        for (const p of this.participants) {
          for (const [name, text] of await p.dump(dir)) written.set(name, text);
        }
        const back = await readAll(dir);
        const mismatch = [...written].find(([name, text]) => back.get(name) !== text);
        if (mismatch) {
          return {
            ok: false,
            message: `Al releer «${dir.name}/${mismatch[0]}» no coincide con lo escrito. ${appName} sigue en el navegador, con todo; revisa la carpeta con git antes de volver a intentarlo.`,
          };
        }
      } catch (e) {
        return failed(e);
      }
    }

    // Named as the user would find it: the repo, then the subfolder, unless
    // the subfolder itself was what they chose.
    const label = plan.folder === dir.name ? dir.name : `${plan.folder}/${dir.name}`;
    await this.deps.saveHandle(appId, dir, label);
    this.folderName = label;
    this.waiting = null;
    await this.all((p) => p.folder(dir));
    return { ok: true };
  }

  /**
   * Go back to the browser's data, as it was before connecting.
   *
   * Pending writes to the folder finish first: they are the user's work and
   * the folder is where they belong. The folder itself is not touched.
   */
  async disconnect(): Promise<void> {
    await this.all(async (p) => {
      if (p.inFolder) await p.flush();
    });
    await this.deps.forgetHandle(this.config.appId);
    this.folderName = null;
    this.waiting = null;
    await this.all((p) => p.browser());
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
