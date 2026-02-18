/**
 * Bond API — fully dynamic provider bonding functions for the app stack.
 *
 * All provider categories are treated uniformly — no hardcoded
 * category methods. Use string category names for bonding, getting,
 * requiring, unbonding, and checking.
 *
 * @example
 * ```typescript
 * import { bond, get, require as bondRequire, isBonded } from '`@molecule/app-bond`'
 *
 * // Singleton providers
 * bond('state', zustandProvider)
 * bond('theme', cssVariablesProvider)
 *
 * // Named providers
 * bond('routing', 'react', reactRouterProvider)
 *
 * // Getting
 * const state = get<StateProvider>('state')
 * const router = get<RoutingProvider>('routing', 'react')
 *
 * // Requiring (throws if not bonded)
 * const theme = bondRequire<ThemeProvider>('theme')
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
 * bond('state', zustandProvider)              // singleton
 * bond('routing', 'react', reactProvider)     // named
 * ```
 *
 * @param type - The provider category (e.g. `'state'`, `'theme'`, `'routing'`).
 * @param provider - The provider instance to bond as a singleton.
 */
export function bond(type: string, provider: unknown): void
/**
 * Registers a named provider under a category, allowing multiple providers per category.
 *
 * @param type - The provider category (e.g. `'routing'`, `'oauth'`).
 * @param name - The unique name within the category (e.g. `'react'`, `'github'`).
 * @param provider - The provider instance to bond.
 */
export function bond(type: string, name: string, provider: unknown): void
/**
 * Registers a provider at runtime (implementation overload).
 * @param type - The provider category.
 * @param nameOrProvider - Either a name string (for named bonding) or the provider instance (for singleton bonding).
 * @param provider - The provider instance when bonding by name.
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
 * const state = get<StateProvider>('state')
 * const router = get<RoutingProvider>('routing', 'react')
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
 * Retrieves a bonded provider by category and optional name (implementation overload).
 * @param type - The provider category to look up.
 * @param name - The optional provider name within the category.
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
 * const allRouting = getAll<RoutingProvider>('routing')
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
 * import { require as bondRequire } from '`@molecule/app-bond`'
 * const theme = bondRequire<ThemeProvider>('theme')
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
 * Retrieves a bonded provider, throwing if not found (implementation overload).
 * @param type - The provider category to look up.
 * @param name - The optional provider name within the category.
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
 * unbond('state')                  // singleton
 * unbond('routing', 'react')       // named
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
 * Removes a bonded provider by category and optional name (implementation overload).
 * @param type - The provider category to unbond.
 * @param name - The optional provider name to remove.
 * @returns `true` if a provider was removed, `false` if none was found.
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
 * unbondAll('routing')  // removes all routing providers
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
 * if (isBonded('theme')) { ... }
 * if (isBonded('routing', 'react')) { ... }
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
 * Checks whether a provider is bonded by category and optional name (implementation overload).
 * @param type - The provider category to check.
 * @param name - The optional provider name within the category.
 * @returns `true` if the provider is bonded.
 * @internal
 */
export function isBonded(type: string, name?: string): boolean {
  if (name !== undefined) return registry.named.get(type)?.has(name) ?? false
  return registry.singletons.has(type)
}
