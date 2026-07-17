/**
 * AIImageGeneration provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup, which registers the provider
 * in the shared `@molecule/api-bond` registry under the `'ai-image-generation'`
 * bond type. Application code calls `getProvider()`/`requireProvider()` at
 * runtime. Because wiring routes through the shared registry, a generic
 * `bond('ai-image-generation', provider)` call is equivalent to `setProvider()`
 * and `validateBonds()` can detect a missing provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { AIImageGenerationProvider } from './types.js'

const BOND_TYPE = 'ai-image-generation'
expectBond(BOND_TYPE)

/**
 * Registers the AI image generation provider singleton.
 *
 * @param provider - The AI image generation provider implementation to register.
 */
export function setProvider(provider: AIImageGenerationProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Returns the bonded AI image generation provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIImageGenerationProvider | null {
  return isBonded(BOND_TYPE) ? bondRequire<AIImageGenerationProvider>(BOND_TYPE) : null
}

/**
 * Returns whether an AI image generation provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the bonded AI image generation provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIImageGenerationProvider {
  try {
    return bondRequire<AIImageGenerationProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      'AIImageGeneration provider not configured. Bond a ai-image-generation provider first.',
      { cause: error },
    )
  }
}
