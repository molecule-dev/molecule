/**
 * Realtime provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-realtime-socketio`) call `setProvider()`
 * during setup. Application code uses the convenience functions from `realtime.ts`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { RealtimeProvider } from './types.js'

const BOND_TYPE = 'realtime'
expectBond(BOND_TYPE)

/**
 * Registers a realtime provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The realtime provider implementation to bond.
 */
export const setProvider = (provider: RealtimeProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded realtime provider, throwing if none is configured.
 *
 * @returns The bonded realtime provider.
 * @throws {Error} If no realtime provider has been bonded.
 */
export const getProvider = (): RealtimeProvider => {
  try {
    return bondRequire<RealtimeProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('realtime.error.noProvider', undefined, {
        defaultValue: 'Realtime provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a realtime provider is currently bonded.
 *
 * @returns `true` if a realtime provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
