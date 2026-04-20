/**
 * Date range picker provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { DateRangePickerProvider } from './types.js'

let _provider: DateRangePickerProvider | null = null

/**
 * Registers a date range picker provider as the active singleton.
 *
 * @param provider - The date range picker provider implementation to bond.
 */
export function setProvider(provider: DateRangePickerProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded date range picker provider, or `null` if none is bonded.
 *
 * @returns The active date range picker provider, or `null`.
 */
export function getProvider(): DateRangePickerProvider | null {
  return _provider
}

/**
 * Checks whether a date range picker provider has been bonded.
 *
 * @returns `true` if a date range picker provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded date range picker provider, throwing if none is configured.
 *
 * @returns The active date range picker provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): DateRangePickerProvider {
  if (!_provider) {
    throw new Error(
      'DateRangePicker provider not configured. Bond a date-range-picker provider first.',
    )
  }
  return _provider
}
