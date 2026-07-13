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
 * Whether the current singleton bond was auto-promoted by the FIRST
 * `setProvider(name, provider)` call (as opposed to an explicit
 * `setProvider(provider)` call). Auto-promotion is a convenience default for
 * the common single-named-provider case; once a second, differently-named
 * provider is registered, which provider the auto-promoted singleton points
 * at becomes an accident of registration order, not a real choice — see
 * `getProvider()`. An explicit singleton always wins regardless of how many
 * named providers exist.
 */
let singletonAutoPromoted = false

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
 * @remarks
 * The FIRST call to `setProvider(name, provider)` also auto-promotes that
 * provider to the singleton (so `getProvider()`/`requireProvider()` work
 * without callers having to know the name) — this is a convenience for the
 * common single-provider case, not a permanent "first one wins" pick. Once a
 * SECOND differently-named provider is registered, `getProvider()` stops
 * returning the auto-promoted singleton and declines (`null`) instead,
 * matching the documented ambiguity rule — see `getProvider()`. Call
 * `setProvider(provider)` (no name) if you want a singleton that always wins
 * regardless of how many named providers exist.
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
    // and getProvider() works as a fallback. Track that this singleton was an
    // auto-promotion (not an explicit `setProvider(provider)` call) so
    // getProvider() can later decline once the pick becomes ambiguous.
    if (!isBonded(BOND_TYPE)) {
      bond(BOND_TYPE, provider!)
      singletonAutoPromoted = true
    }
  } else {
    bond(BOND_TYPE, nameOrProvider)
    singletonAutoPromoted = false
  }
}

/**
 * Resolves the effective singleton: the provider `getProvider()` should
 * return, plus whether the "no provider" case is actually an ambiguous
 * multi-provider case (useful for a more actionable `requireProvider()`
 * error).
 *
 * @returns The resolved provider (or `null`) and whether `null` means
 *   "ambiguous" rather than "nothing bonded".
 */
function resolveSingleton(): { provider: AIAgentsProvider | null; ambiguous: boolean } {
  const singleton = bondGet<AIAgentsProvider>(BOND_TYPE)
  if (singleton) {
    // An auto-promoted singleton is a convenience default for the
    // single-named-provider case. Once a second distinct name is registered,
    // continuing to return the FIRST-registered provider would silently let
    // registration order decide which provider answers — decline instead,
    // matching the documented "ambiguous → null" rule below. An explicitly
    // bonded singleton (`setProvider(provider)`) always wins.
    if (singletonAutoPromoted && bondGetAll<AIAgentsProvider>(BOND_TYPE).size > 1) {
      return { provider: null, ambiguous: true }
    }
    return { provider: singleton, ambiguous: false }
  }
  const named = bondGetAll<AIAgentsProvider>(BOND_TYPE)
  if (named.size === 1) return { provider: named.values().next().value ?? null, ambiguous: false }
  return { provider: null, ambiguous: named.size > 1 }
}

/**
 * Retrieves the singleton AI agents provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded. When
 * multiple named providers are bonded the fallback declines (returns `null`)
 * because the choice is ambiguous.
 *
 * This also applies to an auto-promoted singleton: `setProvider('a', p1)`
 * followed by `setProvider('b', p2)` does NOT leave `getProvider()` stuck
 * returning `p1` forever — once `'b'` is registered the pick is genuinely
 * ambiguous and `getProvider()` declines (`null`), same as if neither had
 * been auto-promoted. An explicit `setProvider(provider)` singleton is
 * unaffected by how many named providers exist.
 *
 * @returns The bonded AI agents provider, or `null`.
 */
export function getProvider(): AIAgentsProvider | null {
  return resolveSingleton().provider
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
 * Routes through the same resolution as `getProvider()` so the single-named-
 * bond fallback applies — apps that wire `bond('ai-agents', 'llm', provider)`
 * directly still satisfy this call without having to switch to the explicit
 * `getProviderByName()` pattern. When resolution declined because MULTIPLE
 * named providers are bonded with no explicit singleton, the thrown message
 * says so (distinct from "nothing bonded at all") and points at
 * `getProviderByName()`.
 *
 * @returns The bonded AI agents provider.
 * @throws {Error} When no provider has been bonded, or when the singleton
 *   pick is ambiguous (multiple named providers, no explicit default).
 */
export function requireProvider(): AIAgentsProvider {
  const { provider, ambiguous } = resolveSingleton()
  if (provider) return provider
  if (ambiguous) {
    throw new Error(
      t('ai-agents.error.ambiguousProvider', undefined, {
        defaultValue:
          'Multiple named AI agents providers are bonded and no default was set. Use getProviderByName(name) to select one.',
      }),
    )
  }
  throw new Error(
    t('ai-agents.error.noProvider', undefined, {
      defaultValue: 'AI agents provider not configured. Bond an ai-agents provider first.',
    }),
  )
}
