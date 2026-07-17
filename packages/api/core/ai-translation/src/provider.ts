/**
 * AITranslation provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup, which registers the provider
 * in the shared `@molecule/api-bond` registry under the `'ai-translation'` bond
 * type. Application code calls `getProvider()`/`requireProvider()` at runtime.
 * Because wiring routes through the shared registry, a generic
 * `bond('ai-translation', provider)` call is equivalent to `setProvider()` and
 * `validateBonds()` can detect a missing provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { AITranslationProvider } from './types.js'

const BOND_TYPE = 'ai-translation'
expectBond(BOND_TYPE)

/**
 * Registers the AI translation provider singleton.
 *
 * @param provider - The AI translation provider implementation to register.
 */
export function setProvider(provider: AITranslationProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Returns the bonded AI translation provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AITranslationProvider | null {
  return isBonded(BOND_TYPE) ? bondRequire<AITranslationProvider>(BOND_TYPE) : null
}

/**
 * Returns whether an AI translation provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the bonded AI translation provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AITranslationProvider {
  try {
    return bondRequire<AITranslationProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      'AITranslation provider not configured. Bond a ai-translation provider first.',
      { cause: error },
    )
  }
}
