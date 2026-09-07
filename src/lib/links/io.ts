/**
 * Export/import of **one area** of links as JSON.
 *
 * The unit is the area and not the catalogue, which is the same call Roadmaps
 * makes with the active roadmap and API Hub with the open contract: it is what
 * the screen already has open, and it is what actually gets shared — what you
 * hand the colleague joining the rotation is "the payments links", not your
 * whole idea of how the shift is organised.
 *
 * That choice makes this the simplest of the four documents. Decisions remaps
 * options, recommendations and resolutions; API Hub remaps model references
 * inside trees. Here there is nothing to point at: a document is one area, so
 * where each link belongs is already said by being in the file. Links carry no
 * `areaId`, and nothing carries an `id` — you cannot hand-write a two-area file
 * by accident, because the format has nowhere to put the second one.
 *
 * The reading of a link is **not** repeated here: it is `normalize`, the same
 * function the store uses on load. That is what keeps "what a usable link is"
 * in one place, so a document exported under today's rules still comes in when
 * they change (D2).
 */

import { uid } from '../util/id';
import { foreignDocumentMessage } from '../hub/documents';
import { LINKS_ID } from '../hub/apps';
import { normalize, type Area, type Link } from './model';

/** Marks the document as ours, and as *links* rather than any of the other three. */
const KIND = 'tech-lead-hub/links';

/**
 * The document's own version, independent of the store's `links:appdata:v1`.
 *
 * A file that left this machine is no longer governed by how we happen to keep
 * things locally, and tying the two would make a change of storage look like a
 * change of format to whoever holds the file.
 */
const VERSION = 1;

/** What travels for one link: everything except its identity and its area. */
export interface LinkExport {
  name: string;
  description: string;
  url: string;
  monogram: string;
  /** Palette slots, never colour values — that is what makes a theme change work. */
  from: number;
  to: number;
  wide: boolean;
}

export interface AreaExport {
  kind: typeof KIND;
  version: number;
  exportedAt: string;
  area: { name: string };
  links: LinkExport[];
}

/**
 * Write one area out.
 *
 * Field by field and never by spreading a `Link`. The spread would carry `id`
 * and `areaId` the day someone adds a field, and the whole point of D1 is that
 * they are not in the file.
 */
export function exportArea(area: Area, links: readonly Link[]): string {
  const doc: AreaExport = {
    kind: KIND,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    area: { name: area.name },
    links: links.map((l) => ({
      name: l.name,
      description: l.description,
      url: l.url,
      monogram: l.monogram,
      from: l.from,
      to: l.to,
      wide: l.wide,
    })),
  };
  return JSON.stringify(doc, null, 2);
}

/**
 * What the file is called: `enlaces-<área>.json`.
 *
 * The prefix says which application it is from, the suffix which area. Three
 * exports in a row leave three distinguishable files instead of `enlaces.json`,
 * `enlaces (2).json` and `enlaces (3).json`, where finding Pagos means opening
 * all three.
 *
 * Sanitised with the rule the roadmap export already uses, deliberately
 * including its treatment of accents — a second, better rule here would mean
 * two applications naming their downloads differently for no stated reason.
 *
 * With one addition that rule needs and does not have: a name made entirely of
 * characters it strips collapses to underscores rather than to nothing, so
 * trimming them is what actually lets the fallback fire.
 */
export function areaFilename(name: string): string {
  const safe = name
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `enlaces-${safe === '' ? 'area' : safe}.json`;
}

/**
 * Said when the file has just been handed over — see D4 for why it is after.
 *
 * The warning goes first and the filename second, because the bar truncates
 * from the right: if this has to be cut, what should survive is what the file
 * contains. The name is legible in the downloads folder anyway; "contiene
 * direcciones internas" is not legible anywhere else.
 */
export function exportNotice(filename: string): string {
  return `contiene direcciones internas · ${filename}`;
}

export class ImportError extends Error {}

/** An area that came in: itself, its links, and how many did not make it. */
export interface AreaImport {
  area: Area;
  links: Link[];
  discarded: number;
}

/**
 * Read an area document.
 *
 * Strict about the envelope and tolerant about the contents. A file that is not
 * ours is refused whole and nothing enters; inside a file that is ours, a link
 * without a name or without a usable address falls out and the rest comes in —
 * the same tolerance the load path has, because this is the application that
 * must not fail to open.
 *
 * Identity is assigned here rather than reissued afterwards: the document
 * carries no ids, so the ones stamped below are the only ones these areas and
 * links will ever have. Any id a tampered file did bring is overwritten, so
 * importing the same file twice gives two independent areas by construction
 * and not by a check.
 */
export function parseAreaImport(text: string): AreaImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('El archivo no es un JSON válido.');
  }

  // Naming the owning application before rejecting: putting the wrong file in
  // the wrong application is the likeliest mistake in the whole exchange, and
  // with four applications there are twelve ways to make it.
  const foreign = foreignDocumentMessage(parsed, LINKS_ID);
  if (foreign) throw new ImportError(foreign);

  if (parsed === null || typeof parsed !== 'object') {
    throw new ImportError('El archivo no contiene un área de enlaces.');
  }
  const doc = parsed as Record<string, unknown>;

  if (doc.kind !== KIND) {
    throw new ImportError('El archivo no es un documento de enlaces.');
  }
  if (!Array.isArray(doc.links)) {
    throw new ImportError('El documento no contiene una lista de enlaces.');
  }
  if (doc.links.length === 0) {
    throw new ImportError('El documento no contiene ningún enlace.');
  }

  const areaId = uid('area');
  const rawArea = (doc.area ?? {}) as Record<string, unknown>;

  // `normalize` refuses an entry without an id, and rightly so on the load path
  // — there, a missing id means the store is corrupt. Here it means nothing, so
  // the ids are stamped first and the same reader does the rest.
  const data = normalize({
    areas: [{ id: areaId, name: rawArea.name }],
    links: doc.links.map((l) =>
      l !== null && typeof l === 'object' ? { ...l, id: uid('link'), areaId } : l,
    ),
  });

  if (data.links.length === 0) {
    throw new ImportError('El documento no contiene ningún enlace legible.');
  }

  return {
    area: data.areas[0],
    links: data.links,
    discarded: doc.links.length - data.links.length,
  };
}

/**
 * What the bar says after an import.
 *
 * It reports even when nothing was discarded: the user should not have to tell
 * "it all went in" apart from "nothing happened". Discarding in silence is what
 * this exists to prevent — a file half of which entered without saying so is
 * discovered during a shift, which is exactly when it cannot be fixed.
 */
export function importNotice(imported: number, discarded: number): string {
  const entered = `${imported} ${imported === 1 ? 'enlace importado' : 'enlaces importados'}`;
  if (discarded === 0) return entered;
  return `${entered}, ${discarded} ${discarded === 1 ? 'descartado' : 'descartados'}`;
}
