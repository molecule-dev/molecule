/**
 * Default provider for `@molecule/app-date-range-picker`.
 *
 * Provides an in-memory date range picker implementation conforming to
 * the molecule date range picker provider interface.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-date-range-picker-default'
 * import { setProvider } from '@molecule/app-date-range-picker'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * This default instance is a plain range store: it does NOT validate or
 * clamp — `minDate`/`maxDate` are carried for YOUR UI to enforce, inverted
 * ranges (start after end) are stored as-is, and `singleDate` mode is not
 * implemented. `clear()` resets the value WITHOUT firing `onChange` (only
 * `setValue()` notifies) — trigger your own refresh after clearing. The
 * `createProvider({ locale })` config knob is currently ignored; format
 * dates with `@molecule/app-i18n` in your rendering layer.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
