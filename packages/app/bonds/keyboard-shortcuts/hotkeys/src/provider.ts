/**
 * Keyboard shortcuts provider backed by the `hotkeys-js` library.
 *
 * Unlike a bare registry, this provider attaches real global key listeners via
 * `hotkeys-js`, so a registered `Shortcut.handler` fires on the actual keypress.
 *
 * @module
 */

import hotkeys from 'hotkeys-js'

import type {
  KeyboardShortcutsProvider,
  RegisteredShortcut,
  Shortcut,
} from '@molecule/app-keyboard-shortcuts'

import type { HotkeysConfig } from './types.js'

/** hotkeys-js scope whose shortcuts fire regardless of the active scope. */
const ALL_SCOPE = 'all'

/** Internal per-shortcut bookkeeping, keyed by the shortcut's key combo. */
interface Registration {
  /** The original shortcut definition. */
  shortcut: Shortcut

  /** The hotkeys-js scope this binding was actually registered under. */
  scope: string

  /**
   * The wrapped handler bound to hotkeys-js. Kept so we can unbind precisely
   * (hotkeys-js matches unbind by key + scope + method reference).
   */
  boundHandler: (event: KeyboardEvent) => void

  /** Whether this individual shortcut is enabled. */
  enabled: boolean
}

/**
 * Creates a `hotkeys-js`-backed keyboard shortcuts provider.
 *
 * The returned provider binds every registered shortcut to `hotkeys-js`, so
 * handlers fire on real key events (the bug this bond previously had was that it
 * stored shortcuts in a Map but never attached a listener). hotkeys-js's default
 * `filter` suppresses firing while an input/textarea/select/contenteditable is
 * focused.
 *
 * @param config - Optional provider configuration.
 * @returns A configured KeyboardShortcutsProvider whose handlers fire on keypress.
 */
export function createProvider(config?: HotkeysConfig): KeyboardShortcutsProvider {
  const registrations = new Map<string, Registration>()
  const defaultScope = config?.defaultScope ?? ALL_SCOPE
  let globalEnabled = config?.enabled ?? true

  // Make the configured default scope the active hotkeys-js scope so shortcuts
  // registered under it actually fire. hotkeys-js keeps a single global active
  // scope; shortcuts under the 'all' scope fire regardless of it.
  hotkeys.setScope(defaultScope)

  /**
   * Binds a shortcut to hotkeys-js and records it. Re-binding the same key combo
   * first unbinds the stale handler so no dangling hotkeys-js binding leaks.
   *
   * @param shortcut - The shortcut to bind.
   */
  function bind(shortcut: Shortcut): void {
    const scope = shortcut.scope ?? defaultScope

    const boundHandler = (event: KeyboardEvent): void => {
      // Honor enable()/disable() and per-shortcut enabled state at fire time so
      // the binding can stay attached while suppressed.
      const current = registrations.get(shortcut.keys)
      if (!globalEnabled || (current && !current.enabled)) {
        return
      }

      // Default is to suppress the browser's own action (e.g. Ctrl+S "save page").
      if (shortcut.preventDefault !== false) {
        event.preventDefault()
      }

      shortcut.handler(event)
    }

    const existing = registrations.get(shortcut.keys)
    if (existing) {
      hotkeys.unbind(shortcut.keys, existing.scope, existing.boundHandler)
    }

    hotkeys(shortcut.keys, { scope }, boundHandler)

    registrations.set(shortcut.keys, {
      shortcut,
      scope,
      boundHandler,
      enabled: true,
    })
  }

  /**
   * Unbinds a shortcut from hotkeys-js and forgets it.
   *
   * @param keys - The key combination string to unbind.
   */
  function unbind(keys: string): void {
    const registration = registrations.get(keys)
    if (!registration) {
      return
    }

    hotkeys.unbind(keys, registration.scope, registration.boundHandler)
    registrations.delete(keys)
  }

  return {
    name: 'hotkeys',

    register(shortcut: Shortcut): () => void {
      bind(shortcut)

      return () => {
        unbind(shortcut.keys)
      }
    },

    registerMany(shortcutList: Shortcut[]): () => void {
      for (const shortcut of shortcutList) {
        bind(shortcut)
      }

      return () => {
        for (const shortcut of shortcutList) {
          unbind(shortcut.keys)
        }
      }
    },

    unregister(keys: string): void {
      unbind(keys)
    },

    unregisterAll(): void {
      for (const keys of Array.from(registrations.keys())) {
        unbind(keys)
      }
    },

    getAll(): RegisteredShortcut[] {
      return Array.from(registrations.values()).map(({ shortcut, enabled }) => ({
        keys: shortcut.keys,
        description: shortcut.description,
        scope: shortcut.scope,
        enabled: enabled && globalEnabled,
      }))
    },

    isPressed(key: string): boolean {
      return hotkeys.isPressed(key)
    },

    enable(): void {
      globalEnabled = true
    },

    disable(): void {
      globalEnabled = false
    },
  }
}

/** Default hotkeys-js keyboard shortcuts provider instance. */
export const provider: KeyboardShortcutsProvider = createProvider()
