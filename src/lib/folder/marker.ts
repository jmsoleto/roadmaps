/**
 * The file that makes a folder belong to one application of the hub.
 *
 * Every application connected to a folder writes the same file, with its own
 * id, in the subfolder it owns. It is the only thing that makes a folder
 * "ours" (carpeta-roadmaps, D1), and it does three jobs: recognise the owned
 * subfolder when it is chosen directly, refuse another application's folder by
 * name, and refuse a format newer than this version can read.
 *
 * Knows no application: the id and the format come from the caller.
 */

export const MARKER_FILE = 'tech-lead-hub.json';

export type MarkerReading =
  | { kind: 'ours' }
  | { kind: 'foreign'; app: string }
  | { kind: 'not-ours' }
  | { kind: 'future'; format: number };

export function markerText(app: string, format: number): string {
  return JSON.stringify({ app, format }, null, 2) + '\n';
}

/** What a marker says about its folder, for application `app` reading up to `format`. `null` is no marker. */
export function readMarker(raw: string | null, app: string, format: number): MarkerReading {
  if (raw === null) return { kind: 'not-ours' };
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return { kind: 'not-ours' };
  }
  if (!v || typeof v !== 'object') return { kind: 'not-ours' };
  const m = v as { app?: unknown; format?: unknown };
  if (typeof m.app !== 'string' || typeof m.format !== 'number') return { kind: 'not-ours' };
  if (m.app !== app) return { kind: 'foreign', app: m.app };
  if (m.format > format) return { kind: 'future', format: m.format };
  return { kind: 'ours' };
}
