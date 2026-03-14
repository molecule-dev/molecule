/**
 * Internal provider registry that stores and manages all bonded providers.
 *
 * This module maintains the global singleton and named provider maps.
 * Consumer code should use the public API from `bond.ts` instead of
 * calling these functions directly.
 *
 * @module
 */

import type { BondConfig, ProviderRegistry } from './types.js'

/**
 * Global provider registry instance shared across all bond operations.
 * Contains both singleton providers (one per category) and named providers
 * (multiple per category, keyed by name).
 */
export const registry: ProviderRegistry = {
  singletons: new Map(),
  named: new Map(),
}

/**
 * Set of bond types that have been declared as expected by core packages.
 * Core packages call `expectBond(type)` at module scope so that any import
 * of the package automatically registers the requirement. After all bonds
 * are wired at startup, `validateBonds()` checks that every expected type
 * has a provider — failing fast instead of crashing later at runtime.
 */
const expectedBonds = new Set<string>()

/**
 * Current bond configuration controlling strict mode and verbosity.
 */
export let config: BondConfig = {
  strict: false,
  verbose: false,
}

/**
 * Merges new configuration options into the current bond configuration.
 *
 * @param newConfig - Partial configuration to merge. Unspecified fields retain their current values.
 */
export const configure = (newConfig: Partial<BondConfig>): void => {
  config = { ...config, ...newConfig }
}

/**
 * Registers a singleton provider for the given category. If `provider` is null/undefined,
 * the existing singleton for that category is removed instead. In strict mode, throws
 * if a provider is already bonded to the category.
 *
 * @param type - The provider category (e.g. `'email'`, `'store'`, `'logger'`).
 * @param provider - The provider instance to bond, or null/undefined to remove.
 */
export const bondSingleton = <T>(type: string, provider: T): void => {
  if (provider == null) {
    registry.singletons.delete(type)
    return
  }
  if (config.strict && registry.singletons.has(type)) {
    throw new Error(`Provider '${type}' is already bonded. Unbond first or disable strict mode.`)
  }
  registry.singletons.set(type, provider)
}

/**
 * Retrieves the singleton provider for a category, or undefined if none is bonded.
 *
 * @param type - The provider category to look up.
 * @returns The bonded provider instance cast to `T`, or `undefined` if not bonded.
 */
export const getSingleton = <T>(type: string): T | undefined => {
  return registry.singletons.get(type) as T | undefined
}

/**
 * Retrieves the singleton provider for a category, throwing if none is bonded.
 * Use this when the provider is required for the application to function.
 *
 * @param type - The provider category to look up.
 * @returns The bonded provider instance cast to `T`.
 */
export const requireSingleton = <T>(type: string): T => {
  const provider = getSingleton<T>(type)
  if (!provider) {
    throw new Error(`No '${type}' provider bonded. Bond one first using bond('${type}', provider).`)
  }
  return provider
}

/**
 * Registers a named provider under a category. Named providers allow multiple
 * implementations per category (e.g. `bond('oauth', 'github', githubProvider)`).
 * In strict mode, throws if that name is already bonded in the category.
 *
 * @param type - The provider category (e.g. `'oauth'`, `'payments'`).
 * @param name - The unique name within the category (e.g. `'github'`, `'stripe'`).
 * @param provider - The provider instance to bond.
 */
export const bondNamed = <T>(type: string, name: string, provider: T): void => {
  if (!registry.named.has(type)) {
    registry.named.set(type, new Map())
  }
  const providers = registry.named.get(type)!
  if (config.strict && providers.has(name)) {
    throw new Error(
      `Provider '${type}:${name}' is already bonded. Unbond first or disable strict mode.`,
    )
  }
  providers.set(name, provider)
}

/**
 * Retrieves a named provider from a category, or undefined if not bonded.
 *
 * @param type - The provider category to look up.
 * @param name - The provider name within the category.
 * @returns The bonded provider instance cast to `T`, or `undefined` if not found.
 */
export const getNamed = <T>(type: string, name: string): T | undefined => {
  return registry.named.get(type)?.get(name) as T | undefined
}

/**
 * Retrieves all named providers bonded under a category as a Map keyed by provider name.
 * Returns an empty Map if no providers are bonded for the category.
 *
 * @param type - The provider category to look up.
 * @returns A Map from provider name to provider instance for the given category.
 */
export const getAllNamed = <T>(type: string): Map<string, T> => {
  return (registry.named.get(type) as Map<string, T>) || new Map()
}

/**
 * Retrieves a named provider from a category, throwing if not bonded.
 * Use this when the provider is required for the application to function.
 *
 * @param type - The provider category to look up.
 * @param name - The provider name within the category.
 * @returns The bonded provider instance cast to `T`.
 */
export const requireNamed = <T>(type: string, name: string): T => {
  const provider = getNamed<T>(type, name)
  if (!provider) {
    throw new Error(
      `No '${type}:${name}' provider bonded. Bond one first using bond('${type}', '${name}', provider).`,
    )
  }
  return provider
}

/**
 * Removes a singleton provider from a category.
 *
 * @param type - The provider category to unbond.
 * @returns `true` if a provider was removed, `false` if none was bonded.
 */
export const unbondSingleton = (type: string): boolean => {
  return registry.singletons.delete(type)
}

/**
 * Removes a named provider from a category.
 *
 * @param type - The provider category containing the named provider.
 * @param name - The provider name to remove.
 * @returns `true` if the provider was removed, `false` if it was not found.
 */
export const unbondNamed = (type: string, name: string): boolean => {
  return registry.named.get(type)?.delete(name) ?? false
}

/**
 * Removes all providers (both singleton and named) for a given category.
 *
 * @param type - The provider category to clear.
 */
export const clearProviders = (type: string): void => {
  registry.singletons.delete(type)
  registry.named.delete(type)
}

/**
 * Removes all bonded providers across all categories, restoring the registry
 * to its initial empty state. Primarily used in test teardown.
 */
export const reset = (): void => {
  registry.singletons.clear()
  registry.named.clear()
}

/**
 * Declares a bond type as expected by a core package. Called at module scope
 * so that importing the core package automatically registers the requirement.
 *
 * @example
 * ```typescript
 * // In @molecule/api-config provider.ts (module scope):
 * import { expectBond } from '@molecule/api-bond'
 * const BOND_TYPE = 'config'
 * expectBond(BOND_TYPE)
 * ```
 *
 * @param type - The bond category that must be wired before the app starts.
 */
export const expectBond = (type: string): void => {
  expectedBonds.add(type)
}

/**
 * Removes a bond type from the expected set. Call this when an optional
 * bond setup fails and the application has decided it can run without it.
 *
 * @param type - The bond category to remove from the expected set.
 */
export const unexpectBond = (type: string): void => {
  expectedBonds.delete(type)
}

/**
 * Validates that every expected bond type has a provider registered.
 * Call this after all bonds are wired in `setupBonds()`. Throws with a
 * clear message listing all missing bonds so the developer can fix them
 * all at once instead of hitting them one-by-one at runtime.
 *
 * @throws {Error} If any expected bond types are missing providers.
 */
export const validateBonds = (): void => {
  const missing: string[] = []
  for (const type of expectedBonds) {
    if (!registry.singletons.has(type)) {
      missing.push(type)
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required bond providers: ${missing.join(', ')}. ` +
        `Wire them in setupBonds() before starting the server.`,
    )
  }
}
