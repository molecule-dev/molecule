/**
 * Default provider for `@molecule/app-date-range-picker`.
 *
 * Provides an in-memory date range picker implementation conforming to
 * the molecule date range picker provider interface.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-date-range-picker'
 * import type { DateRange } from '@molecule/app-date-range-picker'
 * import { createProvider } from '@molecule/app-date-range-picker-default'
 *
 * // Startup: bond once.
 * setProvider(createProvider())
 *
 * // In a report filter: create a picker through the core provider.
 * let reportRange: DateRange | null = null
 * const picker = requireProvider().createPicker({
 *   startDate: new Date(2026, 8, 1),
 *   endDate: new Date(2026, 8, 7),
 *   maxDate: new Date(2026, 8, 24), // no future dates — ends past this are CLAMPED to it
 *   onChange: (range) => {
 *     reportRange = range // refetch the report here
 *   },
 * })
 *
 * picker.setValue({ startDate: new Date(2026, 8, 10), endDate: new Date(2026, 9, 1) })
 * console.log(reportRange) // { startDate: Sep 10 2026, endDate: Sep 24 2026 } (clamped)
 * picker.destroy() // on unmount
 * ```
 *
 * @remarks
 * HEADLESS: `open()`/`close()` are no-ops and nothing is rendered — draw the calendar and
 * `presets` yourself and call `setValue()`. Get pickers from
 * `requireProvider().createPicker(...)` after `setProvider(...)`; the core has no top-level
 * `createPicker()`.
 *
 * This default instance is an in-memory range store that honors its options:
 * - `minDate`/`maxDate` **clamp** every stored selection (initial value and
 *   `setValue`) into range — a start below `minDate` becomes `minDate`, an end
 *   above `maxDate` becomes `maxDate`. This is client UX, not a security
 *   boundary; re-validate ranges on the server.
 * - `singleDate: true` collapses a selection to a single-day range
 *   (`startDate === endDate` = the picked day) on one `setValue`; no second
 *   click. `createProvider({ singleDate: true })` sets this as a provider-wide
 *   default that per-call `options.singleDate` overrides.
 * - Inverted ranges (start after end) in range mode are stored as-is — swap or
 *   block them in your UI if needed.
 * - `clear()` resets the value WITHOUT firing `onChange` (only `setValue()`
 *   notifies) — trigger your own refresh after clearing.
 * - There is **no `locale` knob** (removed as inert): this store emits no
 *   formatted output, so format dates with `@molecule/app-i18n` in your
 *   rendering layer.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
