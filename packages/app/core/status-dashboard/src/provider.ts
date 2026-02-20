/**
 * Status dashboard bond accessor.
 *
 * Bond packages (e.g. a React-based status page) call `setProvider()`
 * during setup. Application code uses `requireProvider()` to fetch
 * system status, incidents, uptime data, and subscribe to updates.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { StatusDashboardProvider } from './types.js'

const BOND_TYPE = 'status-dashboard'

/**
 * Registers a status dashboard provider as the active singleton.
 *
 * @param provider - The status dashboard provider implementation to bond.
 */
export function setProvider(provider: StatusDashboardProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded status dashboard provider, or `null` if none is bonded.
 *
 * @returns The bonded status dashboard provider, or `null`.
 */
export function getProvider(): StatusDashboardProvider | null {
  return bondGet<StatusDashboardProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a status dashboard provider is currently bonded.
 *
 * @returns `true` if a status dashboard provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded status dashboard provider, throwing if none is configured.
 *
 * @returns The bonded status dashboard provider.
 * @throws {Error} If no status dashboard provider has been bonded.
 */
export function requireProvider(): StatusDashboardProvider {
  const provider = bondGet<StatusDashboardProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('statusDashboard.error.noProvider', undefined, {
        defaultValue:
          'Status dashboard provider not configured. Bond a status dashboard provider first.',
      }),
    )
  }
  return provider
}
