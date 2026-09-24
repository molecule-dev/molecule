/**
 * CSV import/export provider for molecule.dev.
 *
 * Implements the `ImportExportProvider` contract from `@molecule/api-import-export`
 * using pure TypeScript CSV parsing/formatting and the bonded
 * `@molecule/api-database` DataStore for all database operations.
 *
 * @example
 * ```typescript
 * import { readFile } from 'node:fs/promises'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-sqlite'
 * import { exportCSV, importCSV, setProvider } from '@molecule/api-import-export'
 * import { createProvider } from '@molecule/api-import-export-csv'
 *
 * // Startup: rows are written/read through the bonded DataStore — bond one FIRST.
 * setStore(store) // the `contacts` table (id, name, email UNIQUE) comes from your migrations
 * setProvider(createProvider({ maxExportRows: 10000 }))
 *
 * // contacts.csv — header row first:  Full Name,email
 * const upload = await readFile('uploads/contacts.csv')
 * const result = await importCSV('contacts', upload, {
 *   mapping: { 'Full Name': 'name' }, // CSV header → column
 *   validateRow: (row) => String(row.email).includes('@'), // false → skipped
 *   skipDuplicates: true, // unique-constraint violations are skipped, not reported
 * })
 * // { jobId, totalRows: 3, importedRows: 2, skippedRows: 1, errors: [] }
 *
 * const csv = await exportCSV('contacts', {
 *   columns: ['name', 'email'],
 *   orderBy: [{ field: 'name', direction: 'asc' }],
 * })
 * // Buffer: 'name,email\nAda Lovelace,ada@example.com\nGrace Hopper,grace@example.com'
 * ```
 *
 * @remarks
 * - **Bond a DataStore before any import/export** (`setStore(...)` from
 *   `@molecule/api-database`) — this bond has no database of its own and calls
 *   the core `create()` / `findMany()`. The target table must already exist; nothing
 *   is created or migrated.
 * - Wire it with `setProvider(...)` from `@molecule/api-import-export` and call the
 *   core's `importCSV` / `exportCSV` / … — not `bond('import-export-csv', ...)`.
 * - Every parsed CSV value is a STRING (`'30'`, not `30`); the first row is always
 *   the header. `mapping` renames headers BEFORE `validateRow` sees the row.
 * - Rows are inserted ONE AT A TIME with `create()` — no transaction: a failure
 *   part-way leaves earlier rows imported. Per-row failures land in
 *   `result.errors` (1-based `row`) instead of throwing.
 * - `exportExcel()` returns an XML Spreadsheet 2003 document (opens in
 *   Excel/LibreOffice), NOT a real `.xlsx` zip. Exports cap at `maxExportRows`
 *   (default 50000) unless `query.limit` is set; an empty table exports `''`.
 * - Imports run synchronously (the call resolves when done); `getJobStatus()`
 *   reads an in-memory, per-process map.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './csv.js'
export * from './provider.js'
export * from './types.js'
