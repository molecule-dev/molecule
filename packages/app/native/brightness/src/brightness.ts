/**
 * `@molecule/app-brightness`
 * Brightness convenience functions
 */

import { getProvider } from './provider.js'
import type { BrightnessCapabilities, BrightnessOptions, BrightnessState } from './types.js'

/**
 * Get the current screen brightness level.
 * @returns The brightness level as a decimal between 0 and 1.
 */
export async function getBrightness(): Promise<number> {
  return getProvider().getBrightness()
}

/**
 * Set the screen brightness level.
 * @param brightness - Brightness value between 0 (darkest) and 1 (brightest).
 * @param options - Options for persistence and animation.
 * @returns A promise that resolves when the brightness is set.
 */
export async function setBrightness(
  brightness: number,
  options?: BrightnessOptions,
): Promise<void> {
  return getProvider().setBrightness(brightness, options)
}

/**
 * Get the full brightness state including auto-brightness and keep-screen-on status.
 * @returns The current brightness state.
 */
export async function getState(): Promise<BrightnessState> {
  return getProvider().getState()
}

/**
 * Check if auto-brightness is enabled.
 * @returns Whether the system auto-brightness feature is active.
 */
export async function isAutoBrightness(): Promise<boolean> {
  return getProvider().isAutoBrightness()
}

/**
 * Enable or disable auto-brightness.
 * @param enabled - Whether to enable auto-brightness.
 * @returns A promise that resolves when the setting is applied.
 */
export async function setAutoBrightness(enabled: boolean): Promise<void> {
  return getProvider().setAutoBrightness(enabled)
}

/**
 * Enable or disable keep-screen-on to prevent dimming and sleep.
 * @param keepOn - Whether to keep the screen on.
 * @returns A promise that resolves when the setting is applied.
 */
export async function setKeepScreenOn(keepOn: boolean): Promise<void> {
  return getProvider().setKeepScreenOn(keepOn)
}

/**
 * Check if keep-screen-on is enabled.
 * @returns Whether the screen is being kept on.
 */
export async function isKeepScreenOn(): Promise<boolean> {
  return getProvider().isKeepScreenOn()
}

/**
 * Reset brightness to the system default setting.
 * @returns A promise that resolves when the brightness is reset.
 */
export async function reset(): Promise<void> {
  return getProvider().reset()
}

/**
 * Get the platform's brightness control capabilities.
 * @returns The capabilities indicating which brightness features are supported.
 */
export async function getCapabilities(): Promise<BrightnessCapabilities> {
  return getProvider().getCapabilities()
}

/**
 * Set brightness to maximum (1.0).
 * @returns A promise that resolves when the brightness is set.
 */
export async function setMax(): Promise<void> {
  return setBrightness(1)
}

/**
 * Set brightness to minimum (0.0).
 * @returns A promise that resolves when the brightness is set.
 */
export async function setMin(): Promise<void> {
  return setBrightness(0)
}

/**
 * Set brightness to 50% (0.5).
 * @returns A promise that resolves when the brightness is set.
 */
export async function setHalf(): Promise<void> {
  return setBrightness(0.5)
}

/**
 * Increase brightness by a given amount.
 * @param amount - Amount to increase (0-1, default: 0.1). Clamped to maximum 1.0.
 * @returns A promise that resolves when the brightness is adjusted.
 */
export async function increase(amount = 0.1): Promise<void> {
  const current = await getBrightness()
  return setBrightness(Math.min(1, current + amount))
}

/**
 * Decrease brightness by a given amount.
 * @param amount - Amount to decrease (0-1, default: 0.1). Clamped to minimum 0.0.
 * @returns A promise that resolves when the brightness is adjusted.
 */
export async function decrease(amount = 0.1): Promise<void> {
  const current = await getBrightness()
  return setBrightness(Math.max(0, current - amount))
}
