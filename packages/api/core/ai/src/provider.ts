/**
 * AI provider bond accessor.
 *
 * Supports both singleton and named providers. Singleton mode bonds a single
 * AI provider for simple apps. Named mode (`setProvider('anthropic', provider)`)
 * allows multiple providers to coexist — the consumer picks the right one based
 * on the model's provider ID.
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

import type { AIProvider } from './types.js'

const BOND_TYPE = 'ai'
expectBond(BOND_TYPE)

/**
 * Registers an AI provider in singleton mode.
 *
 * - **Singleton**: `setProvider(provider)` — bonds a single default provider.
 *
 * @param provider - The default provider implementation for this process.
 */
export function setProvider(provider: AIProvider): void
/**
 * Registers a named AI provider under bond type `ai`.
 *
 * - **Named**: `setProvider('anthropic', provider)` — bonds a named provider
 *   alongside others (e.g. `'xai'`, `'openai'`).
 *
 * @param name - Provider identifier used when selecting models.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: AIProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when first arg is a name).
 */
export function setProvider(nameOrProvider: string | AIProvider, provider?: AIProvider): void {
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
 * Retrieves the singleton AI provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded —
 * this lets apps that wire `bond('ai', 'anthropic', provider)` directly
 * (without going through `setProvider`'s singleton-fallback) still work
 * with code that uses the simple `getProvider()` / `requireProvider()`
 * accessors. When multiple named providers are bonded, the fallback
 * declines (returns `null`) because the choice is ambiguous — those
 * call sites must use `getProviderByName(name)` explicitly.
 *
 * @returns The bonded AI provider, or `null`.
 */
export function getProvider(): AIProvider | null {
  const singleton = bondGet<AIProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<AIProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * Retrieves a named AI provider, or `null` if not bonded.
 *
 * @param name - The provider name (e.g. `'anthropic'`, `'xai'`).
 * @returns The named AI provider, or `null`.
 */
export function getProviderByName(name: string): AIProvider | null {
  return bondGet<AIProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named AI providers as a Map keyed by provider name.
 *
 * @returns Map of provider name → AIProvider.
 */
export function getAllProviders(): Map<string, AIProvider> {
  return bondGetAll<AIProvider>(BOND_TYPE)
}

/**
 * Checks whether an AI provider is currently bonded.
 *
 * @param name - Optional provider name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI provider, throwing if none is bonded.
 * Use this when AI functionality is required.
 *
 * Routes through `getProvider()` so the same single-named-bond fallback
 * applies — apps that wire `bond('ai', 'anthropic', provider)` directly
 * still satisfy this call without having to switch to the explicit
 * `getProviderByName()` pattern.
 *
 * @returns The bonded AI provider.
 */
export function requireProvider(): AIProvider {
  const provider = getProvider()
  if (provider) return provider
  throw new Error(
    t('ai.error.noProvider', undefined, {
      defaultValue: 'AI provider not configured. Bond an AI provider first.',
    }),
  )
}
