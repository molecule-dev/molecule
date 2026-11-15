/**
 * A shortcut that lives as long as the component that declares it — the
 * Angular counterpart of `useKeyboardShortcut` in
 * `@molecule/app-keyboard-shortcuts-react`.
 *
 * @module
 */
import { DestroyRef, effect, inject, isSignal, type Signal, untracked } from '@angular/core'

import { getProvider } from '@molecule/app-keyboard-shortcuts'

import type { UseKeyboardShortcutOptions } from './types.js'

/** The function a shortcut fires, or a signal of one (a handler swapped at runtime). */
type ShortcutHandler = (event: KeyboardEvent) => void

/**
 * Whether a value is a signal of the expected type (Angular's own
 * {@link isSignal} guard, narrowed to the value's type).
 *
 * @param value - The value, or a signal of it.
 * @returns True for a signal.
 */
function isSignalSource<T>(value: T | Signal<T>): value is Signal<T> {
  return isSignal(value)
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
 * of the component (`DestroyRef`), and unregisters on destroy or when
 * `enabled` turns false. The latest handler is always the one called: pass a
 * changing action as a signal, which the registration reads at call time.
 * With no provider bonded the function does nothing.
 *
 * Call it in an injection context (a component field initializer or
 * constructor), the way an app calls Angular's injection-based APIs. Pass
 * `keys` or `options` as a signal when any part of them can change: a changed
 * combination, enable flag, description, scope or `preventDefault` flag
 * unregisters the previous registration and registers the new one on the SAME
 * instance, the way React re-renders the hook with new arguments.
 *
 * @param keys - One combination or several (`'mod+k'` is expanded to `ctrl+k`
 *   and `command+k`), or a signal of either.
 * @param handler - Called with the keyboard event; or a signal of one, read
 *   at call time.
 * @param options - Enable flag, description, scope, preventDefault; or a
 *   signal of them.
 */
export function useKeyboardShortcut(
  keys: string | string[] | Signal<string | string[]>,
  handler: ShortcutHandler | Signal<ShortcutHandler>,
  options: UseKeyboardShortcutOptions | Signal<UseKeyboardShortcutOptions> = {},
): void {
  const readKeys = (): string | string[] => (isSignalSource(keys) ? keys() : keys)
  const readOptions = (): UseKeyboardShortcutOptions =>
    isSignalSource(options) ? options() : options
  const readHandler = (): ShortcutHandler => (isSignalSource(handler) ? handler() : handler)

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
        handler: (event: KeyboardEvent) => readHandler()(event),
        description,
        scope,
        preventDefault,
      })),
    )
  }

  // The first registration happens in the injection context, like React's
  // first effect run once the mount settles; a signal change re-applies on
  // the same instance.
  setupWith(readKeys(), readOptions())
  if (isSignalSource(keys) || isSignalSource(options)) {
    effect(() => {
      const keysValue = isSignalSource(keys) ? keys() : keys
      const optionsValue = isSignalSource(options) ? options() : options
      untracked(() => setupWith(keysValue, optionsValue))
    })
  }
  inject(DestroyRef).onDestroy(teardown)
}
