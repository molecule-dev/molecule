/**
 * `@molecule/app-splash-screen`
 * Provider management for splash screen module.
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'
import { warn } from '@molecule/app-logger'

import type {
  SplashScreenCapabilities,
  SplashScreenConfig,
  SplashScreenHideOptions,
  SplashScreenProvider,
  SplashScreenShowOptions,
  SplashScreenState,
} from './types.js'

const BOND_TYPE = 'splash-screen'

/**
 * Set the splash screen provider.
 * @param provider - SplashScreenProvider implementation to register.
 */
export function setProvider(provider: SplashScreenProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current splash screen provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active SplashScreenProvider instance.
 */
export function getProvider(): SplashScreenProvider {
  const provider = bondGet<SplashScreenProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('splashScreen.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-splash-screen: No provider set. ' +
          'Call setProvider() with a SplashScreenProvider implementation ' +
          '(e.g., from @molecule/app-splash-screen-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a splash screen provider has been registered.
 * @returns Whether a SplashScreenProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Show the splash screen with optional animation and auto-hide configuration.
 * @param options - Show options including auto-hide, duration, and fade settings.
 * @returns A promise that resolves when the splash screen is shown.
 */
export async function show(options?: SplashScreenShowOptions): Promise<void> {
  return getProvider().show(options)
}

/**
 * Hide the splash screen with optional fade-out animation.
 * @param options - Hide options including fade-out duration.
 * @returns A promise that resolves when the splash screen is hidden.
 */
export async function hide(options?: SplashScreenHideOptions): Promise<void> {
  return getProvider().hide(options)
}

/**
 * Get the current splash screen state.
 * @returns The state including visibility and animation status.
 */
export async function getState(): Promise<SplashScreenState> {
  return getProvider().getState()
}

/**
 * Check if the splash screen is currently visible.
 * @returns Whether the splash screen is showing.
 */
export async function isVisible(): Promise<boolean> {
  return getProvider().isVisible()
}

/**
 * Configure splash screen appearance settings. Logs a warning if the provider
 * does not support configuration.
 * @param config - Configuration including background color, spinner, and animation settings.
 * @returns A promise that resolves when the configuration is applied.
 */
export async function configure(config: SplashScreenConfig): Promise<void> {
  const provider = getProvider()
  if (!provider.configure) {
    warn(
      t('splashScreen.warn.configureNotSupported', undefined, {
        defaultValue: '@molecule/app-splash-screen: configure not supported by provider',
      }),
    )
    return
  }
  return provider.configure(config)
}

/**
 * Get the platform's splash screen capabilities.
 * @returns The capabilities indicating splash screen control, spinner, and configuration support.
 */
export async function getCapabilities(): Promise<SplashScreenCapabilities> {
  return getProvider().getCapabilities()
}
