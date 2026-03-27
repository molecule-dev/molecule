/**
 * Keyboard shortcuts provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { KeyboardShortcutsProvider } from './types.js'

let _provider: KeyboardShortcutsProvider | null = null

/**
 * Registers a keyboard shortcuts provider as the active singleton.
 *
 * @param provider - The keyboard shortcuts provider implementation to bond.
 */
export function setProvider(provider: KeyboardShortcutsProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded keyboard shortcuts provider, or `null` if none is bonded.
 *
 * @returns The active keyboard shortcuts provider, or `null`.
 */
export function getProvider(): KeyboardShortcutsProvider | null {
  return _provider
}

/**
 * Checks whether a keyboard shortcuts provider has been bonded.
 *
 * @returns `true` if a keyboard shortcuts provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded keyboard shortcuts provider, throwing if none is configured.
 *
 * @returns The active keyboard shortcuts provider.
 * @throws Error if no provider has been bonded.
 */
export function requireProvider(): KeyboardShortcutsProvider {
  if (!_provider) {
    throw new Error(
      'KeyboardShortcuts provider not configured. Bond a keyboard-shortcuts provider first.',
    )
  }
  return _provider
}
