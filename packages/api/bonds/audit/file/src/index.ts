/**
 * File-based audit provider for molecule.dev.
 *
 * Stores audit trail entries as newline-delimited JSON (NDJSON) files.
 * Supports log rotation, querying, and export to CSV or JSON. Ideal for
 * development, testing, or single-instance deployments.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-audit'
 * import { provider } from '@molecule/api-audit-file'
 *
 * setProvider(provider)
 * ```
 */

export * from './provider.js'
export * from './types.js'
