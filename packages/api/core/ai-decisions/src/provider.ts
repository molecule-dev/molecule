/**
 * AI decisions provider bond accessor (singleton + named, like the `ai` core).
 *
 * This core defines the `AIDecisionsProvider` contract only — bond a concrete
 * implementation (`@molecule/api-ai-decisions-laya`, `-jev` or `-llm`).
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

import type { AIDecisionsProvider } from './types.js'

const BOND_TYPE = 'ai-decisions'
expectBond(BOND_TYPE)

// ---------------------------------------------------------------------------
// Accessor — mirrors the `ai` core (singleton + named).
// ---------------------------------------------------------------------------

/**
 * Registers an AI decisions provider in singleton mode.
 *
 * @param provider - The default provider implementation for this process.
 */
export function setProvider(provider: AIDecisionsProvider): void
/**
 * Registers a named AI decisions provider under bond type `ai-decisions`.
 *
 * @param name - Provider identifier used when selecting the provider.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: AIDecisionsProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when the first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | AIDecisionsProvider,
  provider?: AIDecisionsProvider,
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
 * Retrieves the singleton AI decisions provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded. When
 * multiple named providers are bonded the fallback declines (returns `null`)
 * because the choice is ambiguous — use `getProviderByName(name)` instead.
 *
 * @returns The bonded AI decisions provider, or `null`.
 */
export function getProvider(): AIDecisionsProvider | null {
  const singleton = bondGet<AIDecisionsProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<AIDecisionsProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * Retrieves a named AI decisions provider, or `null` if not bonded.
 *
 * @param name - The provider name.
 * @returns The named AI decisions provider, or `null`.
 */
export function getProviderByName(name: string): AIDecisionsProvider | null {
  return bondGet<AIDecisionsProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named AI decisions providers as a Map keyed by name.
 *
 * @returns Map of provider name → AIDecisionsProvider.
 */
export function getAllProviders(): Map<string, AIDecisionsProvider> {
  return bondGetAll<AIDecisionsProvider>(BOND_TYPE)
}

/**
 * Checks whether an AI decisions provider is currently bonded.
 *
 * @param name - Optional provider name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI decisions provider, throwing if none is bonded.
 *
 * @returns The bonded AI decisions provider.
 * @throws {Error} When no provider is bonded.
 */
export function requireProvider(): AIDecisionsProvider {
  const found = getProvider()
  if (found) return found
  throw new Error(
    t('ai-decisions.error.noProvider', undefined, {
      defaultValue:
        'AI decisions provider not configured. Bond an ai-decisions provider (Laya, Jev or the LLM bond) first.',
    }),
  )
}
