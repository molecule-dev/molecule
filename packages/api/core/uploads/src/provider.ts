/**
 * Upload provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-uploads-s3`) call `setProvider()` during
 * setup. Application code uses the upload middleware which internally calls
 * `getProvider()` to stream files to the configured storage backend.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { UploadProvider } from './types.js'

const BOND_TYPE = 'uploads'

/**
 * Registers an upload provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The upload provider implementation to bond.
 */
export const setProvider = (provider: UploadProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded upload provider, throwing if none is configured.
 *
 * @returns The bonded upload provider.
 * @throws {Error} If no upload provider has been bonded.
 */
export const getProvider = (): UploadProvider => {
  try {
    return bondRequire<UploadProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('uploads.error.noProvider', undefined, {
        defaultValue: 'Upload provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether an upload provider is currently bonded.
 *
 * @returns `true` if an upload provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
