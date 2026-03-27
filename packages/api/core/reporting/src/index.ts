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
 */

export * from './provider.js'
export * from './types.js'
