/**
 * Global keyboard shortcut hook for the IDE.
 *
 * Provides a centralized `document`-level keydown listener that maps
 * platform-aware key combos (e.g. `"mod+p"`, `"mod+shift+f"`) to handlers.
 *
 * @module
 */

import { useEffect } from 'react'

import type { KeyboardShortcut } from '../types.js'

/** Detect macOS / iOS for Cmd vs Ctrl. */
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
 * Registers global keyboard shortcuts on the document.
 *
 * @param shortcuts - Array of shortcut definitions. Callers should wrap
 *   the array in `useMemo` to avoid unnecessary re-subscriptions.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  useEffect(() => {
    if (shortcuts.length === 0) return

    // Pre-normalize keys for fast lookup
    const entries = shortcuts.map((s) => ({
      ...s,
      normalized: normalizeKeys(s.keys),
    }))

    /** Keydown handler that matches events against registered shortcuts. */
    function handler(e: KeyboardEvent): void {
      const combo = serializeEvent(e)
      for (const entry of entries) {
        if (combo !== entry.normalized) continue

        // Skip if focused in input and not explicitly allowed
        if (!entry.allowInInput && isInputFocused(e)) continue

        // Skip if focused in Monaco and not explicitly allowed
        if (!entry.allowInEditor && isMonacoFocused(e)) continue

        e.preventDefault()
        e.stopPropagation()
        entry.handler()
        return
      }
    }

    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [shortcuts])
}
