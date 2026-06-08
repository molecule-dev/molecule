/**
 * Named multi-provider wiring for `@molecule/api-wearable`.
 *
 * Wearable bonds register under the `'wearable'` category with a provider
 * `name` (e.g. `'fitbit'`, `'oura'`, `'withings'`) so multiple wearable
 * providers can coexist for a single user account. Use
 * {@link setProvider} from each bond at app startup, then call
 * {@link getProvider} (`require`) or {@link getOptionalProvider} (`get`)
 * from handlers and background jobs.
 *
 * @example
 * ```typescript
 * import { setProvider, getProvider, listProviders } from '@molecule/api-wearable'
 * import { createProvider as createFitbit } from '@molecule/api-wearable-fitbit'
 *
 * setProvider('fitbit', createFitbit({ credentialsStore, redirectUri: '...' }))
 *
 * const fitbit = getProvider('fitbit')
 * const today = await fitbit.getDailyActivity('user-1', '2026-05-01')
 * ```
 *
 * @module
 */

import {
  bond,
  get as bondGet,
  getAll as bondGetAll,
  isBonded,
  require as bondRequire,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { WearableProvider } from './types.js'

/** Bond category key for wearable providers. */
const BOND_TYPE = 'wearable'

/**
 * Registers a wearable provider under the given name (e.g. `'fitbit'`).
 * Bond packages call this during application startup.
 *
 * @param name - Stable provider key, matching {@link WearableProvider.providerName}.
 * @param provider - The wearable provider implementation to bond.
 */
export const setProvider = (name: string, provider: WearableProvider): void => {
  bond(BOND_TYPE, name, provider)
}

/**
 * Retrieves the bonded wearable provider for `name`, throwing if none is
 * configured.
 *
 * @param name - Provider key, e.g. `'fitbit'`.
 * @returns The bonded wearable provider.
 * @throws {Error} If no provider is bonded under `name`.
 */
export const getProvider = (name: string): WearableProvider => {
  try {
    return bondRequire<WearableProvider>(BOND_TYPE, name)
  } catch (error) {
    throw new Error(
      t(
        'wearable.error.noProvider',
        { name },
        {
          defaultValue: `Wearable provider '${name}' not configured. Call setProvider('${name}', provider) first.`,
        },
      ),
      { cause: error },
    )
  }
}

/**
 * Retrieves the bonded wearable provider for `name`, or `null` when none
 * is bonded. Use this when a missing connection is a normal state (e.g.
 * the user hasn't linked a Fitbit account yet).
 *
 * @param name - Provider key.
 * @returns The bonded provider, or `null`.
 */
export const getOptionalProvider = (name: string): WearableProvider | null => {
  return bondGet<WearableProvider>(BOND_TYPE, name) ?? null
}

/**
 * Checks whether a wearable provider is bonded under `name`.
 *
 * @param name - Provider key.
 * @returns `true` if bonded.
 */
export const hasProvider = (name: string): boolean => {
  return isBonded(BOND_TYPE, name)
}

/**
 * Lists every currently-bonded wearable provider name (e.g.
 * `['fitbit', 'oura']`). Useful for rendering a "linked accounts"
 * settings page or fanning a sync job out across all bonded providers.
 *
 * @returns The list of bonded provider keys.
 */
export const listProviders = (): string[] => {
  return Array.from(bondGetAll<WearableProvider>(BOND_TYPE).keys())
}
