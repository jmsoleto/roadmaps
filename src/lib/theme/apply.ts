/**
 * Writing a resolved theme to the document.
 *
 * Also keeps the boot mirror in `localStorage` up to date (design decision D8).
 * The canonical store is SQLite on the desktop and `localStorage` on the web,
 * but either way the preference is read asynchronously, which would paint the
 * first frame with the wrong theme. The mirror lets the inline script in
 * `index.html` apply the right colors before anything is drawn.
 */

import { CSS_VAR, CSS_VAR_GEOMETRY, type ResolvedTheme } from './tokens';

/** Where the boot mirror lives. Must match the inline script in `index.html`. */
export const BOOT_KEY = 'roadmaps:theme:boot';

/** The flat `--var` -> value map that both this module and the boot script use. */
export function bootSnapshot(theme: ResolvedTheme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [token, cssVar] of Object.entries(CSS_VAR)) {
    out[cssVar] = theme.colors[token as keyof typeof theme.colors];
  }
  for (const [key, cssVar] of Object.entries(CSS_VAR_GEOMETRY)) {
    out[cssVar] = `${theme.geometry[key as keyof typeof theme.geometry]}px`;
  }
  return out;
}

/** Apply a resolved theme to `:root`, the browser chrome, and the boot mirror. */
export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const snapshot = bootSnapshot(theme);
  const root = document.documentElement;
  for (const [cssVar, value] of Object.entries(snapshot)) {
    root.style.setProperty(cssVar, value);
  }
  setMetaThemeColor(theme.colors.bg);
  saveBootSnapshot(snapshot);
}

/**
 * Apply a theme without touching the mirror.
 *
 * The editor previews on the live document, and a preview that is cancelled
 * must not be what the next launch restores.
 */
export function previewTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [cssVar, value] of Object.entries(bootSnapshot(theme))) {
    root.style.setProperty(cssVar, value);
  }
}

/** Keeps the installed PWA's status bar in step with the theme. */
function setMetaThemeColor(color: string): void {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

function saveBootSnapshot(snapshot: Record<string, string>): void {
  try {
    localStorage.setItem(BOOT_KEY, JSON.stringify(snapshot));
  } catch {
    // A full or unavailable localStorage costs a flash on next launch, nothing more.
  }
}

/** Read the boot mirror, if this machine has one. */
export function readBootSnapshot(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(BOOT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : null;
  } catch {
    return null;
  }
}
