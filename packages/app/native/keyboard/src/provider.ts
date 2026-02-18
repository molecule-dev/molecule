/**
 * `@molecule/app-keyboard`
 * Provider management for keyboard module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'
import { warn } from '@molecule/app-logger'

import type {
  AccessoryBarOptions,
  KeyboardCapabilities,
  KeyboardHideEvent,
  KeyboardProvider,
  KeyboardResizeMode,
  KeyboardScrollOptions,
  KeyboardShowEvent,
  KeyboardState,
  KeyboardStyle,
} from './types.js'

// ============================================================================
// Provider Management
// ============================================================================

const BOND_TYPE = 'keyboard'

/**
 * Set the keyboard provider.
 * @param provider - KeyboardProvider implementation to register.
 */
export function setProvider(provider: KeyboardProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current keyboard provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active KeyboardProvider instance.
 */
export function getProvider(): KeyboardProvider {
  const provider = bondGet<KeyboardProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('keyboard.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-keyboard: No provider set. Call setProvider() with a KeyboardProvider implementation (e.g., from @molecule/app-keyboard-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a keyboard provider has been registered.
 * @returns Whether a KeyboardProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Programmatically show the soft keyboard.
 * @returns A promise that resolves when the keyboard is shown.
 */
export async function show(): Promise<void> {
  return getProvider().show()
}

/**
 * Programmatically hide the soft keyboard.
 * @returns A promise that resolves when the keyboard is hidden.
 */
export async function hide(): Promise<void> {
  return getProvider().hide()
}

/**
 * Toggle the soft keyboard visibility.
 * @returns A promise that resolves when the keyboard visibility is toggled.
 */
export async function toggle(): Promise<void> {
  return getProvider().toggle()
}

/**
 * Get the current keyboard state (visibility and height).
 * @returns The keyboard state including visibility, height, and screen height.
 */
export async function getState(): Promise<KeyboardState> {
  return getProvider().getState()
}

/**
 * Check if the soft keyboard is currently visible.
 * @returns Whether the keyboard is visible.
 */
export async function isVisible(): Promise<boolean> {
  return getProvider().isVisible()
}

/**
 * Set how the app viewport should resize when the keyboard appears.
 * @param mode - The resize mode: 'body', 'native', 'ionic', or 'none'.
 * @returns A promise that resolves when the resize mode is set.
 */
export async function setResizeMode(mode: KeyboardResizeMode): Promise<void> {
  return getProvider().setResizeMode(mode)
}

/**
 * Set the keyboard color scheme (iOS only).
 * @param style - The keyboard style: 'dark', 'light', or 'default'.
 * @returns A promise that resolves when the keyboard style is set.
 */
export async function setStyle(style: KeyboardStyle): Promise<void> {
  return getProvider().setStyle(style)
}

/**
 * Show or hide the keyboard accessory bar (iOS only).
 * @param options - Accessory bar visibility options.
 * @returns A promise that resolves when the accessory bar setting is applied.
 */
export async function setAccessoryBar(options: AccessoryBarOptions): Promise<void> {
  return getProvider().setAccessoryBar(options)
}

/**
 * Configure scroll-to-input behavior when the keyboard appears.
 * @param options - Scroll options (enabled, extra padding).
 * @returns A promise that resolves when the scroll setting is applied.
 */
export async function setScroll(options: KeyboardScrollOptions): Promise<void> {
  return getProvider().setScroll(options)
}

/**
 * Listen for keyboard show events.
 * @param callback - Called with keyboard height and animation details when the keyboard appears.
 * @returns A function that unsubscribes the listener when called.
 */
export function onShow(callback: (event: KeyboardShowEvent) => void): () => void {
  return getProvider().onShow(callback)
}

/**
 * Listen for keyboard hide events.
 * @param callback - Called with animation details when the keyboard is dismissed.
 * @returns A function that unsubscribes the listener when called.
 */
export function onHide(callback: (event: KeyboardHideEvent) => void): () => void {
  return getProvider().onHide(callback)
}

/**
 * Listen for keyboard height changes (if supported by the provider).
 * @param callback - Called with the new keyboard height in pixels.
 * @returns A function that unsubscribes the listener when called.
 */
export function onHeightChange(callback: (height: number) => void): () => void {
  const provider = getProvider()
  if (!provider.onHeightChange) {
    warn('@molecule/app-keyboard: onHeightChange not supported by provider')
    return () => {}
  }
  return provider.onHeightChange(callback)
}

/**
 * Get the platform's keyboard control capabilities.
 * @returns The capabilities indicating which keyboard features are supported.
 */
export async function getCapabilities(): Promise<KeyboardCapabilities> {
  return getProvider().getCapabilities()
}
