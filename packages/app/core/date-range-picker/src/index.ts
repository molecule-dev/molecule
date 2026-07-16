/**
 * Date range picker core interface for molecule.dev.
 *
 * Framework-agnostic contract for date-range selection **state** (start/end,
 * min/max clamps, presets, single-date mode). Bond a provider (e.g.
 * `@molecule/app-date-range-picker-default`) to supply the logic; your UI
 * renders the calendar/presets and feeds selections into the instance.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/app-date-range-picker'
 * import { provider } from '@molecule/app-date-range-picker-default'
 *
 * setProvider(provider)                    // once, at app startup (bonds.ts)
 *
 * const picker = requireProvider().createPicker({
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-01-31'),
 *   presets: [{ label: t('dates.last30', undefined, { defaultValue: 'Last 30 days' }), range: last30 }],
 *   onChange: (range) => loadReport(range),
 * })
 * ```
 *
 * @remarks
 * - **The instance is headless — it renders no calendar.** Render your own
 *   calendar/preset UI (styled via `getClassMap()`/`cm.*`, all labels through
 *   `t('key', values, { defaultValue })`) and drive the instance; `onChange` fires
 *   with a `{ startDate, endDate }` range.
 * - **Wire with `setProvider()` from THIS package, not `bond('date-range-picker', …)`**
 *   — the singleton is module-local and `requireProvider()` throws otherwise.
 * - Format displayed dates with the i18n layer (`formatDate` from
 *   `@molecule/app-i18n`), never `toLocaleDateString` with a hardcoded locale.
 * - Send API-bound dates as ISO strings; the server must re-validate the range
 *   (order, bounds) — client clamping via `minDate`/`maxDate` is UX, not a boundary.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
