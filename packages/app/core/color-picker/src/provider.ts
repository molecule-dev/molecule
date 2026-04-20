/**
 * Color picker provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { ColorPickerProvider } from './types.js'

let _provider: ColorPickerProvider | null = null

/**
 * Registers a color picker provider as the active singleton.
 *
 * @param provider - The color picker provider implementation to bond.
 */
export function setProvider(provider: ColorPickerProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded color picker provider, or `null` if none is bonded.
 *
 * @returns The active color picker provider, or `null`.
 */
export function getProvider(): ColorPickerProvider | null {
  return _provider
}

/**
 * Checks whether a color picker provider has been bonded.
 *
 * @returns `true` if a color picker provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded color picker provider, throwing if none is configured.
 *
 * @returns The active color picker provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): ColorPickerProvider {
  if (!_provider) {
    throw new Error('ColorPicker provider not configured. Bond a color-picker provider first.')
  }
  return _provider
}
