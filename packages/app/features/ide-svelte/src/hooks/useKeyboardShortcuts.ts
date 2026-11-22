/**
 * Global keyboard shortcut hook for the IDE — the Svelte counterpart of
 * `@molecule/app-ide-react`'s `useKeyboardShortcuts`.
 *
 * Provides a centralized `document`-level keydown listener that maps
 * platform-aware key combos (e.g. `"mod+p"`, `"mod+shift+f"`) to handlers. The
 * matching itself is `@molecule/app-ide-panel-logic`'s `findKeyboardShortcut`, shared by
 * every framework.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, readable } from 'svelte/store'

import { findKeyboardShortcut, type KeyboardShortcut } from '@molecule/app-ide-panel-logic'

/**
 * Whether a value is a readable store (the read half of the Svelte store
 * contract). The hook's argument may arrive as one, so a changed list reaches
 * the same mount the way a React re-render does.
 *
 * @param value - The value, or a store of it.
 * @returns True for a store.
 */
function isStore(
  value: KeyboardShortcut[] | Readable<KeyboardShortcut[]>,
): value is Readable<KeyboardShortcut[]> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { subscribe?: unknown }).subscribe === 'function'
  )
}

/**
 * Registers global keyboard shortcuts on the document.
 *
 * Call it during component init (a component's `<script>` or a `.svelte.ts`
 * module's init), where Svelte's lifecycle works. Pass the list as a readable
 * store when it can change: a new list replaces the old one on the same mount,
 * and an empty list listens to nothing — the Svelte counterpart of React
 * re-rendering the hook with new arguments. The listener is removed when the
 * component is destroyed.
 *
 * @param shortcuts - Array of shortcut definitions, in priority order, or a
 *   store of one.
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[] | Readable<KeyboardShortcut[]>,
): void {
  const source = isStore(shortcuts) ? shortcuts : readable(shortcuts)

  let remove: (() => void) | null = null

  /** Tears the current listener down (idempotent). */
  const teardown = (): void => {
    remove?.()
    remove = null
  }

  /**
   * Applies one resolved list: replaces the listener so it reads the list the
   * registration closed over.
   * @param list - The shortcut definitions, in priority order.
   */
  const apply = (list: KeyboardShortcut[]): void => {
    teardown()
    if (list.length === 0) return

    /**
     * Runs the shortcut a keydown triggers, claiming the key.
     * @param e - The keyboard event to evaluate.
     */
    function handler(e: KeyboardEvent): void {
      const shortcut = findKeyboardShortcut(list, e)
      if (!shortcut) return
      e.preventDefault()
      e.stopPropagation()
      shortcut.handler()
    }

    document.addEventListener('keydown', handler, true)
    remove = () => document.removeEventListener('keydown', handler, true)
  }

  // The first registration happens during init (a store's subscribe calls
  // back at once), like React's first effect run once the mount settles; a
  // store change re-applies on the same mount.
  const stop = source.subscribe(apply)
  onDestroy(() => {
    stop()
    teardown()
  })
}
