/**
 * Keyboard shortcuts provider using an in-memory registry.
 *
 * @module
 */

import type {
  KeyboardShortcutsProvider,
  RegisteredShortcut,
  Shortcut,
} from '@molecule/app-keyboard-shortcuts'

import type { HotkeysConfig } from './types.js'

/**
 * Creates a hotkeys-based keyboard shortcuts provider.
 *
 * @param config - Optional provider configuration.
 * @returns A configured KeyboardShortcutsProvider.
 */
export function createProvider(config?: HotkeysConfig): KeyboardShortcutsProvider {
  const shortcuts = new Map<string, { shortcut: Shortcut; enabled: boolean }>()
  const pressedKeys = new Set<string>()
  let globalEnabled = config?.enabled ?? true

  return {
    name: 'hotkeys',

    register(shortcut: Shortcut): () => void {
      shortcuts.set(shortcut.keys, { shortcut, enabled: true })

      return () => {
        shortcuts.delete(shortcut.keys)
      }
    },

    registerMany(shortcutList: Shortcut[]): () => void {
      for (const shortcut of shortcutList) {
        shortcuts.set(shortcut.keys, { shortcut, enabled: true })
      }

      return () => {
        for (const shortcut of shortcutList) {
          shortcuts.delete(shortcut.keys)
        }
      }
    },

    unregister(keys: string): void {
      shortcuts.delete(keys)
    },

    unregisterAll(): void {
      shortcuts.clear()
    },

    getAll(): RegisteredShortcut[] {
      return Array.from(shortcuts.values()).map(({ shortcut, enabled }) => ({
        keys: shortcut.keys,
        description: shortcut.description,
        scope: shortcut.scope,
        enabled: enabled && globalEnabled,
      }))
    },

    isPressed(key: string): boolean {
      return pressedKeys.has(key.toLowerCase())
    },

    enable(): void {
      globalEnabled = true
    },

    disable(): void {
      globalEnabled = false
    },
  }
}

/** Default hotkeys provider instance. */
export const provider: KeyboardShortcutsProvider = createProvider()
