/**
 * Global keyboard shortcut hook for the IDE — the Vue counterpart of
 * `@molecule/app-ide-react`'s `useKeyboardShortcuts`.
 *
 * Provides a centralized `document`-level keydown listener that maps
 * platform-aware key combos (e.g. `"mod+p"`, `"mod+shift+f"`) to handlers. The
 * matching itself is `@molecule/app-ide-panel-logic`'s `findKeyboardShortcut`, shared by
 * every framework.
 *
 * @module
 */

import { getCurrentScope, type MaybeRefOrGetter, onScopeDispose, toValue, watch } from 'vue'

import { findKeyboardShortcut, type KeyboardShortcut } from '@molecule/app-ide-panel-logic'

/**
 * Registers global keyboard shortcuts on the document.
 *
 * Pass the list as a ref or getter to follow a change on the same mount — the
 * Vue counterpart of React re-rendering the hook with new arguments. A new
 * list replaces the old one; an empty list listens to nothing. The listener is
 * removed when the component's setup scope is disposed.
 *
 * @param shortcuts - Array of shortcut definitions, in priority order, or a
 *   ref/getter of one.
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[] | MaybeRefOrGetter<KeyboardShortcut[]>,
): void {
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

  // The first registration happens in setup, like React's first effect run
  // once the mount settles; a reactive change re-applies on the same mount.
  watch(
    () => toValue(shortcuts),
    (list) => apply(list),
    { immediate: true },
  )
  if (getCurrentScope()) onScopeDispose(teardown)
}
