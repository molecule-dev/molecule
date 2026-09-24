/**
 * Data import/export core interface for molecule.dev.
 *
 * Defines the abstract {@link ImportExportProvider} contract and convenience
 * functions for importing CSV/JSON data, exporting to CSV/JSON/Excel, and
 * tracking asynchronous import job status.
 *
 * @module
 * @example
 * ```typescript
 * import { exportCSV, getJobStatus, importCSV, setProvider } from '@molecule/api-import-export'
 * import { createProvider } from '@molecule/api-import-export-csv'
 *
 * // Startup: the `@molecule/api-database` bond must already be wired and the
 * // `contacts` table migrated — imports insert rows through the DataStore.
 * setProvider(createProvider({ maxExportRows: 10_000 }))
 *
 * // Import an uploaded CSV (a Buffer). Headers are renamed to column names via `mapping`.
 * const upload = Buffer.from(
 *   'Full Name,Email Address,Plan\nAda Lovelace,ada@example.com,pro\nNo Email,,free\n',
 * )
 * const result = await importCSV('contacts', upload, {
 *   mapping: { 'Full Name': 'name', 'Email Address': 'email', Plan: 'plan' },
 *   validateRow: (row) => typeof row.email === 'string' && row.email.includes('@'),
 *   skipDuplicates: true,
 * })
 * // result: { totalRows: 2, importedRows: 1, skippedRows: 1, errors: [] } — report partial imports.
 * const job = await getJobStatus(result.jobId) // { status: 'completed', result }
 *
 * // Export: a WHITELISTED table, explicit columns, and server-side filters.
 * const csv = await exportCSV('contacts', {
 *   filters: [{ field: 'plan', operator: 'eq', value: 'pro' }],
 *   columns: ['name', 'email'],
 *   orderBy: [{ field: 'name', direction: 'asc' }],
 * })
 * // Set Content-Type: text/csv + Content-Disposition yourself when sending `csv` (a Buffer).
 * ```
 *
 * @remarks
 * - **Wire the database first — and migrate the target table.** Providers
 *   persist through the bonded `@molecule/api-database` DataStore: bond it
 *   before `setProvider(...)`, and the `table` (with its columns) must already
 *   exist via your app's migrations. Imports do NOT create tables.
 * - **Never pass a client-supplied `table` (or raw filter fields) through.**
 *   `exportCSV(req.query.table)` is a full-database exfiltration hole.
 *   Whitelist the table server-side per endpoint, and ALWAYS add server-side
 *   owner scoping to the query (e.g. a `{ field: 'user_id', operator: 'eq',
 *   value: authenticatedUserId }` filter) so users can only export their own rows.
 * - Exports return the file CONTENT (`Buffer` for CSV/Excel, rows for JSON) —
 *   the endpoint must set `Content-Type` / `Content-Disposition` itself for a
 *   download.
 * - With `@molecule/api-import-export-csv`, every imported CSV value is a
 *   STRING (`'42'`, `'true'`) — coerce types in `validateRow`/your schema; the
 *   `between` filter operator is NOT supported there (it silently degrades to
 *   `eq`), and `exportExcel()` returns an XML Spreadsheet 2003 document
 *   (`.xls`), not an `.xlsx` workbook.
 * - Imports run to completion before the promise resolves; `getJobStatus()` is
 *   an in-process record (lost on restart, not shared across instances).
 * - Import failures are per-row (`result.errors`, 1-based row numbers) with
 *   `skippedRows` counted separately — surface them; don't report success when
 *   `importedRows < totalRows`.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Exporting from the UI downloads a file whose rows and columns match
 *   the data on screen (spot-check at least one row's values).
 * - [ ] Importing a valid file adds the records: they appear in the UI and
 *   survive a full reload.
 * - [ ] If the app surfaces column mapping, a file whose headers differ from
 *   the field names imports into the RIGHT fields via the mapping.
 * - [ ] A malformed file (wrong columns, broken rows) is rejected with a
 *   readable error — no silent partial import; per-row errors (if reported)
 *   are truthful.
 * - [ ] Re-importing the same file honors the app's duplicate policy (e.g.
 *   skip-duplicates does not double the rows).
 * - [ ] Round-trip integrity: export, then re-import the same file — values,
 *   encodings, and special characters come back unchanged.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
