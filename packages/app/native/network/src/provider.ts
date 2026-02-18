/**
 * `@molecule/app-network`
 * Provider management for network status
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { NetworkProvider } from './types.js'

const BOND_TYPE = 'network'

/**
 * Set the network provider.
 * @param provider - NetworkProvider implementation to register.
 */
export function setProvider(provider: NetworkProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current network provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active NetworkProvider instance.
 */
export function getProvider(): NetworkProvider {
  const provider = bondGet<NetworkProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('network.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-network: No provider set. Call setProvider() with a NetworkProvider implementation (e.g., from @molecule/app-network-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a network provider has been registered.
 * @returns Whether a NetworkProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}
