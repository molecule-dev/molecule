/**
 * SMS provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-sms-twilio`) call `setProvider()`
 * during setup. Application code uses the convenience functions from `sms.ts`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { SMSProvider } from './types.js'

const BOND_TYPE = 'sms'
expectBond(BOND_TYPE)

/**
 * Registers an SMS provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The SMS provider implementation to bond.
 */
export const setProvider = (provider: SMSProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded SMS provider, throwing if none is configured.
 *
 * @returns The bonded SMS provider.
 * @throws {Error} If no SMS provider has been bonded.
 */
export const getProvider = (): SMSProvider => {
  try {
    return bondRequire<SMSProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('sms.error.noProvider', undefined, {
        defaultValue: 'SMS provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether an SMS provider is currently bonded.
 *
 * @returns `true` if an SMS provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
