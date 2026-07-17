/**
 * Tour provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('tour', provider)`, so wiring via this package's `setProvider()` and
 * via `bond('tour', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { TourProvider } from './types.js'

const BOND_TYPE = 'tour'

/**
 * Registers a tour provider as the active singleton.
 *
 * @param provider - The tour provider implementation to bond.
 */
export function setProvider(provider: TourProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded tour provider, or `null` if none is bonded.
 *
 * @returns The active tour provider, or `null`.
 */
export function getProvider(): TourProvider | null {
  return get<TourProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a tour provider has been bonded.
 *
 * @returns `true` if a tour provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded tour provider, throwing if none is configured.
 *
 * @returns The active tour provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): TourProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('Tour provider not configured. Bond a tour provider first.')
  }
  return requireSingleton<TourProvider>(BOND_TYPE)
}
