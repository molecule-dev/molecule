/**
 * Internal provider registry that stores and manages all bonded app-side providers.
 *
 * This module maintains the global singleton and named provider maps.
 * Consumer code should use the public API from `bond.ts` instead of
 * calling these functions directly.
 *
 * @module
 */

import { firstCallerOutsideMolecule } from './caller.js'
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
 * The first provider bonded since the last {@link reset}, plus the call site
 * that bonded it.
 *
 * `undefined` means the app's bond setup has not run yet — so a failed
 * accessor is an ORDER problem (it ran at import time). Once set, the setup
 * HAS run, so a failed accessor means that category was never wired, and the
 * recorded call site names the setup file to add it to.
 */
let firstBond: { type: string; name?: string; caller?: string } | undefined

/**
 * Records the first bond of a process and where it came from. Called by
 * {@link bondSingleton} and {@link bondNamed} before they mutate the
 * registry; later bonds are ignored, so the recorded call site is the setup
 * that ran first.
 *
 * @param type - The provider category being bonded.
 * @param name - The provider name for a named bond, or `undefined` for a
 *   singleton.
 */
const recordFirstBond = (type: string, name: string | undefined): void => {
  if (firstBond) return
  const caller = firstCallerOutsideMolecule()
  firstBond = caller === undefined ? { type, name } : { type, name, caller }
}

/**
 * Builds the "no provider bonded" error message, distinguishing the two cases
 * that need different fixes:
 *
 * 1. **Nothing has been bonded yet** — the app's `setupProviders()` has not
 *    run, so the call is almost certainly at a module's top level (it runs at
 *    import time, before the bootstrap executes). The message says to move the
 *    call inside a function/hook/effect.
 * 2. **Other categories are bonded** — the setup ran and simply never wired
 *    this one. The message is the original one plus the setup file observed to
 *    do the bonding and where to add the missing `bond(...)` call.
 *
 * The caller (first frame outside `@molecule/*`) is named in both cases, so
 * the reader does not have to walk the stack themselves.
 *
 * @param type - The provider category that is missing.
 * @param name - The provider name for a named lookup, or `undefined` for a
 *   singleton lookup.
 * @returns The error message.
 */
const missingProviderMessage = (type: string, name: string | undefined): string => {
  const label = name === undefined ? `'${type}'` : `'${type}:${name}'`
  const bondCall =
    name === undefined ? `bond('${type}', provider)` : `bond('${type}', '${name}', provider)`
  const caller = firstCallerOutsideMolecule()
  const calledFrom = caller === undefined ? '' : ` Called from ${caller}.`

  if (!firstBond) {
    return (
      `No ${label} provider bonded. This call ran before the app's bonds were set up: ` +
      `a call at a module's top level runs when the module is imported, before ` +
      `setupProviders() (bootstrapApp) executes. Move it inside a function, hook or effect, ` +
      `or import this module after setupProviders().${calledFrom}`
    )
  }

  const setupCategory =
    firstBond.name === undefined ? `'${firstBond.type}'` : `'${firstBond.type}:${firstBond.name}'`
  const setupFrom = firstBond.caller === undefined ? '' : ` from ${firstBond.caller}`
  return (
    `No ${label} provider bonded. The app's bond setup has already run (it bonded ` +
    `${setupCategory}${setupFrom}), so this category was never wired: bond one first using ` +
    `${bondCall} in the file that defines setupProviders() (a scaffold keeps those in ` +
    `app/src/bonds/, called from app/src/main.tsx).${calledFrom}`
  )
}

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
 * Emits a diagnostic bond/unbond log line via `console.debug`, but ONLY when
 * `config.verbose` is enabled (`configure({ verbose: true })`). Kept internal
 * and gated so normal operation stays silent.
 *
 * @param message - The diagnostic message describing the registry mutation.
 */
const logVerbose = (message: string): void => {
  if (config.verbose) {
    console.debug(`[app-bond] ${message}`)
  }
}

