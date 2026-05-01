/**
 * Shipping provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-shipping-easypost`) call `setProvider()`
 * during setup. Application code uses the convenience functions from `shipping.ts`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { ShippingProvider } from './types.js'

const BOND_TYPE = 'shipping'
expectBond(BOND_TYPE)

/**
 * Registers a shipping provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The shipping provider implementation to bond.
 */
export const setProvider = (provider: ShippingProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded shipping provider, throwing if none is configured.
 *
 * @returns The bonded shipping provider.
 * @throws {Error} If no shipping provider has been bonded.
 */
export const getProvider = (): ShippingProvider => {
  try {
    return bondRequire<ShippingProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('shipping.error.noProvider', undefined, {
        defaultValue: 'Shipping provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a shipping provider is currently bonded.
 *
 * @returns `true` if a shipping provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
