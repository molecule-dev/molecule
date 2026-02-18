/**
 * `@molecule/app-brightness`
 * Provider management for screen brightness
 */

import { t } from '@molecule/app-i18n'

import type { BrightnessProvider } from './types.js'

let currentProvider: BrightnessProvider | null = null

/**
 * Set the brightness provider.
 * @param provider - BrightnessProvider implementation to register.
 */
export function setProvider(provider: BrightnessProvider): void {
  currentProvider = provider
}

/**
 * Get the current brightness provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active BrightnessProvider instance.
 */
export function getProvider(): BrightnessProvider {
  if (!currentProvider) {
    throw new Error(
      t('brightness.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-brightness: No provider set. Call setProvider() with a BrightnessProvider implementation (e.g., from @molecule/app-brightness-capacitor).',
      }),
    )
  }
  return currentProvider
}

/**
 * Check if a brightness provider has been registered.
 * @returns Whether a BrightnessProvider has been set via setProvider.
 */
export function hasProvider(): boolean {
  return currentProvider !== null
}
