/**
 * AIVectorStore provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup, which registers the provider
 * in the shared `@molecule/api-bond` registry under the `'ai-vector-store'` bond
 * type. Application code calls `getProvider()`/`requireProvider()` at runtime.
 * Because wiring routes through the shared registry, a generic
 * `bond('ai-vector-store', provider)` call is equivalent to `setProvider()` and
 * `validateBonds()` can detect a missing provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { AIVectorStoreProvider } from './types.js'

const BOND_TYPE = 'ai-vector-store'
expectBond(BOND_TYPE)

/**
 * Set the active vector store provider.
 *
 * @param provider - The vector store provider to register.
 */
export function setProvider(provider: AIVectorStoreProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the active vector store provider, or null if none is configured.
 *
 * @returns The current provider or null.
 */
export function getProvider(): AIVectorStoreProvider | null {
  return isBonded(BOND_TYPE) ? bondRequire<AIVectorStoreProvider>(BOND_TYPE) : null
}

/**
 * Check whether a vector store provider is configured.
 *
 * @returns True if a provider has been set.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Get the active vector store provider, throwing if none is configured.
 *
 * @returns The current provider.
 * @throws {Error} if no provider has been set.
 */
export function requireProvider(): AIVectorStoreProvider {
  try {
    return bondRequire<AIVectorStoreProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      'AIVectorStore provider not configured. Bond a ai-vector-store provider first.',
      { cause: error },
    )
  }
}
