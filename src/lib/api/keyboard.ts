/**
 * API Hub's one global shortcut: ⌘K on macOS, Ctrl+K elsewhere, to the search.
 *
 * Deliberately **not** gated by Links Hub's `ownsKey` (D9). That rule keeps a
 * shortcut from stealing a key from a text field, and in Links Hub the focus
 * is usually on the grid. In API Hub it is almost always in a key or a comment
 * — mid-refinement, that is the normal case — so a shortcut that only worked
 * outside fields would hardly ever work. A modified key competes with nothing
 * anyone types.
 */

export interface KeyLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export function isMacLike(platform: string): boolean {
  return /mac|iphone|ipad/i.test(platform);
}

/** Whether this keystroke asks for the field search. */
export function isSearchShortcut(e: KeyLike, mac: boolean): boolean {
  if (e.key.toLowerCase() !== 'k' || e.altKey || e.shiftKey) return false;
  return mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
}

/** How the shortcut is written for this person. */
export function searchShortcutLabel(mac: boolean): string {
  return mac ? '⌘K' : 'Ctrl+K';
}
