/**
 * Links Hub as files in a folder (carpeta-links, D1).
 *
 * ```
 * links/
 * ├─ tech-lead-hub.json   the marker: { "app": "links", "format": 1 }
 * ├─ order.json           { "areas": ["area-…", …] }
 * └─ area-….json          { "id", "name", "links": [ … ] }, one per area
 * ```
 *
 * A link does not change area, and the area is already the unit of export, so
 * an area is a file. Its links go inside it **without `areaId`**: which area a
 * link belongs to is said by the file it is in, so a file cannot contradict
 * itself. Reading gives every link back the id of its file's area.
 *
 * The same canonical JSON as API Hub: known fields first, anything else after,
 * nothing dropped.
 */

import {
  attempt,
  canonicalizer,
  inOrder,
  isObject,
  json,
  layout,
  units,
  Unreadable,
} from '../folder/canonical';
import type { FileFormat, FileMap } from '../folder/file-sync';
import { MARKER_FILE, markerText } from '../folder/marker';
import type { Area, Link, LinksData } from './model';

export const APP_ID = 'links';
export const FORMAT = 1;
export const ORDER_FILE = 'order.json';

type Kind = 'area' | 'link';

const { text } = canonicalizer<Kind>({
  order: {
    area: ['id', 'name', 'links'],
    link: ['id', 'name', 'description', 'url', 'monogram', 'from', 'to', 'wide'],
  },
  holds: { area: { links: 'link' } },
  // The area of a link is its file's; never written inside it.
  viewKeys: new Set(['areaId']),
});

/**
 * The file an area lives in: its id as it is, which the app always makes
 * `area-<digits>-<hex>`. Anything else is spelled in hex behind `area-x`, which
 * no id the app makes can start with.
 */
export function fileForArea(id: string): string {
  if (/^area-[A-Za-z0-9_-]+$/.test(id) && !id.startsWith('area-x')) return `${id}.json`;
  const hex = [...new TextEncoder().encode(id)].map((b) => b.toString(16).padStart(2, '0'));
  return `area-x${hex.join('')}.json`;
}

export const isAreaFile = (name: string): boolean => /^area-[A-Za-z0-9_-]+\.json$/.test(name);

type AreaFile = Area & { links: Omit<Link, 'areaId'>[] };

export const LINKS_FORMAT: FileFormat<LinksData> = {
  owns: (name) => name === MARKER_FILE || name === ORDER_FILE || isAreaFile(name),
  serialize(data: LinksData): FileMap {
    const files: FileMap = new Map();
    files.set(MARKER_FILE, markerText(APP_ID, FORMAT));
    files.set(ORDER_FILE, layout({ areas: data.areas.map((a) => a.id) }));
    for (const area of data.areas) {
      const file: AreaFile = {
        ...area,
        links: data.links.filter((l) => l.areaId === area.id),
      };
      files.set(fileForArea(area.id), text(file, 'area'));
    }
    return files;
  },
  parse: (files) =>
    attempt(() => {
      const order = json(files, ORDER_FILE);
      if (order !== undefined && (!isObject(order) || !Array.isArray(order.areas))) {
        throw new Unreadable(ORDER_FILE);
      }
      const byId = units<AreaFile>(
        files,
        isAreaFile,
        (v) =>
          typeof v.name === 'string' &&
          Array.isArray(v.links) &&
          v.links.every((l) => isObject(l) && typeof l.id === 'string'),
      );
      const ordered = inOrder(order ? (order.areas as unknown[]) : [], byId);
      const areas: Area[] = [];
      const links: Link[] = [];
      const seen = new Set<string>();
      for (const file of ordered) {
        const { links: own, ...area } = file;
        areas.push(area);
        for (const link of own) {
          // The same link in two areas: one would vanish on the next save.
          if (seen.has(link.id)) throw new Unreadable(fileForArea(file.id));
          seen.add(link.id);
          links.push({ ...link, areaId: file.id } as Link);
        }
      }
      return { areas, links };
    }),
  isEmpty: (d) => d.areas.length === 0 && d.links.length === 0,
  deletable: isAreaFile,
};
