/**
 * Framework-neutral matching for the IDE's global keyboard shortcuts: each
 * framework's `useKeyboardShortcuts` listens on `document` and asks
 * {@link findKeyboardShortcut} which shortcut, if any, a keydown is.
 *
 * @module
 */

import type { KeyboardShortcut } from './types.js'

/** Whether the platform is macOS or iOS, where `mod` means Cmd instead of Ctrl. */
export const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)

/**
 * Serialize a `KeyboardEvent` into a normalized combo string.
 * Format: modifier keys in order `mod+ctrl+alt+shift+key` (lowercase).
 * `mod` maps to Meta on Mac, Control elsewhere.
 * @param e - The keyboard event.
 * @param isMac - Override platform detection (for testing).
 * @returns Serialized combo string.
 */
export function serializeEvent(e: KeyboardEvent, isMac = IS_MAC): string {
  const parts: string[] = []
  if (isMac ? e.metaKey : e.ctrlKey) parts.push('mod')
  if (isMac ? e.ctrlKey : false) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

/**
 * Normalize a shortcut definition string into the same format produced by
 * `serializeEvent`. Accepts `mod+shift+f` style strings (case-insensitive).
 * @param keys - Raw shortcut string.
 * @returns Normalized lowercase combo string.
 */
export function normalizeKeys(keys: string): string {
  return keys
    .toLowerCase()
    .split('+')
    .map((s) => s.trim())
    .join('+')
}

/**
 * Returns true when the event target is an interactive input element
 * where shortcuts should be suppressed by default.
 * @param e - The keyboard event.
 * @returns Whether an input-like element is focused.
 */
export function isInputFocused(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

/**
 * Returns true when focus is inside a Monaco editor instance.
 * @param e - The keyboard event.
 * @returns Whether the target is inside `.monaco-editor`.
 */
export function isMonacoFocused(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null
  return !!el?.closest?.('.monaco-editor')
}

/**
 * Whether where the key was pressed rules a shortcut out. Inside the Monaco
 * editor only `allowInEditor` decides: Monaco takes keys through its own hidden
 * `<textarea>`, which is the editor, not a text field, so `allowInInput` neither
 * blocks nor allows it there. Elsewhere a text field (`<input>`, `<textarea>`,
 * `<select>`, an editable element) rules it out unless `allowInInput` is set.
 *
 * @param shortcut - The shortcut's focus flags.
 * @param e - The keyboard event.
 * @returns `true` when the shortcut must not fire for this event.
 */
export function isShortcutBlockedByFocus(
  shortcut: Pick<KeyboardShortcut, 'allowInInput' | 'allowInEditor'>,
  e: KeyboardEvent,
): boolean {
  if (isMonacoFocused(e)) return !shortcut.allowInEditor
  return !shortcut.allowInInput && isInputFocused(e)
}

/**
 * The shortcut a keydown triggers: the first whose keys match the event's combo
 * and whose focus flags allow where it was pressed ({@link isShortcutBlockedByFocus}).
 * A matching shortcut the focus rules out lets a later one with the same keys fire.
 *
 * @param shortcuts - The registered shortcuts, in priority order.
 * @param e - The keyboard event.
 * @param isMac - Override platform detection (for testing).
 * @returns The shortcut to run, or `undefined` when the key is not one.
 */
export function findKeyboardShortcut<S extends KeyboardShortcut>(
  shortcuts: readonly S[],
  e: KeyboardEvent,
  isMac = IS_MAC,
): S | undefined {
  const combo = serializeEvent(e, isMac)
  return shortcuts.find(
    (shortcut) => normalizeKeys(shortcut.keys) === combo && !isShortcutBlockedByFocus(shortcut, e),
  )
}
