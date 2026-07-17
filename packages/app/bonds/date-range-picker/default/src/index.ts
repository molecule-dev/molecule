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
