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
 */

export * from './provider.js'
export * from './types.js'
