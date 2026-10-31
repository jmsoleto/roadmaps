/**
 * What a chosen folder is to an application, before anything is written
 * (carpeta-roadmaps, D1 and D7).
 *
 * The user is asked for the root of the repo, and the application owns a
 * subfolder named after its id, marked as its own. So a chosen folder can be:
 *
 * - **the owned subfolder itself**, chosen directly: used as it is;
 * - **a root that has the owned subfolder**: that subfolder is used;
 * - **a root without it**: usable, and the subfolder is created on `prepare()`,
 *   which is only called once the user has confirmed;
 * - **something to refuse**: another application's folder, a subfolder by our
 *   name that we did not create, or a format newer than this version reads.
 *
 * Nothing in here writes, except `prepare()`.
 *
 * Knows no application: the id and the format come from the caller.
 */

import { readText, subfolder, writeText, type FolderDir } from './fs';
import { MARKER_FILE, markerText, readMarker } from './marker';

export type Inspection =
  | {
      kind: 'ready';
      /** True when the owned subfolder already exists and is marked: it has the application's data. */
      hasData: boolean;
      /** The owned subfolder, creating it and its marker if it does not exist. */
      prepare(): Promise<FolderDir>;
    }
  | { kind: 'foreign'; app: string }
  | { kind: 'not-ours'; folder: string }
  | { kind: 'future'; format: number };

export async function inspectFolder(
  chosen: FolderDir,
  appId: string,
  format: number,
): Promise<Inspection> {
  // The chosen folder may be an application's subfolder, ours or not.
  const own = await readText(chosen, MARKER_FILE);
  if (own !== null) {
    const m = readMarker(own, appId, format);
    if (m.kind === 'ours') return { kind: 'ready', hasData: true, prepare: async () => chosen };
    if (m.kind === 'foreign' || m.kind === 'future') return m;
    return { kind: 'not-ours', folder: chosen.name };
  }

  // Otherwise it is a root, and what matters is the subfolder by our name.
  const sub = await subfolder(chosen, appId);
  if (sub) {
    const m = readMarker(await readText(sub, MARKER_FILE), appId, format);
    if (m.kind === 'ours') return { kind: 'ready', hasData: true, prepare: async () => sub };
    if (m.kind === 'foreign' || m.kind === 'future') return m;
    return { kind: 'not-ours', folder: `${chosen.name}/${appId}` };
  }

  return {
    kind: 'ready',
    hasData: false,
    prepare: async () => {
      const created = (await subfolder(chosen, appId, true))!;
      await writeText(created, MARKER_FILE, markerText(appId, format));
      return created;
    },
  };
}
