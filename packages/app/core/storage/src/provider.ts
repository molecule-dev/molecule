/**
 * Storage bond accessor.
 *
 * Bond packages (e.g. `@molecule/app-storage-localstorage`) call
 * `setProvider()` during setup. Application code uses `getProvider()`
 * to access key-value storage operations.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { StorageProvider } from './types.js'

const BOND_TYPE = 'storage'

/**
 * Registers a storage provider as the active singleton.
 *
 * @param provider - The storage provider implementation to bond.
 */
export const setProvider = (provider: StorageProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded storage provider, throwing if none is configured.
 *
 * @returns The bonded storage provider.
 * @throws {Error} If no storage provider has been bonded.
 */
export const getProvider = (): StorageProvider => {
  const provider = bondGet<StorageProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('storage.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-storage: No provider set. Call setProvider() with a StorageProvider implementation (e.g., from @molecule/app-storage-localstorage).',
      }),
    )
  }
  return provider
}

/**
 * Checks whether a storage provider is currently bonded.
 *
 * @returns `true` if a storage provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
