/**
 * The slice of the File System Access API the hub uses, and the few
 * operations built on it.
 *
 * Declared here rather than taken from the DOM library because the library
 * does not carry all of it (`showDirectoryPicker`, the permission methods),
 * and because declaring only the slice lets the tests run every rule against a
 * folder in memory (`memory-fs.ts`) that a real handle could be swapped for.
 *
 * Knows no application.
 */

export type PermissionState = 'granted' | 'prompt' | 'denied';

export interface FolderWritable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
}

export interface FolderFile {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<{ text(): Promise<string> }>;
  /**
   * Chrome writes to a swap file and replaces the original on `close()`, so a
   * reader sees the old content whole or the new content whole. That is the
   * per-file atomicity `local-persistence` promises for a folder.
   */
  createWritable(): Promise<FolderWritable>;
}

export interface FolderDir {
  readonly kind: 'directory';
  readonly name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FolderDir>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FolderFile>;
  removeEntry(name: string): Promise<void>;
  values(): AsyncIterable<FolderDir | FolderFile>;
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>;
}

const isNotFound = (e: unknown) =>
  e instanceof Error && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError');

/** Whether this browser can open folders of the device at all. */
export function supportsFolders(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Ask the user for a folder. `null` when they cancel the picker.
 *
 * Must run inside a user gesture, like every call that can show a prompt.
 */
export async function pickFolder(): Promise<FolderDir | null> {
  const picker = (
    window as unknown as {
      showDirectoryPicker(options: { mode: 'readwrite' }): Promise<FolderDir>;
    }
  ).showDirectoryPicker;
  try {
    return await picker.call(window, { mode: 'readwrite' });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return null;
    throw e;
  }
}

/** A subfolder, or `null` when it does not exist and `create` was not asked for. */
export async function subfolder(
  dir: FolderDir,
  name: string,
  create = false,
): Promise<FolderDir | null> {
  try {
    return await dir.getDirectoryHandle(name, { create });
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

/** A file's text, or `null` when there is no such file. */
export async function readText(dir: FolderDir, name: string): Promise<string | null> {
  let file: FolderFile;
  try {
    file = await dir.getFileHandle(name);
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
  return (await file.getFile()).text();
}

/** Every file directly inside `dir`, by name. Subfolders are not followed. */
export async function readAll(dir: FolderDir): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for await (const entry of dir.values()) {
    if (entry.kind !== 'file') continue;
    out.set(entry.name, await (await entry.getFile()).text());
  }
  return out;
}

/** Replace a file's content whole, creating it if needed. */
export async function writeText(dir: FolderDir, name: string, text: string): Promise<void> {
  const file = await dir.getFileHandle(name, { create: true });
  const w = await file.createWritable();
  try {
    await w.write(text);
    await w.close();
  } catch (e) {
    await w.abort?.();
    throw e;
  }
}

/** Remove a file. One that is already gone is not an error. */
export async function removeFile(dir: FolderDir, name: string): Promise<void> {
  try {
    await dir.removeEntry(name);
  } catch (e) {
    if (!isNotFound(e)) throw e;
  }
}
