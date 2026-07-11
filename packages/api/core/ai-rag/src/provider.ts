/**
 * AI RAG bond accessor.
 *
 * Mirrors the `@molecule/api-ai` provider accessor: it supports a singleton bond
 * (`bond('ai-rag', provider)`) and named bonds (`setProvider('name', provider)`)
 * so multiple RAG strategies can coexist. The concrete implementation lives in a
 * bond package (e.g. `@molecule/api-ai-rag-llm`) — this core is interface + accessor only.
 *
 * @module
 */

import {
  bond,
  expectBond,
  get as bondGet,
  getAll as bondGetAll,
  isBonded,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { AIRagProvider } from './types.js'

const BOND_TYPE = 'ai-rag'
expectBond(BOND_TYPE)

/**
 * Registers the default AI RAG provider in singleton mode.
 *
 * @param provider - The default provider implementation for this process.
 */
export function setProvider(provider: AIRagProvider): void
/**
 * Registers a named AI RAG provider under bond type `ai-rag`.
 *
 * @param name - Provider identifier used when selecting a RAG strategy.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: AIRagProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when the first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | AIRagProvider,
  provider?: AIRagProvider,
): void {
  if (typeof nameOrProvider === 'string') {
    bond(BOND_TYPE, nameOrProvider, provider!)
    // Also register as singleton if none exists yet, so validateBonds() passes
    // and getProvider() works as a fallback.
    if (!isBonded(BOND_TYPE)) {
      bond(BOND_TYPE, provider!)
    }
  } else {
    bond(BOND_TYPE, nameOrProvider)
  }
}

/**
 * Retrieves the singleton AI RAG provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded. When
 * multiple named providers are bonded the fallback declines (returns `null`)
 * because the choice is ambiguous — those call sites must use
 * `getProviderByName(name)` explicitly.
 *
 * @returns The bonded AI RAG provider, or `null`.
 */
export function getProvider(): AIRagProvider | null {
  const singleton = bondGet<AIRagProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<AIRagProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * Retrieves a named AI RAG provider, or `null` if not bonded.
 *
 * @param name - The provider name.
 * @returns The named AI RAG provider, or `null`.
 */
export function getProviderByName(name: string): AIRagProvider | null {
  return bondGet<AIRagProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named AI RAG providers as a Map keyed by provider name.
 *
 * @returns Map of provider name → AIRagProvider.
 */
export function getAllProviders(): Map<string, AIRagProvider> {
  return bondGetAll<AIRagProvider>(BOND_TYPE)
}

/**
 * Checks whether an AI RAG provider is currently bonded.
 *
 * @param name - Optional provider name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI RAG provider, throwing if none is bonded.
 *
 * Routes through `getProvider()` so the same single-named-bond fallback applies.
 *
 * @returns The bonded AI RAG provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIRagProvider {
  const provider = getProvider()
  if (provider) return provider
  throw new Error(
    t('ai-rag.error.noProvider', undefined, {
      defaultValue: 'AI RAG provider not configured. Bond an ai-rag provider first.',
    }),
  )
}
