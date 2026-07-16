/**
 * File-based audit provider for molecule.dev.
 *
 * Stores audit trail entries as newline-delimited JSON (NDJSON) files.
 * Supports log rotation, querying, and export to CSV or JSON. Ideal for
 * development, testing, or single-instance deployments.
 *
 * @remarks
 * - **Create the log directory before the first `log()` call.** The provider
 *   does NOT create it: `log()` throws `ENOENT` if `directory` (default
 *   `'./audit-logs'`) doesn't exist. `await mkdir('./audit-logs', { recursive: true })`
 *   at startup (or point `createProvider({ directory })` at an existing path).
 * - Appends rewrite the whole current log file and `query()`/`export()` load
 *   every matching record into memory — fine for dev/single-instance volumes;
 *   use `@molecule/api-audit-database` for sustained production write rates.
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

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
