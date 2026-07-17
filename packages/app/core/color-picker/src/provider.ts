/**
 * Color picker provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('color-picker', provider)`, so wiring via this package's `setProvider()`
 * and via `bond('color-picker', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { ColorPickerProvider } from './types.js'

const BOND_TYPE = 'color-picker'

/**
 * Registers a color picker provider as the active singleton.
 *
 * @param provider - The color picker provider implementation to bond.
 */
export function setProvider(provider: ColorPickerProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded color picker provider, or `null` if none is bonded.
 *
 * @returns The active color picker provider, or `null`.
 */
export function getProvider(): ColorPickerProvider | null {
  return get<ColorPickerProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a color picker provider has been bonded.
 *
 * @returns `true` if a color picker provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded color picker provider, throwing if none is configured.
 *
 * @returns The active color picker provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): ColorPickerProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('ColorPicker provider not configured. Bond a color-picker provider first.')
  }
  return requireSingleton<ColorPickerProvider>(BOND_TYPE)
}
