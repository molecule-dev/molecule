/**
 * `@molecule/app-battery`
 * Provider management for battery module
 */

import { t } from '@molecule/app-i18n'

import type {
  BatteryCapabilities,
  BatteryChangeEvent,
  BatteryProvider,
  BatteryStatus,
} from './types.js'

// ============================================================================
// Provider Management
// ============================================================================

let currentProvider: BatteryProvider | null = null

/**
 * Set the battery provider
 * @param provider - BatteryProvider implementation
 */
export function setProvider(provider: BatteryProvider): void {
  currentProvider = provider
}

/**
 * Get the current battery provider
 * @throws {Error} Error if no provider is set
 * @returns The active battery provider instance.
 */
export function getProvider(): BatteryProvider {
  if (!currentProvider) {
    throw new Error(
      t('battery.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-battery: No provider set. Call setProvider() with a BatteryProvider implementation (e.g., from @molecule/app-battery-capacitor).',
      }),
    )
  }
  return currentProvider
}

/**
 * Check if a battery provider is set
 * @returns Whether a battery provider has been registered.
 */
export function hasProvider(): boolean {
  return currentProvider !== null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get current battery status
 * @returns The current battery status including level, charging state, and time estimates.
 */
export async function getStatus(): Promise<BatteryStatus> {
  return getProvider().getStatus()
}

/**
 * Get current battery level
 * @returns The battery level as a decimal between 0 and 1.
 */
export async function getLevel(): Promise<number> {
  return getProvider().getLevel()
}

/**
 * Check if the device is currently charging.
 * @returns Whether the device is charging.
 */
export async function isCharging(): Promise<boolean> {
  return getProvider().isCharging()
}

/**
 * Check if the device has low power mode enabled.
 * @returns Whether low power mode is active.
 */
export async function isLowPowerMode(): Promise<boolean> {
  return getProvider().isLowPowerMode()
}

/**
 * Listen for battery status changes.
 * @param callback - Called with a BatteryChangeEvent when level or charging state changes.
 * @returns A function that unsubscribes the listener when called.
 */
export function onChange(callback: (event: BatteryChangeEvent) => void): () => void {
  return getProvider().onChange(callback)
}

/**
 * Listen for charging state changes.
 * @param callback - Called with a boolean indicating whether the device started or stopped charging.
 * @returns A function that unsubscribes the listener when called.
 */
export function onChargingChange(callback: (isCharging: boolean) => void): () => void {
  return getProvider().onChargingChange(callback)
}

/**
 * Listen for low battery events. Fires when level drops below the threshold.
 * @param callback - Called with the current battery level (0-1) when it drops below threshold.
 * @param threshold - Battery level threshold (default: 0.2).
 * @returns A function that unsubscribes the listener when called.
 */
export function onLow(callback: (level: number) => void, threshold?: number): () => void {
  return getProvider().onLow(callback, threshold)
}

/**
 * Listen for critical battery events. Fires when level drops below the critical threshold.
 * @param callback - Called with the current battery level (0-1) when it drops below threshold.
 * @param threshold - Battery level threshold (default: 0.05).
 * @returns A function that unsubscribes the listener when called.
 */
export function onCritical(callback: (level: number) => void, threshold?: number): () => void {
  return getProvider().onCritical(callback, threshold)
}

/**
 * Get the platform's battery monitoring capabilities.
 * @returns The battery capabilities indicating which monitoring features are available.
 */
export async function getCapabilities(): Promise<BatteryCapabilities> {
  return getProvider().getCapabilities()
}
