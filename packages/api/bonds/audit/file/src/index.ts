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
 * - **Wire it through the core** (`setProvider(...)` from `@molecule/api-audit`), not
 *   `bond('audit-file', ...)`. Export with the core's `auditExport(query, 'csv' | 'json')` — a
 *   `Buffer` of ALL matching records (`page`/`perPage` are ignored).
 * - Files are named `<filePrefix>-YYYY-MM-DD.ndjson` (UTC date); `maxFileSize` is BYTES
 *   (default 10 MB) — over it, a new timestamped file is started. Old files are never deleted.
 *
 * @example
 * ```typescript
 * import { mkdir } from 'node:fs/promises'
 *
 * import { auditExport, log, query, setProvider } from '@molecule/api-audit'
 * import { createProvider } from '@molecule/api-audit-file'
 *
 * // Startup: the directory MUST exist before the first log() — the provider does not create it.
 * const directory = process.env.AUDIT_LOG_DIR ?? './audit-logs'
 * await mkdir(directory, { recursive: true })
 * setProvider(createProvider({ directory, maxFileSize: 10 * 1024 * 1024 }))
 *
 * await log({
 *   actor: 'user:123',
 *   action: 'project.delete',
 *   resource: 'project',
 *   resourceId: 'proj-42',
 *   details: { name: 'Old site' },
 * })
 *
 * // Newest first, paginated: { data: AuditRecord[], total, page, perPage, totalPages }
 * const recent = await query({ actor: 'user:123', page: 1, perPage: 20 })
 * const csv = await auditExport({ resource: 'project' }, 'csv') // Buffer, header row first
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
