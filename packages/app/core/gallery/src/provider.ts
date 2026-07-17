/**
 * Gallery provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('gallery', provider)`, so wiring via this package's `setProvider()` and
 * via `bond('gallery', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { GalleryProvider } from './types.js'

const BOND_TYPE = 'gallery'

/**
 * Registers a gallery provider as the active singleton.
 *
 * @param provider - The gallery provider implementation to bond.
 */
export function setProvider(provider: GalleryProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded gallery provider, or `null` if none is bonded.
 *
 * @returns The active gallery provider, or `null`.
 */
export function getProvider(): GalleryProvider | null {
  return get<GalleryProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a gallery provider has been bonded.
 *
 * @returns `true` if a gallery provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded gallery provider, throwing if none is configured.
 *
 * @returns The active gallery provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): GalleryProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('Gallery provider not configured. Bond a gallery provider first.')
  }
  return requireSingleton<GalleryProvider>(BOND_TYPE)
}
