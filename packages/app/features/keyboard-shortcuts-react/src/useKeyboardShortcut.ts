/**
 * A shortcut that lives as long as the component that declares it.
 *
 * @module
 */

import { useEffect, useRef } from 'react'

import { getProvider } from '@molecule/app-keyboard-shortcuts'

/** Options for {@link useKeyboardShortcut}. */
export interface UseKeyboardShortcutOptions {
  /** Register the shortcut at all. `false` unregisters it. Defaults to `true`. */
  enabled?: boolean

  /** What the shortcut does, already translated, for a shortcuts panel. */
  description?: string

  /** The provider scope to register under. */
  scope?: string

  /** Call `preventDefault()` on the event. Defaults to `true`. */
  preventDefault?: boolean
}

/**
 * Registers `keys` with the bonded keyboard-shortcuts provider while the
 * component is mounted, and unregisters on unmount or when `enabled` turns
 * false. The latest `handler` is always the one called, so it need not be
 * memoized. With no provider bonded the hook does nothing.
 *
 * @param keys - One combination or several (`'mod+k'` is expanded to `ctrl+k` and `command+k`).
 * @param handler - Called with the keyboard event.
 * @param options - Enable flag, description, scope, preventDefault.
 */
export function useKeyboardShortcut(
  keys: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: UseKeyboardShortcutOptions = {},
): void {
  const { enabled = true, description, scope, preventDefault } = options
  const latest = useRef(handler)
  latest.current = handler
  const combos = expandKeys(keys).join(',')

  useEffect(() => {
    if (!enabled || !combos) return
    const provider = getProvider()
    if (!provider) return
    const unregister = provider.registerMany(
      combos.split(',').map((k) => ({
        keys: k,
        handler: (event: KeyboardEvent) => latest.current(event),
        description,
        scope,
        preventDefault,
      })),
    )
    return unregister
  }, [combos, enabled, description, scope, preventDefault])
}

/**
 * Normalizes a key spec: `'mod+k'` becomes both `ctrl+k` and `command+k`, so
 * one declaration serves every platform.
 *
 * @param keys - One combination or several.
 * @returns The combinations to register.
 */
export function expandKeys(keys: string | string[]): string[] {
  const list = Array.isArray(keys) ? keys : [keys]
  const out: string[] = []
  for (const k of list) {
    const key = k.trim().toLowerCase()
    if (!key) continue
    if (key.includes('mod+')) {
      out.push(key.replace('mod+', 'ctrl+'), key.replace('mod+', 'command+'))
    } else {
      out.push(key)
    }
  }
  return out
}
