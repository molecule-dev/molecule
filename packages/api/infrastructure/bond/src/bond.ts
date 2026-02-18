/**
 * Bond API - Fully dynamic provider bonding functions.
 *
 * All provider categories are treated uniformly — no hardcoded
 * category methods. Use string category names for bonding, getting,
 * requiring, unbonding, and checking.
 *
 * @example
 * ```typescript
 * import { bond, get, require as bondRequire, isBonded } from '`@molecule/api-bond`'
 *
 * // Singleton providers
 * bond('email', sendgridProvider)
 * bond('store', pgStore)
 *
 * // Named providers
 * bond('oauth', 'github', githubProvider)
 * bond('payments', 'stripe', stripeProvider)
 *
 * // Getting
 * const email = get<EmailTransport>('email')
 * const stripe = get<PaymentProvider>('payments', 'stripe')
 *
 * // Requiring (throws if not bonded)
 * const plans = bondRequire<PlanService>('plans')
 * ```
 *
 * @module
 */

import {
  bondNamed,
  bondSingleton,
  clearProviders,
  getAllNamed,
  getNamed,
  getSingleton,
  registry,
  requireNamed,
  requireSingleton,
  unbondNamed,
  unbondSingleton,
} from './registry.js'

/**
 * Registers a provider at runtime. With two arguments, bonds a singleton
 * provider for the category. With three arguments, bonds a named provider
 * under the category.
 *
 * @example
 * ```typescript
 * bond('email', sendgridProvider)              // singleton
 * bond('payments', 'stripe', stripeProvider)    // named
 * ```
 *
 * @param type - The provider category (e.g. `'email'`, `'payments'`, `'oauth'`).
 * @param provider - The provider instance to bond as a singleton.
 */
export function bond(type: string, provider: unknown): void
/**
 * Registers a named provider under a category, allowing multiple providers per category.
 *
 * @param type - The provider category (e.g. `'oauth'`, `'payments'`).
 * @param name - The unique name within the category (e.g. `'github'`, `'stripe'`).
 * @param provider - The provider instance to bond.
 */
export function bond(type: string, name: string, provider: unknown): void
/**
 * Implementation signature for bond registration.
 * @param type - The provider category.
 * @param nameOrProvider - Either a provider name (string) or the provider instance itself.
 * @param provider - The provider instance when bonding a named provider.
 * @internal
 */
export function bond(type: string, nameOrProvider: unknown, provider?: unknown): void {
  if (typeof nameOrProvider === 'string' && provider !== undefined) {
    bondNamed(type, nameOrProvider, provider)
  } else {
    bondSingleton(type, nameOrProvider)
  }
}

/**
 * Retrieves a bonded singleton provider by category, or undefined if not bonded.
 *
 * @example
 * ```typescript
 * const email = get<EmailTransport>('email')
 * const stripe = get<PaymentProvider>('payments', 'stripe')
 * ```
 *
 * @param type - The provider category to look up.
 * @returns The bonded provider instance, or `undefined` if not bonded.
 */
export function get<T = unknown>(type: string): T | undefined
/**
 * Retrieves a bonded named provider by category and name, or undefined if not found.
 *
 * @param type - The provider category to look up.
 * @param name - The provider name within the category.
 * @returns The bonded provider instance, or `undefined` if not found.
 */
export function get<T = unknown>(type: string, name: string): T | undefined
/**
 * Implementation signature for provider retrieval.
 * @param type - The provider category to look up.
 * @param name - Optional provider name for named providers.
 * @returns The bonded provider instance, or `undefined` if not found.
 * @internal
 */
export function get<T = unknown>(type: string, name?: string): T | undefined {
  if (name !== undefined) return getNamed<T>(type, name)
  return getSingleton<T>(type)
}

