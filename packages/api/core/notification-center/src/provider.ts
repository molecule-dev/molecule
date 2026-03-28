/**
 * Notification center provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-notification-center-database`) call
 * `setProvider()` during setup. Application code uses the convenience
 * functions from `notification-center.ts`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { NotificationCenterProvider } from './types.js'

const BOND_TYPE = 'notification-center'
expectBond(BOND_TYPE)

/**
 * Registers a notification center provider as the active singleton. Called
 * by bond packages during application startup.
 *
 * @param provider - The notification center provider implementation to bond.
 */
export const setProvider = (provider: NotificationCenterProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded notification center provider, throwing if none is configured.
 *
 * @returns The bonded notification center provider.
 * @throws {Error} If no notification center provider has been bonded.
 */
export const getProvider = (): NotificationCenterProvider => {
  try {
    return bondRequire<NotificationCenterProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('notificationCenter.error.noProvider', undefined, {
        defaultValue: 'Notification center provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a notification center provider is currently bonded.
 *
 * @returns `true` if a notification center provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
