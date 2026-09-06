/**
 * What a keypress means in Links Hub (D5).
 *
 * Pure, and separate from the screen, because the keyboard *is* the feature
 * here: it is what makes this faster than the browser's own bookmarks, and it
 * has to be testable without mounting anything.
 *
 * The two axes and why they are that way round: the numbers open a **link**
 * inside the active area, and the side arrows change **area**. The mock had it
 * the other way — 1–6 jumped between areas — and what you actually memorise on
 * call is "the 4 is the checkout Grafana". Which group it was filed under is
 * precisely what you do not remember, because filing happened on a calm day.
 */

/** How many links a number key can reach. `1`–`9`; there is no `0`. */
export const NUMBERED = 9;

export type KeyAction =
  /** Move `step` areas along. */
  | { kind: 'area'; step: number }
  /** Move the focus `step` links along inside the active area. */
  | { kind: 'focus'; step: number }
  /** Open the link at this position of the active area. */
  | { kind: 'open'; index: number }
  /** Open whichever link has the focus. */
  | { kind: 'openFocused' }
  /** Customise whichever link has the focus. */
  | { kind: 'customize' };

export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/**
 * Whether the event came from somewhere the user is writing.
 *
 * Typing a `4` into the name of a link must write a `4`, not open the fourth
 * dashboard. This is the check that makes the shortcuts safe to leave always
 * armed, which is what lets the legend stay on screen instead of behind a key.
 */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * The action a keypress asks for, or `null` when it asks for nothing.
 *
 * Anything carrying a modifier is left alone: those belong to the browser, and
 * stealing ⌘L or ctrl+1 to open a dashboard would be a worse trade than the
 * shortcut is worth.
 */
export function actionFor(event: KeyEventLike, typing: boolean): KeyAction | null {
  if (typing) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  switch (event.key) {
    case 'ArrowLeft':
      return { kind: 'area', step: -1 };
    case 'ArrowRight':
      return { kind: 'area', step: 1 };
    case 'ArrowUp':
      return { kind: 'focus', step: -1 };
    case 'ArrowDown':
      return { kind: 'focus', step: 1 };
    case 'Enter':
      return { kind: 'openFocused' };
    case 'e':
    case 'E':
      return { kind: 'customize' };
  }

  if (event.key >= '1' && event.key <= '9') {
    return { kind: 'open', index: Number(event.key) - 1 };
  }
  return null;
}
