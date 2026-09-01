/**
 * Which application a JSON document belongs to (design decision D5).
 *
 * It **recognises, it does not parse**. It decides whose document this is;
 * reading it is still its owner's business.
 *
 * It lives in the container because no application can own it. The answer
 * Decisions needs is about the other two's documents, so each importer knowing
 * the foreign formats would be three copies of the same table — four with the
 * next application, and the day a format changes only some of them would learn.
 *
 * What it buys is a sentence: putting the wrong file in the wrong application
 * is the likeliest mistake in the whole exchange, and it grows with every app —
 * with three there are six wrong combinations. «No es un documento válido»
 * leaves you guessing; «esto es un documento de roadmaps» is fixed in a second.
 */

import { DECISIONS_ID, ROADMAPS_ID, API_ID, findApp } from './apps';

/** What a document declares itself to be, or `null` when nothing recognises it. */
export type DocumentOwner = typeof ROADMAPS_ID | typeof DECISIONS_ID | typeof API_ID | null;

/**
 * Recognise a parsed JSON.
 *
 * The legacy Roadmaps format declares nothing about itself, so it is
 * recognised by its shape — an array of rows — which is what its own importer
 * has always done.
 */
export function ownerOf(parsed: unknown): DocumentOwner {
  if (parsed === null || typeof parsed !== 'object') return null;
  const doc = parsed as Record<string, unknown>;

  if (doc.format === 'roadmaps.v1' || doc.roadmap !== undefined) return ROADMAPS_ID;
  if (Array.isArray(doc.rows)) return ROADMAPS_ID;
  if (doc.kind === 'tech-lead-hub/decisions') return DECISIONS_ID;
  if (doc.kind === 'tech-lead-hub/api-contract') return API_ID;
  return null;
}

/**
 * The sentence to show when a document turns out to be somebody else's.
 *
 * `null` when it is not: either it is this application's own — and the caller
 * has a better reason to reject it — or nobody recognises it, and claiming an
 * owner would be worse than admitting we do not know.
 */
export function foreignDocumentMessage(parsed: unknown, mine: string): string | null {
  const owner = ownerOf(parsed);
  if (owner === null || owner === mine) return null;
  const app = findApp(owner);
  // The full name, not the short one: `shortName` gives "API", and "un
  // documento de API" reads as a common noun in Spanish instead of as the name
  // of an application. "API Hub" is unambiguous, and the other two read fine
  // either way.
  return app ? `Esto es un documento de ${app.name}, no de esta aplicación.` : null;
}
