/**
 * Database-backed reporting provider for molecule.dev.
 *
 * Implements the `ReportProvider` interface using the bonded
 * `@molecule/api-database` pool for SQL-based aggregate and
 * time-series reporting. No external analytics engine required —
 * uses the existing database bond.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-reporting'
 * import { provider } from '@molecule/api-reporting-database'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **Requires a PostgreSQL-dialect database bond.** Time-series queries use
 *   `date_trunc()` and the internal schedules table uses `JSONB`/`TIMESTAMPTZ`/`NOW()`
 *   — on the sqlite/mysql database bonds `timeSeries()` and `schedule()` fail with SQL
 *   syntax errors ($n placeholders are translated by those bonds; these functions/types
 *   are not). `aggregate()` sticks to portable GROUP BY SQL.
 * - **`schedule()` does NOT execute or deliver anything.** It persists the report
 *   definition (query, format, cron string, recipients) to a
 *   `<tablePrefix>schedules` table for an EXTERNAL scheduler/worker to consume — no
 *   bundled process runs the cron or emails recipients. Pair it with
 *   `@molecule/api-scheduler` + an email bond (or an external cron) that reads this
 *   table, or don't surface scheduled reports in the app.
 * - Export formats: `csv` and `json` are native; `xlsx` is XML Spreadsheet 2003
 *   (opens in Excel/LibreOffice — not a real `.xlsx` ZIP container).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
