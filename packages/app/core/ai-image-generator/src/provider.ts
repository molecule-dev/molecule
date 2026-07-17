/**
 * AIImageGenerator provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('ai-image-generator', provider)`, so wiring via this package's
 * `setProvider()` and via `bond('ai-image-generator', …)` write the SAME
 * registry slot — use either. Application code calls `getProvider()` /
 * `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { AIImageGeneratorProvider } from './types.js'

const BOND_TYPE = 'ai-image-generator'

/**
 * Registers the active image generator provider.
 *
 * @param provider - The provider implementation to bond.
 */
export function setProvider(provider: AIImageGeneratorProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Returns the bonded image generator provider, or `null` if none is set.
 *
 * @returns The active provider or `null`.
 */
export function getProvider(): AIImageGeneratorProvider | null {
  return get<AIImageGeneratorProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether an image generator provider has been bonded.
 *
 * @returns `true` if a provider is configured.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the bonded image generator provider or throws if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} If no provider has been bonded.
 */
export function requireProvider(): AIImageGeneratorProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error(
      'AIImageGenerator provider not configured. Bond an ai-image-generator provider first.',
    )
  }
  return requireSingleton<AIImageGeneratorProvider>(BOND_TYPE)
}
