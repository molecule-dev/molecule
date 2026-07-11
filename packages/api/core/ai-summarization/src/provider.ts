/**
 * AI summarization provider bond accessor.
 *
 * Mirrors the `@molecule/api-ai` core: providers are wired through the
 * `@molecule/api-bond` registry under bond type `ai-summarization`, so
 * `bond('ai-summarization', provider)` and these typed accessors stay in sync.
 * Supports both a singleton and named providers.
 *
 * This core defines the contract only — it ships no concrete provider. Bond the
 * batteries-included default from `@molecule/api-ai-summarization-llm`, or any
 * custom `AISummarizationProvider`.
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

import type { AISummarizationProvider } from './types.js'

const BOND_TYPE = 'ai-summarization'
expectBond(BOND_TYPE)

/**
 * Registers an AI summarization provider in singleton mode.
 *
 * - **Singleton**: `setProvider(provider)` — bonds a single default provider.
 *
 * @param provider - The default provider implementation for this process.
 */
export function setProvider(provider: AISummarizationProvider): void
/**
 * Registers a named AI summarization provider under bond type `ai-summarization`.
 *
 * - **Named**: `setProvider('fast', provider)` — bonds a named provider
 *   alongside others.
 *
 * @param name - Provider identifier used when selecting a provider.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: AISummarizationProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when the first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | AISummarizationProvider,
  provider?: AISummarizationProvider,
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
 * Retrieves the singleton AI summarization provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded — this lets
 * apps that wire `bond('ai-summarization', 'fast', provider)` directly still
 * work with the simple `getProvider()` / `requireProvider()` accessors. When
 * multiple named providers are bonded, the fallback declines (returns `null`)
 * because the choice is ambiguous.
 *
 * @returns The bonded AI summarization provider, or `null`.
 */
export function getProvider(): AISummarizationProvider | null {
  const singleton = bondGet<AISummarizationProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<AISummarizationProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * Retrieves a named AI summarization provider, or `null` if not bonded.
 *
 * @param name - The provider name.
 * @returns The named provider, or `null`.
 */
export function getProviderByName(name: string): AISummarizationProvider | null {
  return bondGet<AISummarizationProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named AI summarization providers as a Map keyed by name.
 *
 * @returns Map of provider name → AISummarizationProvider.
 */
export function getAllProviders(): Map<string, AISummarizationProvider> {
  return bondGetAll<AISummarizationProvider>(BOND_TYPE)
}

/**
 * Checks whether an AI summarization provider is currently bonded.
 *
 * @param name - Optional provider name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI summarization provider, throwing if none is bonded.
 *
 * @returns The bonded provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AISummarizationProvider {
  const bonded = getProvider()
  if (bonded) return bonded
  throw new Error(
    t('ai-summarization.error.noProvider', undefined, {
      defaultValue:
        'AI summarization provider not configured. Bond an AI summarization provider first.',
    }),
  )
}
