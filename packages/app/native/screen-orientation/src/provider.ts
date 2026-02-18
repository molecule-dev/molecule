/**
 * `@molecule/app-screen-orientation`
 * Provider management for screen orientation
 */

import { t } from '@molecule/app-i18n'

import type { ScreenOrientationProvider } from './types.js'

let currentProvider: ScreenOrientationProvider | null = null

/**
 * Set the screen orientation provider.
 * @param provider - ScreenOrientationProvider implementation to register.
 */
export function setProvider(provider: ScreenOrientationProvider): void {
  currentProvider = provider
}

/**
 * Get the current screen orientation provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active ScreenOrientationProvider instance.
 */
export function getProvider(): ScreenOrientationProvider {
  if (!currentProvider) {
    throw new Error(
      t('screenOrientation.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-screen-orientation: No provider set. Call setProvider() with a ScreenOrientationProvider implementation (e.g., from @molecule/app-screen-orientation-capacitor).',
      }),
    )
  }
  return currentProvider
}

/**
 * Check if a screen orientation provider has been registered.
 * @returns Whether a ScreenOrientationProvider has been set.
 */
export function hasProvider(): boolean {
  return currentProvider !== null
}
