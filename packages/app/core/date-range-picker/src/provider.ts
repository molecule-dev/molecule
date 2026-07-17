/**
 * Date range picker provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('date-range-picker', provider)`, so wiring via this package's
 * `setProvider()` and via `bond('date-range-picker', …)` write the SAME registry
 * slot — use either. Application code calls `getProvider()` / `requireProvider()`
 * at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { DateRangePickerProvider } from './types.js'

const BOND_TYPE = 'date-range-picker'

/**
 * Registers a date range picker provider as the active singleton.
 *
 * @param provider - The date range picker provider implementation to bond.
 */
export function setProvider(provider: DateRangePickerProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded date range picker provider, or `null` if none is bonded.
 *
 * @returns The active date range picker provider, or `null`.
 */
export function getProvider(): DateRangePickerProvider | null {
  return get<DateRangePickerProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a date range picker provider has been bonded.
 *
 * @returns `true` if a date range picker provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded date range picker provider, throwing if none is configured.
 *
 * @returns The active date range picker provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): DateRangePickerProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error(
      'DateRangePicker provider not configured. Bond a date-range-picker provider first.',
    )
  }
  return requireSingleton<DateRangePickerProvider>(BOND_TYPE)
}
