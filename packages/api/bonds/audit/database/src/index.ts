/**
 * Database-backed audit provider for molecule.dev.
 *
 * Persists audit trail entries using the abstract `DataStore` from
 * `@molecule/api-database`. Supports filtering, pagination, and export
 * to CSV or JSON.
 *
 * @example
 * ```typescript
 * import { log, query, setProvider } from '@molecule/api-audit'
 * import { createProvider } from '@molecule/api-audit-database'
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 *
 * // Startup: bond the DataStore FIRST (postgresql reads DATABASE_URL), then the audit provider.
 * setStore(store)
 * setProvider(createProvider({ tableName: 'audit_log' })) // table must exist (see remarks)
 *
 * await log({
 *   actor: 'user:123',
 *   action: 'project.delete',
 *   resource: 'project',
 *   resourceId: 'proj-42',
 *   details: { name: 'Old site' },
 *   ip: '203.0.113.7',
 * })
 *
 * // Newest first, paginated: { data: AuditRecord[], total, page, perPage, totalPages }
 * const recent = await query({ actor: 'user:123', page: 1, perPage: 20 })
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
 * - **Wire it through the core** (`setProvider(...)` from `@molecule/api-audit`), not
 *   `bond('audit-database', ...)`. `setProvider(provider)` uses the default `audit_log` table.
 * - Export with the core's `auditExport(query, 'csv' | 'json')` (there is no core `export()` —
 *   it is a reserved word); it returns a `Buffer` of ALL matching rows, ignoring `page`/`perPage`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
