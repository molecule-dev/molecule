/**
 * Global keyboard shortcut hook for the IDE — the Angular counterpart of
 * `@molecule/app-ide-react`'s `useKeyboardShortcuts`.
 *
 * Provides a centralized `document`-level keydown listener that maps
 * platform-aware key combos (e.g. `"mod+p"`, `"mod+shift+f"`) to handlers. The
 * matching itself is `@molecule/app-ide-panel-logic`'s `findKeyboardShortcut`, shared by
 * every framework.
 *
 * @module
 */

import { DestroyRef, effect, inject, isSignal, type Signal, untracked } from '@angular/core'

import { findKeyboardShortcut, type KeyboardShortcut } from '@molecule/app-ide-panel-logic'

/**
 * Registers global keyboard shortcuts on the document.
 *
 * Call it in an injection context (a component field initializer or
 * constructor), the way an app calls Angular's injection-based APIs. Pass the
 * list as a signal when it can change: a new list replaces the old one on the
 * same host, and an empty list listens to nothing — the Angular counterpart of
 * React re-rendering the hook with new arguments. The listener is removed when
 * the host component is destroyed.
 *
 * @param shortcuts - Array of shortcut definitions, in priority order, or a
 *   signal of one.
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[] | Signal<KeyboardShortcut[]>,
): void {
  let remove: (() => void) | null = null
  let applied: KeyboardShortcut[] | null = null

  /** Tears the current listener down (idempotent). */
  const teardown = (): void => {
    remove?.()
    remove = null
  }

  /**
   * Applies one resolved list: replaces the listener so it reads the list the
   * registration closed over. A list equal to the applied one is skipped, the
   * way React skips an effect whose dependencies did not change.
   * @param list - The shortcut definitions, in priority order.
   */
  const apply = (list: KeyboardShortcut[]): void => {
    if (list === applied) return
    applied = list
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

  // The first registration happens in the injection context, like React's
  // first effect run once the mount settles; a signal change re-applies on
  // the same host.
  apply(isSignal(shortcuts) ? shortcuts() : shortcuts)
  if (isSignal(shortcuts)) {
    effect(() => {
      const list = shortcuts()
      untracked(() => apply(list))
    })
  }
  inject(DestroyRef).onDestroy(teardown)
}
