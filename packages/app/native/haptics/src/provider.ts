/**
 * `@molecule/app-haptics`
 * Provider management for haptics module.
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type {
  HapticCapabilities,
  HapticPatternElement,
  HapticsProvider,
  ImpactStyle,
  NotificationType,
} from './types.js'

const BOND_TYPE = 'haptics'

/**
 * Set the haptics provider
 * @param provider - HapticsProvider implementation
 */
export function setProvider(provider: HapticsProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current haptics provider.
 * @throws {Error} If no provider has been set.
 * @returns The active haptics provider instance.
 */
export function getProvider(): HapticsProvider {
  const provider = bondGet<HapticsProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('haptics.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-haptics: No provider set. Call setProvider() with a HapticsProvider implementation (e.g., from @molecule/app-haptics-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Checks if a haptics provider has been bonded.
 * @returns Whether a haptics provider is currently registered.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Triggers impact haptic feedback.
 * @param style - Impact intensity style (default: 'medium').
 * @returns A promise that resolves when the haptic feedback is triggered.
 */
export async function impact(style?: ImpactStyle): Promise<void> {
  return getProvider().impact(style)
}

/**
 * Triggers notification haptic feedback.
 * @param type - Notification feedback type (default: 'success').
 * @returns A promise that resolves when the haptic feedback is triggered.
 */
export async function notification(type?: NotificationType): Promise<void> {
  return getProvider().notification(type)
}

/**
 * Triggers selection haptic feedback (light tap for UI selections).
 * @returns A promise that resolves when the haptic feedback is triggered.
 */
export async function selection(): Promise<void> {
  return getProvider().selection()
}

/**
 * Vibrates the device for a specified duration.
 * @param duration - Duration in milliseconds (default: 300).
 * @returns A promise that resolves when the vibration completes.
 */
export async function vibrate(duration?: number): Promise<void> {
  return getProvider().vibrate(duration)
}

/**
 * Plays a custom haptic pattern sequence.
 * @param pattern - Array of haptic pattern elements defining the sequence.
 * @returns A promise that resolves when the pattern finishes playing.
 */
export async function playPattern(pattern: HapticPatternElement[]): Promise<void> {
  return getProvider().playPattern(pattern)
}

/**
 * Checks if haptics are supported on the current device.
 * @returns Whether haptic feedback is supported.
 */
export async function isSupported(): Promise<boolean> {
  if (!hasProvider()) {
    return false
  }
  return getProvider().isSupported()
}

/**
 * Gets the haptic capabilities for the current device.
 * @returns The available haptic capabilities.
 */
export async function getCapabilities(): Promise<HapticCapabilities> {
  return getProvider().getCapabilities()
}
