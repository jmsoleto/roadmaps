import type { Assignee } from '../model/types';

/** Up to two-letter initials from a name (ported from the original `getInitials`). */
export function getInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Look up an assignee by id in a list, or null. */
export function findAssignee(assignees: Assignee[], id: string | null): Assignee | null {
  return id ? (assignees.find((a) => a.id === id) ?? null) : null;
}
