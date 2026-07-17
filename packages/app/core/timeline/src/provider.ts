/**
 * Timeline provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('timeline', provider)`, so wiring via this package's `setProvider()` and
 * via `bond('timeline', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { TimelineProvider } from './types.js'

const BOND_TYPE = 'timeline'

/**
 * Registers a timeline provider as the active singleton.
 *
 * @param provider - The timeline provider implementation to bond.
 */
export function setProvider(provider: TimelineProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded timeline provider, or `null` if none is bonded.
 *
 * @returns The active timeline provider, or `null`.
 */
export function getProvider(): TimelineProvider | null {
  return get<TimelineProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a timeline provider has been bonded.
 *
 * @returns `true` if a timeline provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded timeline provider, throwing if none is configured.
 *
 * @returns The active timeline provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): TimelineProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('Timeline provider not configured. Bond a timeline provider first.')
  }
  return requireSingleton<TimelineProvider>(BOND_TYPE)
}
