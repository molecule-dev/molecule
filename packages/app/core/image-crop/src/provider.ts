/**
 * Image crop provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('image-crop', provider)`, so wiring via this package's `setProvider()`
 * and via `bond('image-crop', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { ImageCropProvider } from './types.js'

const BOND_TYPE = 'image-crop'

/**
 * Registers an image crop provider as the active singleton.
 *
 * @param provider - The image crop provider implementation to bond.
 */
export function setProvider(provider: ImageCropProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded image crop provider, or `null` if none is bonded.
 *
 * @returns The active image crop provider, or `null`.
 */
export function getProvider(): ImageCropProvider | null {
  return get<ImageCropProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether an image crop provider has been bonded.
 *
 * @returns `true` if an image crop provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded image crop provider, throwing if none is configured.
 *
 * @returns The active image crop provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): ImageCropProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('ImageCrop provider not configured. Bond an image-crop provider first.')
  }
  return requireSingleton<ImageCropProvider>(BOND_TYPE)
}
