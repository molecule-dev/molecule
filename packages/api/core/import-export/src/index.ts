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
 * import { setProvider, importCSV, exportJSON, getJobStatus } from '@molecule/api-import-export'
 * import { provider } from '@molecule/api-import-export-csv'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Import CSV data
 * const result = await importCSV('users', csvBuffer, {
 *   mapping: { 'Full Name': 'name', 'Email Address': 'email' },
 *   skipDuplicates: true,
 * })
 *
 * // Export data as JSON
 * const rows = await exportJSON('users', {
 *   filters: [{ field: 'active', operator: 'eq', value: true }],
 *   columns: ['name', 'email'],
 * })
 *
 * // Check import job status
 * const status = await getJobStatus(result.jobId)
 * ```
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
