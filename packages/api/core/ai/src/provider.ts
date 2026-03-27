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
  require as bondRequire,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { AIProvider } from './types.js'

const BOND_TYPE = 'ai'
expectBond(BOND_TYPE)

/**
 * Registers an AI provider. Supports two modes:
 *
 * - **Singleton**: `setProvider(provider)` — bonds a single default provider.
 * - **Named**: `setProvider('anthropic', provider)` — bonds a named provider
 *   alongside others (e.g. `'xai'`, `'openai'`).
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when first arg is a name).
 */
export function setProvider(provider: AIProvider): void
export function setProvider(name: string, provider: AIProvider): void
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
 * @returns The bonded AI provider, or `null`.
 */
export function getProvider(): AIProvider | null {
  return bondGet<AIProvider>(BOND_TYPE) ?? null
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
 * @returns The bonded AI provider.
 */
export function requireProvider(): AIProvider {
  try {
    return bondRequire<AIProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('ai.error.noProvider', undefined, {
        defaultValue: 'AI provider not configured. Bond an AI provider first.',
      }),
    )
  }
}
