/**
 * A shortcut that lives as long as the component that declares it — the Svelte
 * counterpart of `useKeyboardShortcut` in `@molecule/app-keyboard-shortcuts-react`.
 *
 * @module
 */
import { onDestroy } from 'svelte'
import { get, type Readable, type Unsubscriber } from 'svelte/store'

import { getProvider } from '@molecule/app-keyboard-shortcuts'

import type { UseKeyboardShortcutOptions } from './types.js'

/** The function a shortcut fires, or a store of one (a handler swapped at runtime). */
type ShortcutHandler = (event: KeyboardEvent) => void

/**
 * Whether a value is a readable store (the read half of the Svelte store
 * contract). A hook's argument may arrive as one, so a changed value reaches
 * the same mount the way a React re-render does.
 *
 * @param value - The value, or a store of it.
 * @returns True for a store.
 */
function isStore<T>(value: T | Readable<T>): value is Readable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { subscribe?: unknown }).subscribe === 'function'
  )
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
 * of the component (`onDestroy`), and unregisters on destroy or when
 * `enabled` turns false. The latest handler is always the one called: pass a
 * changing action as a store, which the registration reads at call time. With
 * no provider bonded the function does nothing.
 *
 * Call it during component init (a component's `<script>` or a `.svelte.ts`
 * module's init), where Svelte's lifecycle works. Pass `keys` or `options` as
 * a readable store when any part of them can change: a changed combination,
 * enable flag, description, scope or `preventDefault` flag unregisters the
 * previous registration and registers the new one on the SAME mount, the way
 * React re-renders the hook with new arguments.
 *
 * @param keys - One combination or several (`'mod+k'` is expanded to `ctrl+k`
 *   and `command+k`), or a store of either.
 * @param handler - Called with the keyboard event; or a store of one, read at
 *   call time.
 * @param options - Enable flag, description, scope, preventDefault; or a
 *   store of them.
 */
export function useKeyboardShortcut(
  keys: string | string[] | Readable<string | string[]>,
  handler: ShortcutHandler | Readable<ShortcutHandler>,
  options: UseKeyboardShortcutOptions | Readable<UseKeyboardShortcutOptions> = {},
): void {
  let keysValue = isStore(keys) ? get(keys) : keys
  let optionsValue = isStore(options) ? get(options) : options
  const readHandler = (): ShortcutHandler => (isStore(handler) ? get(handler) : handler)

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

  // The first registration happens during init, like React's first effect run
  // once the mount settles; a store change re-applies on the same mount (a
  // store's own immediate notification is skipped, so this stays one run).
  setupWith(keysValue, optionsValue)
  const stops: Unsubscriber[] = []
  /**
   * Follows one store argument, applying each later value (the initial one
   * already applied above).
   *
   * @param source - The argument.
   * @param apply - Receives each changed value.
   */
  const follow = (source: unknown, apply: (value: unknown) => void): void => {
    if (!isStore(source)) return
    let first = true
    stops.push(
      source.subscribe((value) => {
        if (first) {
          first = false
          return
        }
        apply(value)
      }),
    )
  }
  follow(keys, (value) => {
    keysValue = value as string | string[]
    setupWith(keysValue, optionsValue)
  })
  follow(options, (value) => {
    optionsValue = value as UseKeyboardShortcutOptions
    setupWith(keysValue, optionsValue)
  })
  onDestroy(() => {
    for (const stop of stops) stop()
    teardown()
  })
}
