/**
 * AIVideoGeneration provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup, which registers the provider
 * in the shared `@molecule/api-bond` registry under the `'ai-video-generation'`
 * bond type. Application code calls `getProvider()`/`requireProvider()` at
 * runtime. Because wiring routes through the shared registry, a generic
 * `bond('ai-video-generation', provider)` call is equivalent to `setProvider()`
 * and `validateBonds()` can detect a missing provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { AIVideoGenerationProvider } from './types.js'

const BOND_TYPE = 'ai-video-generation'
expectBond(BOND_TYPE)

/**
 * Registers the AI video generation provider singleton.
 *
 * @param provider - The AI video generation provider implementation to register.
 */
export function setProvider(provider: AIVideoGenerationProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Returns the bonded AI video generation provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIVideoGenerationProvider | null {
  return isBonded(BOND_TYPE) ? bondRequire<AIVideoGenerationProvider>(BOND_TYPE) : null
}

/**
 * Returns whether an AI video generation provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the bonded AI video generation provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIVideoGenerationProvider {
  try {
    return bondRequire<AIVideoGenerationProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      'AIVideoGeneration provider not configured. Bond a ai-video-generation provider first.',
      { cause: error },
    )
  }
}
