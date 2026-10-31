/**
 * Read and write permission over a folder (carpeta-roadmaps, D5).
 *
 * Two calls with different rules. `query` needs no gesture and can run at
 * boot; it reports `prompt` when the browser has not kept the permission.
 * `request` may show a prompt, so the browser only allows it inside a user
 * gesture: it is called from the click on «Conceder acceso», never on its own.
 */

import type { FolderDir, PermissionState } from './fs';

const MODE = { mode: 'readwrite' } as const;

export async function queryPermission(dir: FolderDir): Promise<PermissionState> {
  // A handle without the method predates the permission model: it can be used.
  return dir.queryPermission ? dir.queryPermission(MODE) : 'granted';
}

export async function requestPermission(dir: FolderDir): Promise<PermissionState> {
  return dir.requestPermission ? dir.requestPermission(MODE) : 'granted';
}
