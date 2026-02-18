/**
 * `@molecule/app-badge`
 * Provider management for badge module.
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type {
  BadgeCapabilities,
  BadgePermissionStatus,
  BadgeProvider,
  BadgeState,
} from './types.js'

const BOND_TYPE = 'badge'

/**
 * Set the badge provider
 * @param provider - BadgeProvider implementation
 */
export function setProvider(provider: BadgeProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current badge provider
 * @throws {Error} If no provider is set.
 * @returns The bonded BadgeProvider.
 */
export function getProvider(): BadgeProvider {
  const provider = bondGet<BadgeProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('badge.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-badge: No provider set. ' +
          'Call setProvider() with a BadgeProvider implementation ' +
          '(e.g., from @molecule/app-badge-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a badge provider is bonded.
 * @returns `true` if a provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Set the app badge count.
 * @param count - Badge count (0 to clear).
 * @returns A promise that resolves when the badge count is set.
 */
export async function set(count: number): Promise<void> {
  return getProvider().set(count)
}

/**
 * Get the current badge count.
 * @returns The current count.
 */
export async function get(): Promise<number> {
  return getProvider().get()
}

/**
 * Clear the badge (set to 0).
 * @returns A promise that resolves when the badge is cleared.
 */
export async function clear(): Promise<void> {
  return getProvider().clear()
}

/**
 * Increment the badge count.
 * @param amount - Amount to increment (default: 1).
 * @returns The new badge count after incrementing.
 */
export async function increment(amount?: number): Promise<number> {
  return getProvider().increment(amount)
}

/**
 * Decrement the badge count.
 * @param amount - Amount to decrement (default: 1).
 * @returns The new badge count after decrementing.
 */
export async function decrement(amount?: number): Promise<number> {
  return getProvider().decrement(amount)
}

/**
 * Check if badges are supported on this platform.
 * @returns `true` if badges are supported, `false` if no provider is set or badges are unsupported.
 */
export async function isSupported(): Promise<boolean> {
  if (!hasProvider()) {
    return false
  }
  return getProvider().isSupported()
}

/**
 * Get badge permission status.
 * @returns The current permission status.
 */
export async function getPermissionStatus(): Promise<BadgePermissionStatus> {
  return getProvider().getPermissionStatus()
}

/**
 * Request badge permission.
 * @returns The resulting permission status after the request.
 */
export async function requestPermission(): Promise<BadgePermissionStatus> {
  return getProvider().requestPermission()
}

/**
 * Get badge state (count, supported, permissionGranted).
 * @returns The current badge state.
 */
export async function getState(): Promise<BadgeState> {
  return getProvider().getState()
}

/**
 * Get the platform's badge capabilities.
 * @returns The badge capabilities.
 */
export async function getCapabilities(): Promise<BadgeCapabilities> {
  return getProvider().getCapabilities()
}
