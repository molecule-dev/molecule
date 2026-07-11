/**
 * AI classification provider bond accessor.
 *
 * Mirrors the `ai` core (singleton + named). This core defines the
 * `AIClassificationProvider` contract only — bond a concrete implementation
 * (e.g. `@molecule/api-ai-classification-llm`, which composes the swappable
 * `ai` chat bond) and resolve it here via the accessor.
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

import type { AIClassificationProvider } from './types.js'

const BOND_TYPE = 'ai-classification'
expectBond(BOND_TYPE)

// ---------------------------------------------------------------------------
// Accessor — mirrors the `ai` core (singleton + named).
// ---------------------------------------------------------------------------

/**
 * Registers an AI classification provider in singleton mode.
 *
 * @param provider - The default provider implementation for this process.
 */
export function setProvider(provider: AIClassificationProvider): void
/**
 * Registers a named AI classification provider under bond type `ai-classification`.
 *
 * @param name - Provider identifier used when selecting the provider.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: AIClassificationProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when the first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | AIClassificationProvider,
  provider?: AIClassificationProvider,
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
 * Retrieves the singleton AI classification provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded. When
 * multiple named providers are bonded the fallback declines (returns `null`)
 * because the choice is ambiguous — use `getProviderByName(name)` instead.
 *
 * @returns The bonded AI classification provider, or `null`.
 */
export function getProvider(): AIClassificationProvider | null {
  const singleton = bondGet<AIClassificationProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<AIClassificationProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * Retrieves a named AI classification provider, or `null` if not bonded.
 *
 * @param name - The provider name.
 * @returns The named AI classification provider, or `null`.
 */
export function getProviderByName(name: string): AIClassificationProvider | null {
  return bondGet<AIClassificationProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named AI classification providers as a Map keyed by name.
 *
 * @returns Map of provider name → AIClassificationProvider.
 */
export function getAllProviders(): Map<string, AIClassificationProvider> {
  return bondGetAll<AIClassificationProvider>(BOND_TYPE)
}

/**
 * Checks whether an AI classification provider is currently bonded.
 *
 * @param name - Optional provider name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI classification provider, throwing if none is bonded.
 *
 * @returns The bonded AI classification provider.
 * @throws {Error} When no provider is bonded.
 */
export function requireProvider(): AIClassificationProvider {
  const found = getProvider()
  if (found) return found
  throw new Error(
    t('ai-classification.error.noProvider', undefined, {
      defaultValue:
        'AI classification provider not configured. Bond an ai-classification provider first.',
    }),
  )
}
