/**
 * Audio provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('audio', provider)`, so wiring via this package's `setProvider()` and
 * via `bond('audio', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { AudioProvider } from './types.js'

const BOND_TYPE = 'audio'

/**
 * Registers an audio provider as the active singleton.
 *
 * @param provider - The audio provider implementation to bond.
 */
export function setProvider(provider: AudioProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded audio provider, or `null` if none is bonded.
 *
 * @returns The active audio provider, or `null`.
 */
export function getProvider(): AudioProvider | null {
  return get<AudioProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether an audio provider has been bonded.
 *
 * @returns `true` if an audio provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded audio provider, throwing if none is configured.
 *
 * @returns The active audio provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): AudioProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('Audio provider not configured. Bond an audio provider first.')
  }
  return requireSingleton<AudioProvider>(BOND_TYPE)
}
