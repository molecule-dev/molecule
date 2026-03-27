/**
 * KeyboardShortcuts provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { KeyboardShortcutsProvider } from './types.js'

let _provider: KeyboardShortcutsProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: KeyboardShortcutsProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): KeyboardShortcutsProvider | null {
  return _provider
}

/**
 *
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 *
 */
export function requireProvider(): KeyboardShortcutsProvider {
  if (!_provider) {
    throw new Error(
      'KeyboardShortcuts provider not configured. Bond a keyboard-shortcuts provider first.',
    )
  }
  return _provider
}
