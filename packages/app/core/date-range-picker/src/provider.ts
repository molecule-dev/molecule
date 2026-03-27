/**
 * DateRangePicker provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { DateRangePickerProvider } from './types.js'

let _provider: DateRangePickerProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: DateRangePickerProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): DateRangePickerProvider | null {
  return _provider
}

/**
 *
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 *
 */
export function requireProvider(): DateRangePickerProvider {
  if (!_provider) {
    throw new Error(
      'DateRangePicker provider not configured. Bond a date-range-picker provider first.',
    )
  }
  return _provider
}
