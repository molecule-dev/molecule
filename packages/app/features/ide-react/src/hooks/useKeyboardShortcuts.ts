/**
 * Global keyboard shortcut hook for the IDE.
 *
 * Provides a centralized `document`-level keydown listener that maps
 * platform-aware key combos (e.g. `"mod+p"`, `"mod+shift+f"`) to handlers. The
 * matching itself is `@molecule/app-ide-panel-logic`'s `findKeyboardShortcut`, shared by
 * every framework.
 *
 * @module
 */

import { useEffect } from 'react'

import { findKeyboardShortcut, type KeyboardShortcut } from '@molecule/app-ide-panel-logic'

/**
 * Registers global keyboard shortcuts on the document.
 *
 * @param shortcuts - Array of shortcut definitions, in priority order. Callers should
 *   wrap the array in `useMemo` to avoid unnecessary re-subscriptions.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  useEffect(() => {
    if (shortcuts.length === 0) return

    /**
     * Runs the shortcut a keydown triggers, claiming the key.
     * @param e - The keyboard event to evaluate.
     */
    function handler(e: KeyboardEvent): void {
      const shortcut = findKeyboardShortcut(shortcuts, e)
      if (!shortcut) return
      e.preventDefault()
      e.stopPropagation()
      shortcut.handler()
    }

    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [shortcuts])
}