/**
 * Retrieves all named providers bonded under a category. Returns an empty
 * Map if no named providers exist for the category.
 *
 * @example
 * ```typescript
 * const allPayments = getAll<PaymentProvider>('payments')
 * const allOAuth = getAll<OAuthVerifier>('oauth')
 * ```
 *
 * @param type - The provider category to look up.
 * @returns A Map from provider name to provider instance.
 */
export function getAll<T = unknown>(type: string): Map<string, T> {
  return getAllNamed<T>(type)
}

/**
 * Retrieves a bonded singleton provider, throwing if not bonded.
 * Use this when the provider is required for the application to function.
 *
 * @example
 * ```typescript
 * import { require as bondRequire } from '`@molecule/api-bond`'
 * const stripe = bondRequire<PaymentProvider>('payments', 'stripe')
 * const plans = bondRequire<PlanService>('plans')
 * ```
 *
 * @param type - The provider category to look up.
 * @returns The bonded provider instance.
 */
function requireProvider<T = unknown>(type: string): T
/**
 * Retrieves a bonded named provider, throwing if not bonded.
 *
 * @param type - The provider category to look up.
 * @param name - The provider name within the category.
 * @returns The bonded provider instance.
 */
function requireProvider<T = unknown>(type: string, name: string): T
/**
 * Implementation signature for required provider retrieval.
 * @param type - The provider category to look up.
 * @param name - Optional provider name for named providers.
 * @returns The bonded provider instance.
 * @internal
 */
function requireProvider<T = unknown>(type: string, name?: string): T {
  if (name !== undefined) return requireNamed<T>(type, name)
  return requireSingleton<T>(type)
}

export { requireProvider as require }

/**
 * Removes a bonded singleton provider from a category.
 *
 * @example
 * ```typescript
 * unbond('email')                  // singleton
 * unbond('payments', 'stripe')     // named
 * ```
 *
 * @param type - The provider category to unbond.
 * @returns `true` if a provider was removed, `false` if none was bonded.
 */
export function unbond(type: string): boolean
/**
 * Removes a bonded named provider from a category.
 *
 * @param type - The provider category containing the named provider.
 * @param name - The provider name to remove.
 * @returns `true` if the provider was removed, `false` if it was not found.
 */
export function unbond(type: string, name: string): boolean
/**
 * Implementation signature for provider unbonding.
 * @param type - The provider category to unbond.
 * @param name - Optional provider name for named providers.
 * @returns `true` if a provider was removed, `false` otherwise.
 * @internal
 */
export function unbond(type: string, name?: string): boolean {
  if (name !== undefined) return unbondNamed(type, name)
  return unbondSingleton(type)
}

/**
 * Removes all providers (both singleton and named) for a category.
 *
 * @example
 * ```typescript
 * unbondAll('payments')  // removes all payment providers
 * unbondAll('oauth')     // removes all OAuth providers
 * ```
 *
 * @param type - The provider category to clear entirely.
 */
export function unbondAll(type: string): void {
  clearProviders(type)
}

/**
 * Checks whether a singleton provider is bonded for a category.
 *
 * @example
 * ```typescript
 * if (isBonded('payments', 'stripe')) { ... }
 * if (isBonded('email')) { ... }
 * ```
 *
 * @param type - The provider category to check.
 * @returns `true` if a singleton provider is bonded for the category.
 */
export function isBonded(type: string): boolean
/**
 * Checks whether a named provider is bonded within a category.
 *
 * @param type - The provider category to check.
 * @param name - The provider name within the category.
 * @returns `true` if the named provider is bonded.
 */
export function isBonded(type: string, name: string): boolean
/**
 * Implementation signature for checking if a provider is bonded.
 * @param type - The provider category to check.
 * @param name - Optional provider name for named providers.
 * @returns `true` if the provider is bonded.
 * @internal
 */
export function isBonded(type: string, name?: string): boolean {
  if (name !== undefined) return registry.named.get(type)?.has(name) ?? false
  return registry.singletons.has(type)
}