/**
 * Registers a singleton provider for the given category. If `provider` is null/undefined,
 * the existing singleton for that category is removed instead. In strict mode, throws
 * if a provider is already bonded to the category.
 *
 * @param type - The provider category (e.g. `'state'`, `'theme'`, `'routing'`).
 * @param provider - The provider instance to bond, or null/undefined to remove.
 */
export const bondSingleton = <T>(type: string, provider: T): void => {
  if (provider == null) {
    const existed = registry.singletons.delete(type)
    logVerbose(
      existed
        ? `unbonded singleton '${type}' (null provider)`
        : `bond('${type}', null) — no singleton to remove`,
    )
    return
  }
  if (config.strict && registry.singletons.has(type)) {
    throw new Error(`Provider '${type}' is already bonded. Unbond first or disable strict mode.`)
  }
  recordFirstBond(type, undefined)
  const replaced = registry.singletons.has(type)
  registry.singletons.set(type, provider)
  logVerbose(replaced ? `re-bonded singleton '${type}' (replaced)` : `bonded singleton '${type}'`)
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
 * The error distinguishes the two ways this fails, because they need different
 * fixes: if nothing has been bonded yet the accessor ran BEFORE the app's bond
 * setup (a module-level call, which executes at import time — move it into a
 * function/hook/effect), while if other categories are bonded the setup ran
 * and this one was simply never wired. Both messages name the calling module.
 *
 * @param type - The provider category to look up.
 * @returns The bonded provider instance cast to `T`.
 */
export const requireSingleton = <T>(type: string): T => {
  const provider = getSingleton<T>(type)
  if (!provider) {
    throw new Error(missingProviderMessage(type, undefined))
  }
  return provider
}

/**
 * Registers a named provider under a category. Named providers allow multiple
 * implementations per category (e.g. `bond('routing', 'react', reactProvider)`).
 * In strict mode, throws if that name is already bonded in the category.
 *
 * @param type - The provider category (e.g. `'routing'`, `'oauth'`).
 * @param name - The unique name within the category (e.g. `'react'`, `'github'`).
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
  recordFirstBond(type, name)
  const replaced = providers.has(name)
  providers.set(name, provider)
  logVerbose(replaced ? `re-bonded '${type}:${name}' (replaced)` : `bonded '${type}:${name}'`)
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
 * Like {@link requireSingleton}, the error says whether the call ran before
 * the app's bond setup or whether the setup ran without wiring this provider,
 * and names the calling module.
 *
 * @param type - The provider category to look up.
 * @param name - The provider name within the category.
 * @returns The bonded provider instance cast to `T`.
 */
export const requireNamed = <T>(type: string, name: string): T => {
  const provider = getNamed<T>(type, name)
  if (!provider) {
    throw new Error(missingProviderMessage(type, name))
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
  const removed = registry.singletons.delete(type)
  logVerbose(removed ? `unbonded singleton '${type}'` : `unbond('${type}') — nothing bonded`)
  return removed
}

/**
 * Removes a named provider from a category.
 *
 * @param type - The provider category containing the named provider.
 * @param name - The provider name to remove.
 * @returns `true` if the provider was removed, `false` if it was not found.
 */
export const unbondNamed = (type: string, name: string): boolean => {
  const removed = registry.named.get(type)?.delete(name) ?? false
  logVerbose(
    removed ? `unbonded '${type}:${name}'` : `unbond('${type}', '${name}') — nothing bonded`,
  )
  return removed
}

/**
 * Removes all providers (both singleton and named) for a given category.
 *
 * @param type - The provider category to clear.
 */
export const clearProviders = (type: string): void => {
  registry.singletons.delete(type)
  registry.named.delete(type)
  logVerbose(`cleared all providers for '${type}'`)
}

/**
 * Removes all bonded providers across all categories, restoring the registry
 * to its initial empty state. Primarily used in test teardown.
 */
export const reset = (): void => {
  registry.singletons.clear()
  registry.named.clear()
  firstBond = undefined
  logVerbose('reset — cleared all bonded providers')
}
