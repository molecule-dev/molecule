/**
 * E-signature provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-esign-hellosign`) call `setProvider()`
 * during application setup. Application code uses convenience helpers from
 * `esign.ts` or the accessor directly.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { EsignProvider } from './types.js'

const BOND_TYPE = 'esign'
expectBond(BOND_TYPE)

/**
 * Registers an e-signature provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The e-signature provider implementation to bond.
 */
export const setProvider = (provider: EsignProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded e-signature provider, throwing if none is configured.
 *
 * @returns The bonded e-signature provider.
 * @throws {Error} If no e-signature provider has been bonded.
 */
export const getProvider = (): EsignProvider => {
  try {
    return bondRequire<EsignProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('esign.error.noProvider', undefined, {
        defaultValue: 'E-signature provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether an e-signature provider is currently bonded.
 *
 * @returns `true` if an e-signature provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
