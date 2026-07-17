/**
 * Keyboard shortcuts provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('keyboard-shortcuts', provider)`, so wiring via this package's
 * `setProvider()` and via `bond('keyboard-shortcuts', …)` write the SAME registry
 * slot — use either. Application code calls `getProvider()` / `requireProvider()`
 * at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { KeyboardShortcutsProvider } from './types.js'

const BOND_TYPE = 'keyboard-shortcuts'

/**
 * Registers a keyboard shortcuts provider as the active singleton.
 *
 * @param provider - The keyboard shortcuts provider implementation to bond.
 */
export function setProvider(provider: KeyboardShortcutsProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded keyboard shortcuts provider, or `null` if none is bonded.
 *
 * @returns The active keyboard shortcuts provider, or `null`.
 */
export function getProvider(): KeyboardShortcutsProvider | null {
  return get<KeyboardShortcutsProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a keyboard shortcuts provider has been bonded.
 *
 * @returns `true` if a keyboard shortcuts provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded keyboard shortcuts provider, throwing if none is configured.
 *
 * @returns The active keyboard shortcuts provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): KeyboardShortcutsProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error(
      'KeyboardShortcuts provider not configured. Bond a keyboard-shortcuts provider first.',
    )
  }
  return requireSingleton<KeyboardShortcutsProvider>(BOND_TYPE)
}
