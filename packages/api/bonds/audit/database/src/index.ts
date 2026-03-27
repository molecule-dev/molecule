/**
 * Database-backed audit provider for molecule.dev.
 *
 * Persists audit trail entries using the abstract `DataStore` from
 * `@molecule/api-database`. Supports filtering, pagination, and export
 * to CSV or JSON.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-audit'
 * import { provider } from '@molecule/api-audit-database'
 *
 * setProvider(provider)
 * ```
 */

export * from './provider.js'
export * from './types.js'
