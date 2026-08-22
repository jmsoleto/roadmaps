/**
 * Attachment fiches (design decisions D1, D2 and D5).
 *
 * What lives in the model is the *fiche* — name, weight, type, when — and never
 * the bytes. The bytes go to their own object store, which is what keeps the
 * document small enough to rewrite on every keystroke, and what makes the
 * export manifest fall out for free.
 */

import type { IsoDate } from '../../model/types';

export interface Attachment {
  id: string;
  /** The only thing that identifies it in an export that carries no bytes. */
  name: string;
  /** Bytes, as reported when it was added. */
  size: number;
  mime: string;
  addedAt: IsoDate;
}

/**
 * Largest file accepted.
 *
 * Generous on purpose: a full-screen Retina capture runs to a few megabytes and
 * the cap has to let that through without anyone thinking about it. What it
 * stops is the accident — a 60 MB export from a design tool.
 */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

/** Human weight, for the fiche and the per-decision total. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type RejectionReason = 'no-es-imagen' | 'demasiado-grande';

export function rejectionOf(file: { type: string; size: number }): RejectionReason | null {
  if (!isImageMime(file.type)) return 'no-es-imagen';
  if (file.size > MAX_ATTACHMENT_BYTES) return 'demasiado-grande';
  return null;
}

export function rejectionMessage(reason: RejectionReason, size: number): string {
  return reason === 'no-es-imagen'
    ? 'Solo se pueden adjuntar imágenes.'
    : `Pesa ${formatBytes(size)} y el máximo son ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
}

/**
 * A name for something pasted, which arrives without one.
 *
 * Derived from the moment rather than left blank: in an export that carries no
 * bytes, the name is the only thing that says what the image was.
 */
export function pastedName(at: Date, mime: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}` +
    `-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  const ext = mime.split('/')[1]?.split('+')[0] || 'png';
  return `captura-${stamp}.${ext}`;
}

export function totalBytes(attachments: Attachment[]): number {
  return attachments.reduce((n, a) => n + a.size, 0);
}
