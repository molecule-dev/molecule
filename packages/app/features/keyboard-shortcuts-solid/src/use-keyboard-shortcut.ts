/**
 * A shortcut that lives as long as the component that declares it — the Solid
 * counterpart of `useKeyboardShortcut` in `@molecule/app-keyboard-shortcuts-react`.
 *
 * @module
 */
import { type Accessor, createEffect, onCleanup, untrack } from 'solid-js'

import { getProvider } from '@molecule/app-keyboard-shortcuts'

import type { UseKeyboardShortcutOptions } from './types.js'

/** The function a shortcut fires (read through the app's own accessor when it can change). */
type ShortcutHandler = (event: KeyboardEvent) => void

/**
 * Reads one argument as its current value: a plain value as it is, an
 * accessor by calling it.
 *
 * @param value - The value, or an accessor of it.
 * @returns The current value.
 */
function readSource<T>(value: T | Accessor<T>): T {
  return typeof value === 'function' ? (value as Accessor<T>)() : value
}

/**
 * The registration inputs React's effect depends on: the normalized key
 * combinations and the option primitives. The handler is never one of them —
 * it is read at call time, so swapping it never re-registers.
 *
 * @param keysValue - The keys as they resolve right now.
 * @param optionsValue - The options as they resolve right now.
 * @returns The values whose change re-registers the shortcut.
 */
function inputsOf(
  keysValue: string | string[],
  optionsValue: UseKeyboardShortcutOptions,
): unknown[] {
  const { enabled = true, description, scope, preventDefault } = optionsValue
  return [expandKeys(keysValue).join(','), enabled, description, scope, preventDefault]
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

/**
 * Registers `keys` with the bonded keyboard-shortcuts provider for the life
 * of the component (Solid's `onCleanup`), and unregisters on dispose or when
 * `enabled` turns false. The handler given at the call is the one fired — pass
 * a stable wrapper that reads your accessor (`(event) => handler()(event)`)
 * where the action can change, the Solid counterpart of React always calling
 * the latest closure. With no provider bonded the primitive does nothing.
 *
 * A component body runs once in Solid, so pass `keys` or `options` as an
 * accessor when any part of them can change (`() => props.keys`): a changed
 * combination, enable flag, description, scope or `preventDefault` flag
 * unregisters the previous registration and registers the new one on the SAME
 * instance, the way React re-renders the hook with new arguments.
 *
 * @param keys - One combination or several (`'mod+k'` is expanded to `ctrl+k`
 *   and `command+k`), or an accessor of either.
 * @param handler - Called with the keyboard event (see above for a changing
 *   action).
 * @param options - Enable flag, description, scope, preventDefault; or an
 *   accessor of them.
 */
export function useKeyboardShortcut(
  keys: string | string[] | Accessor<string | string[]>,
  handler: ShortcutHandler,
  options: UseKeyboardShortcutOptions | Accessor<UseKeyboardShortcutOptions> = {},
): void {
  const readKeys = (): string | string[] => readSource(keys)
  const readOptions = (): UseKeyboardShortcutOptions => readSource(options) ?? {}

  let unregister: (() => void) | null = null
  let registered: unknown[] | null = null

  /** Tears the current registration down (idempotent). */
  const teardown = (): void => {
    unregister?.()
    unregister = null
  }

  /** Applies one resolved keys/options pair, re-registering only on a change. */
  const setupWith = (
    keysValue: string | string[],
    optionsValue: UseKeyboardShortcutOptions,
  ): void => {
    const next = inputsOf(keysValue, optionsValue)
    if (
      registered !== null &&
      registered.length === next.length &&
      registered.every((value, index) => value === next[index])
    )
      return
    registered = next
    teardown()
    const [combos, enabled, description, scope, preventDefault] = next as [
      string,
      boolean,
      string | undefined,
      string | undefined,
      boolean | undefined,
    ]
    if (!enabled || !combos) return
    const provider = getProvider()
    if (!provider) return
    unregister = provider.registerMany(
      combos.split(',').map((k) => ({
        keys: k,
        handler: (event: KeyboardEvent) => handler(event),
        description,
        scope,
        preventDefault,
      })),
    )
  }

  // The first registration happens in the component body, like React's first
  // effect run once the mount settles; a later accessor change re-applies on
  // the same instance.
  setupWith(readKeys(), readOptions())
  createEffect(
    () => {
      const keysValue = readKeys()
      const optionsValue = readOptions()
      untrack(() => setupWith(keysValue, optionsValue))
    },
    { defer: true },
  )
  onCleanup(teardown)
}
