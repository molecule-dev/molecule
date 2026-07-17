/**
 * `@molecule/app-screen-orientation`
 * Provider management for screen orientation
 */

import { bond, get, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { ScreenOrientationProvider } from './types.js'

/**
 * Bond category for the screen orientation provider in the shared
 * `@molecule/app-bond` registry. `setProvider()` and
 * `bond('screen-orientation', provider)` write the same slot.
 */
const BOND_TYPE = 'screen-orientation'

/**
 * Set the screen orientation provider.
 * @param provider - ScreenOrientationProvider implementation to register.
 */
export function setProvider(provider: ScreenOrientationProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current screen orientation provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active ScreenOrientationProvider instance.
 */
export function getProvider(): ScreenOrientationProvider {
  const provider = get<ScreenOrientationProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('screenOrientation.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-screen-orientation: No provider set. Call setProvider() with a ScreenOrientationProvider implementation — no provider ships with the fleet; implement the interface on your native runtime and bond it.',
      }),
    )
  }
  return provider
}

/**
 * Check if a screen orientation provider has been registered.
 * @returns Whether a ScreenOrientationProvider has been set.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}
