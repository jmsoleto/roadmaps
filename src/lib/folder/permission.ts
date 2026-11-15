/**
 * Permission over a folder (carpeta-roadmaps, D5): read and write by default,
 * read only for a folder the hub must never change (health-colector-kibana, D1).
 *
 * Two calls with different rules. `query` needs no gesture and can run at
 * boot; it reports `prompt` when the browser has not kept the permission.
 * `request` may show a prompt, so the browser only allows it inside a user
 * gesture: it is called from the click on «Conceder acceso», never on its own.
 */

import type { AccessMode, FolderDir, PermissionState } from './fs';

export async function queryPermission(
  dir: FolderDir,
  mode: AccessMode = 'readwrite',
): Promise<PermissionState> {
  // A handle without the method predates the permission model: it can be used.
  return dir.queryPermission ? dir.queryPermission({ mode }) : 'granted';
}

export async function requestPermission(
  dir: FolderDir,
  mode: AccessMode = 'readwrite',
): Promise<PermissionState> {
  return dir.requestPermission ? dir.requestPermission({ mode }) : 'granted';
}
