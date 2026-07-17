/**
 * AIEmbeddings provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup, which registers the provider
 * in the shared `@molecule/api-bond` registry under the `'ai-embeddings'` bond
 * type. Application code calls `getProvider()`/`requireProvider()` at runtime.
 * Because wiring routes through the shared registry, a generic
 * `bond('ai-embeddings', provider)` call is equivalent to `setProvider()` and
 * `validateBonds()` can detect a missing provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { AIEmbeddingsProvider } from './types.js'

const BOND_TYPE = 'ai-embeddings'
expectBond(BOND_TYPE)

/**
 * Registers the AI embeddings provider singleton.
 *
 * @param provider - The AI embeddings provider implementation to register.
 */
export function setProvider(provider: AIEmbeddingsProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Returns the bonded AI embeddings provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIEmbeddingsProvider | null {
  return isBonded(BOND_TYPE) ? bondRequire<AIEmbeddingsProvider>(BOND_TYPE) : null
}

/**
 * Returns whether an AI embeddings provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the bonded AI embeddings provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIEmbeddingsProvider {
  try {
    return bondRequire<AIEmbeddingsProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error('AIEmbeddings provider not configured. Bond a ai-embeddings provider first.', {
      cause: error,
    })
  }
}
