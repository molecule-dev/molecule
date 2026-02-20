/**
 * Monitoring provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-monitoring-default`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, get as bondGet, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { MonitoringProvider, SystemHealth } from './types.js'

const BOND_TYPE = 'monitoring'

/**
 * Registers a monitoring provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The monitoring provider implementation to bond.
 */
export const setProvider = (provider: MonitoringProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded monitoring provider, throwing if none is configured.
 *
 * @returns The bonded monitoring provider.
 * @throws {Error} If no monitoring provider has been bonded.
 */
export const getProvider = (): MonitoringProvider => {
  try {
    return bondRequire<MonitoringProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('monitoring.error.noProvider', undefined, {
        defaultValue: 'Monitoring provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a monitoring provider is currently bonded.
 *
 * @returns `true` if a monitoring provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded monitoring provider, returning null if none is bonded.
 * Prefer this over getProvider() in optional monitoring code paths.
 *
 * @returns The bonded monitoring provider, or null.
 */
export const getOptionalProvider = (): MonitoringProvider | null => {
  return bondGet<MonitoringProvider>(BOND_TYPE) ?? null
}

/**
 * Runs all registered checks through the bonded monitoring provider.
 *
 * @returns Aggregated SystemHealth snapshot.
 * @throws {Error} If no monitoring provider is bonded.
 */
export const runAll = (): Promise<SystemHealth> => {
  return getProvider().runAll()
}

/**
 * Returns the most recently computed SystemHealth, or null if runAll()
 * has not been called yet.
 *
 * @returns The most recent SystemHealth snapshot, or null.
 * @throws {Error} If no monitoring provider is bonded.
 */
export const getLatest = (): SystemHealth | null => {
  return getProvider().getLatest()
}
