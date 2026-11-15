/**
 * A shortcut that lives as long as the component that declares it — the Vue
 * counterpart of `useKeyboardShortcut` in `@molecule/app-keyboard-shortcuts-react`.
 *
 * @module
 */

import {
  getCurrentScope,
  isRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  type Ref,
  toValue,
  watch,
} from 'vue'

import { getProvider } from '@molecule/app-keyboard-shortcuts'

import type { UseKeyboardShortcutOptions } from './types.js'

/** The function a shortcut fires, or a ref of one (a handler swapped at runtime). */
type ShortcutHandler = (event: KeyboardEvent) => void

/**
 * The registration inputs React's effect depends on: the normalized key
 * combinations and the option primitives. The handler is never one of them —
 * it is always read at call time, so swapping it never re-registers.
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
 * of the component's setup scope, and unregisters when the scope is disposed
 * or `enabled` turns false. The latest handler is always the one called, so a
 * handler can be swapped through a ref without re-registering. With no
 * provider bonded the composable does nothing.
 *
 * Pass `keys` or `options` as a ref or getter to follow a change on the SAME
 * instance — the Vue counterpart of React re-rendering the hook with new
 * arguments. A changed key combination, enable flag, description, scope or
 * `preventDefault` flag unregisters the previous registration and registers
 * the new one; a handler change does not.
 *
 * @param keys - One combination or several (`'mod+k'` is expanded to `ctrl+k`
 *   and `command+k`), or a ref/getter of either.
 * @param handler - Called with the keyboard event; or a ref of one, read at
 *   call time.
 * @param options - Enable flag, description, scope, preventDefault; or a
 *   ref/getter of them.
 */
export function useKeyboardShortcut(
  keys: string | string[] | MaybeRefOrGetter<string | string[]>,
  handler: ShortcutHandler | Ref<ShortcutHandler>,
  options:
    UseKeyboardShortcutOptions | MaybeRefOrGetter<UseKeyboardShortcutOptions | undefined> = {},
): void {
  const readKeys = (): string | string[] => toValue(keys)
  const readOptions = (): UseKeyboardShortcutOptions => toValue(options) ?? {}
  const readHandler = (): ShortcutHandler => (isRef(handler) ? handler.value : handler)

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

  // The first registration happens in setup, like React's first effect run
  // once the mount settles; a later reactive change re-applies on the same
  // instance.
  setupWith(readKeys(), readOptions())
  watch(
    () => inputsOf(toValue(keys), toValue(options) ?? {}),
    () => setupWith(readKeys(), readOptions()),
  )
  if (getCurrentScope()) onScopeDispose(teardown)
}
