import { describe, it, expect } from 'vitest';
import { isMacLike, isSearchShortcut, searchShortcutLabel } from './keyboard';

const key = (over: Partial<Parameters<typeof isSearchShortcut>[0]> = {}) => ({
  key: 'k',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...over,
});

describe('the search shortcut', () => {
  it('is ⌘K on a Mac and Ctrl+K elsewhere', () => {
    expect(isSearchShortcut(key({ metaKey: true }), true)).toBe(true);
    expect(isSearchShortcut(key({ ctrlKey: true }), true)).toBe(false);
    expect(isSearchShortcut(key({ ctrlKey: true }), false)).toBe(true);
    expect(isSearchShortcut(key({ metaKey: true }), false)).toBe(false);
  });

  it('does not answer to a bare k, which is somebody typing', () => {
    expect(isSearchShortcut(key(), true)).toBe(false);
    expect(isSearchShortcut(key(), false)).toBe(false);
  });

  it('answers with caps lock on, and not with another modifier', () => {
    expect(isSearchShortcut(key({ key: 'K', metaKey: true }), true)).toBe(true);
    expect(isSearchShortcut(key({ metaKey: true, shiftKey: true }), true)).toBe(false);
    expect(isSearchShortcut(key({ metaKey: true, altKey: true }), true)).toBe(false);
  });

  it('is written the way each system writes it', () => {
    expect(isMacLike('MacIntel')).toBe(true);
    expect(isMacLike('Win32')).toBe(false);
    expect(searchShortcutLabel(true)).toBe('⌘K');
    expect(searchShortcutLabel(false)).toBe('Ctrl+K');
  });
});
