/**
 * What an area and a link are, and the rules that keep one usable at 4am.
 *
 * Pure: no store, no `localStorage`, no reactive state. Everything here is a
 * function of its arguments so the rules can be tested without a browser, which
 * matters more than usual — the whole point of this application is that it
 * works the one day nobody is in a position to debug it.
 */

import { uid } from '../util/id';

/** A group of links. The only level of grouping there is; areas do not nest. */
export interface Area {
  id: string;
  name: string;
}

export interface Link {
  id: string;
  /** Which area it hangs from. */
  areaId: string;
  name: string;
  /** The one line under the name. May be empty. */
  description: string;
  url: string;
  /** Up to three characters carved on the badge. Never an emoji — see below. */
  monogram: string;
  /**
   * The badge's gradient, as two **palette slots** and never as hex.
   *
   * A link's colour is decoration of data the user chose, exactly like a Gantt
   * bar, so it follows the theme. That is the opposite of an application's
   * identity, which is fixed precisely because it is how the application is
   * recognised. Confusing the two is the expensive mistake here: storing hex
   * would freeze a link's colour against a theme it no longer matches, and
   * would put its contrast outside the one place that checks it.
   */
  from: number;
  to: number;
  /** Whether the button takes two grid cells. The user's call, never usage's. */
  wide: boolean;
}

/** Everything the application persists. Order is array order, in both lists. */
export interface LinksData {
  areas: Area[];
  links: Link[];
}

export const EMPTY: LinksData = { areas: [], links: [] };

/** How many characters a monogram may carry. */
export const MONOGRAM_MAX = 3;

/**
 * Emoji are rejected, and not out of taste (D12).
 *
 * The monogram is carved in ink computed from the luminance of the gradient
 * under it, and that only works on a monochrome shape: an emoji brings its own
 * colours, ignores the ink and stops having any measurable contrast against the
 * background it landed on. It also reads worse than two letters at 46px, and
 * what is being looked for mid-outage is "AD", not a face.
 */
const EMOJI = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u{1F1E6}-\u{1F1FF}]|️/u;

export function hasEmoji(text: string): boolean {
  return EMOJI.test(text);
}

/**
 * Why this monogram cannot be used, or `null` when it can.
 *
 * An empty monogram is fine here: it means "derive one from the name".
 */
export function monogramProblem(raw: string): string | null {
  const text = raw.trim();
  if (text === '') return null;
  if (hasEmoji(text))
    return `El monograma admite hasta ${MONOGRAM_MAX} caracteres de texto, sin emoji.`;
  if ([...text].length > MONOGRAM_MAX) return `El monograma no pasa de ${MONOGRAM_MAX} caracteres.`;
  return null;
}

/**
 * The monogram to carve when the user gave none.
 *
 * Initials when the name has several words — "War room" gives "WR" — and the
 * leading characters when it is one, which is what turns "Grafana" into "G".
 */
export function deriveMonogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w !== '' && !hasEmoji(w));
  if (words.length === 0) return '?';
  if (words.length === 1) return [...words[0]].slice(0, 1).join('').toUpperCase();
  return words
    .slice(0, MONOGRAM_MAX)
    .map((w) => [...w][0])
    .join('')
    .toUpperCase();
}

/**
 * Why this address cannot be used, or `null` when it can.
 *
 * Absolute `http` or `https` only. A relative path or a bare hostname parses
 * into something, and what it parses into is not the dashboard: finding out a
 * button is broken *while looking for the cause of an outage* is the worst
 * possible moment, so it is refused at the point where it is cheap to fix.
 */
export function urlProblem(raw: string): string | null {
  const text = raw.trim();
  if (text === '') return 'La dirección no puede estar vacía.';
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return 'La dirección tiene que ser una URL completa, empezando por https://';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'La dirección tiene que empezar por http:// o https://';
  }
  return null;
}

export function isValidUrl(raw: string): boolean {
  return urlProblem(raw) === null;
}

export function newArea(name: string): Area {
  return { id: uid('area'), name: name.trim() };
}

export interface LinkDraft {
  name: string;
  description?: string;
  url: string;
  monogram?: string;
  from?: number;
  to?: number;
  wide?: boolean;
}

/**
 * The gradient a link gets when the user did not pick one.
 *
 * Walks the palette by how many links already exist, so a freshly built area
 * comes out varied instead of monochrome, and the pair is two slots apart so
 * the gradient actually reads as one.
 */
export function defaultPair(index: number): { from: number; to: number } {
  return { from: index % 10, to: (index + 3) % 10 };
}

export function newLink(areaId: string, draft: LinkDraft, index = 0): Link {
  const pair = defaultPair(index);
  const monogram = (draft.monogram ?? '').trim();
  return {
    id: uid('link'),
    areaId,
    name: draft.name.trim(),
    description: (draft.description ?? '').trim(),
    url: draft.url.trim(),
    monogram: monogram === '' ? deriveMonogram(draft.name) : monogram,
    from: draft.from ?? pair.from,
    to: draft.to ?? pair.to,
    wide: draft.wide ?? false,
  };
}

/** The links of one area, in order. */
export function linksOf(data: LinksData, areaId: string | null): Link[] {
  if (areaId === null) return [];
  return data.links.filter((l) => l.areaId === areaId);
}

// ---- reading what was stored ----

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function slot(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? ((Math.trunc(value) % 10) + 10) % 10
    : fallback;
}

/**
 * Read whatever is in the store into something the application can run on.
 *
 * Tolerant on purpose, and the requirement says why: this is the application
 * that must not fail to start. Anything unreadable is dropped and the rest
 * loads — a link without a name or without a usable address is not worth
 * refusing to open the panel over, and a link pointing at an area that no
 * longer exists is adopted by the first one rather than becoming invisible.
 */
export function normalize(parsed: unknown): LinksData {
  if (parsed === null || typeof parsed !== 'object') return EMPTY;
  const raw = parsed as Record<string, unknown>;

  const areas: Area[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw.areas)) {
    for (const entry of raw.areas) {
      if (entry === null || typeof entry !== 'object') continue;
      const a = entry as Record<string, unknown>;
      const id = str(a.id);
      if (id === '' || seen.has(id)) continue;
      seen.add(id);
      areas.push({ id, name: str(a.name, 'Sin nombre') });
    }
  }

  const links: Link[] = [];
  const ids = new Set<string>();
  if (Array.isArray(raw.links)) {
    for (const [i, entry] of raw.links.entries()) {
      if (entry === null || typeof entry !== 'object') continue;
      const l = entry as Record<string, unknown>;
      const id = str(l.id);
      const url = str(l.url);
      const name = str(l.name);
      if (id === '' || ids.has(id) || name === '' || !isValidUrl(url)) continue;
      ids.add(id);
      // An orphan link joins the first area rather than existing nowhere.
      const areaId = seen.has(str(l.areaId)) ? str(l.areaId) : (areas[0]?.id ?? '');
      if (areaId === '') continue;
      const pair = defaultPair(i);
      const monogram = str(l.monogram).slice(0, MONOGRAM_MAX);
      links.push({
        id,
        areaId,
        name,
        description: str(l.description),
        url,
        monogram: monogram === '' || hasEmoji(monogram) ? deriveMonogram(name) : monogram,
        from: slot(l.from, pair.from),
        to: slot(l.to, pair.to),
        wide: l.wide === true,
      });
    }
  }

  return { areas, links };
}
