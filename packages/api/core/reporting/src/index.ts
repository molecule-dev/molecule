/**
 * Aggregate reporting core interface for molecule.dev.
 *
 * Defines the abstract {@link ReportProvider} contract and convenience
 * functions for executing aggregate queries, time-series analysis,
 * data export, and report scheduling.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, aggregate, timeSeries } from '@molecule/api-reporting'
 * import { provider } from '@molecule/api-reporting-database'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Run an aggregate query
 * const result = await aggregate({
 *   table: 'orders',
 *   measures: [{ field: 'amount', function: 'sum', alias: 'totalRevenue' }],
 *   dimensions: ['status'],
 * })
 *
 * // Run a time-series query
 * const series = await timeSeries({
 *   table: 'orders',
 *   dateField: 'created_at',
 *   interval: 'day',
 *   measures: [{ field: 'id', function: 'count', alias: 'orderCount' }],
 * })
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Report/dashboard screens render aggregates that MATCH the seeded data —
 *   spot-check at least one total against rows you can count in the UI.
 * - [ ] Changing the date range (and interval, if exposed) visibly updates the
 *   series and totals.
 * - [ ] A dimension breakdown (e.g. by status/category) renders one segment or
 *   series per group present in the data.
 * - [ ] A range with no data shows zeros or an empty state — not NaN, `undefined`,
 *   or a crashed chart.
 * - [ ] If export is surfaced, the downloaded file's rows match what the report
 *   displays.
 * - [ ] Reports are scoped to the signed-in user/tenant — never another user's
 *   numbers.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
