/**
 * Database-backed reporting provider for molecule.dev.
 *
 * Implements the `ReportProvider` interface using the bonded
 * `@molecule/api-database` pool for SQL-based aggregate and
 * time-series reporting. No external analytics engine required —
 * uses the existing database bond.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-reporting'
 * import { provider } from '@molecule/api-reporting-database'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
