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
 *
 * @remarks
 * - **Wire the database bond first** — every method uses the abstract `DataStore`
 *   (`create`/`findMany`/`count` from `@molecule/api-database`), which throws if no
 *   database provider is bonded when the first audit call runs.
 * - **The audit table is NOT auto-created.** Ship a migration for `audit_log` (or your
 *   `config.tableName`) with columns: `id` TEXT PRIMARY KEY, `actor` TEXT NOT NULL,
 *   `action` TEXT NOT NULL, `resource` TEXT NOT NULL, `resource_id` TEXT NULL,
 *   `details` TEXT NULL (a JSON string — stringified on write, parsed on read),
 *   `ip` TEXT NULL, `user_agent` TEXT NULL, `timestamp` TIMESTAMPTZ/TEXT NOT NULL
 *   (ISO-8601; range-filtered and sorted descending).
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
