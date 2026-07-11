/**
 * AI agents provider bond accessor.
 *
 * Mirrors the `ai` core (singleton + named modes over the `@molecule/api-bond`
 * registry). This core is interface-only: the default tool-calling agent
 * implementation lives in the `@molecule/api-ai-agents-llm` bond package. Bond a
 * provider with `bond('ai-agents', provider)` and drive it with
 * `requireProvider().run({ task, tools })`.
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

import type { AIAgentsProvider } from './types.js'

const BOND_TYPE = 'ai-agents'
expectBond(BOND_TYPE)

/**
 * Registers an AI agents provider in singleton mode.
 *
 * @param provider - The default provider implementation for this process.
 */
export function setProvider(provider: AIAgentsProvider): void
/**
 * Registers a named AI agents provider under bond type `ai-agents`.
 *
 * @param name - Provider identifier used when selecting an implementation.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: AIAgentsProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when the first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | AIAgentsProvider,
  provider?: AIAgentsProvider,
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
 * Retrieves the singleton AI agents provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded. When
 * multiple named providers are bonded the fallback declines (returns `null`)
 * because the choice is ambiguous.
 *
 * @returns The bonded AI agents provider, or `null`.
 */
export function getProvider(): AIAgentsProvider | null {
  const singleton = bondGet<AIAgentsProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<AIAgentsProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * Retrieves a named AI agents provider, or `null` if not bonded.
 *
 * @param name - The provider name.
 * @returns The named AI agents provider, or `null`.
 */
export function getProviderByName(name: string): AIAgentsProvider | null {
  return bondGet<AIAgentsProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named AI agents providers as a Map keyed by provider name.
 *
 * @returns Map of provider name → AIAgentsProvider.
 */
export function getAllProviders(): Map<string, AIAgentsProvider> {
  return bondGetAll<AIAgentsProvider>(BOND_TYPE)
}

/**
 * Checks whether an AI agents provider is currently bonded.
 *
 * @param name - Optional provider name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI agents provider, throwing if none is bonded.
 *
 * @returns The bonded AI agents provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIAgentsProvider {
  const provider = getProvider()
  if (provider) return provider
  throw new Error(
    t('ai-agents.error.noProvider', undefined, {
      defaultValue: 'AI agents provider not configured. Bond an ai-agents provider first.',
    }),
  )
}
