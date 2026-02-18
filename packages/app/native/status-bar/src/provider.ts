/**
 * `@molecule/app-status-bar`
 * Provider management for status bar
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { StatusBarProvider } from './types.js'

const BOND_TYPE = 'status-bar'

/**
 * Set the status bar provider.
 * @param provider - StatusBarProvider implementation to register.
 */
export function setProvider(provider: StatusBarProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current status bar provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active StatusBarProvider instance.
 */
export function getProvider(): StatusBarProvider {
  const provider = bondGet<StatusBarProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('statusBar.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-status-bar: No provider set. Call setProvider() with a StatusBarProvider implementation (e.g., from @molecule/app-status-bar-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a status bar provider has been registered.
 * @returns Whether a StatusBarProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}
