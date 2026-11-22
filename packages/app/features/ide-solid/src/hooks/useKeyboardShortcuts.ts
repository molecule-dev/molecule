/**
 * Global keyboard shortcut hook for the IDE — the Solid counterpart of
 * `@molecule/app-ide-react`'s `useKeyboardShortcuts`.
 *
 * Provides a centralized `document`-level keydown listener that maps
 * platform-aware key combos (e.g. `"mod+p"`, `"mod+shift+f"`) to handlers. The
 * matching itself is `@molecule/app-ide-panel-logic`'s `findKeyboardShortcut`, shared by
 * every framework.
 *
 * @module
 */

import { type Accessor, createEffect, onCleanup, untrack } from 'solid-js'

import { findKeyboardShortcut, type KeyboardShortcut } from '@molecule/app-ide-panel-logic'

/**
 * Reads the shortcuts argument as its current value: a plain value as it is,
 * an accessor by calling it.
 *
 * @param value - The list, or an accessor of it.
 * @returns The current list.
 */
const read = (value: KeyboardShortcut[] | Accessor<KeyboardShortcut[]>): KeyboardShortcut[] =>
  typeof value === 'function' ? value() : value

/**
 * Registers global keyboard shortcuts on the document.
 *
 * A component body runs once in Solid, so pass the list as an accessor when it
 * can change (`() => props.shortcuts`): a new list replaces the old one on the
 * same mount, and an empty list listens to nothing — the Solid counterpart of
 * React re-rendering the hook with new arguments. The listener is removed when
 * the component disposes.
 *
 * @param shortcuts - Array of shortcut definitions, in priority order, or an
 *   accessor of one.
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[] | Accessor<KeyboardShortcut[]>,
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

  // The first registration happens in the component body, like React's first
  // effect run once the mount settles; a later accessor change re-applies on
  // the same mount.
  apply(untrack(() => read(shortcuts)))
  createEffect(
    () => {
      apply(read(shortcuts))
    },
    { defer: true },
  )
  onCleanup(teardown)
}
