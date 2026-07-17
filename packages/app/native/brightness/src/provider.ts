/**
 * `@molecule/app-brightness`
 * Provider wiring for screen brightness.
 *
 * Delegates to the shared `@molecule/app-bond` registry under the `'brightness'`
 * category, so `setProvider(provider)` and `bond('brightness', provider)` write
 * the same slot — either bonds the provider.
 */

import { bond, get, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { BrightnessProvider } from './types.js'

const BOND_TYPE = 'brightness'

/**
 * Set the brightness provider.
 * @param provider - BrightnessProvider implementation to register.
 */
export function setProvider(provider: BrightnessProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current brightness provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active BrightnessProvider instance.
 */
export function getProvider(): BrightnessProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error(
      t('brightness.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-brightness: No provider set. Call setProvider() with a BrightnessProvider implementation — no provider ships with the fleet; implement the interface on your native runtime and bond it.',
      }),
    )
  }
  return get<BrightnessProvider>(BOND_TYPE)!
}

/**
 * Check if a brightness provider has been registered.
 * @returns Whether a BrightnessProvider has been set via setProvider.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}
