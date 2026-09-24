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
 * import { setPool } from '@molecule/api-database'
 * import { pool } from '@molecule/api-database-postgresql'
 * import type { AggregateQuery } from '@molecule/api-reporting'
 * import { aggregate, exportReport, setProvider, timeSeries } from '@molecule/api-reporting'
 * import { createProvider } from '@molecule/api-reporting-database'
 *
 * // Startup: a PostgreSQL pool FIRST (DATABASE_URL), then this bond.
 * setPool(pool)
 * setProvider(createProvider({ maxRows: 5000 }))
 *
 * // Revenue and order count per status since Jan 1 (`orders` is your own table).
 * const byStatus: AggregateQuery = {
 *   table: 'orders',
 *   measures: [
 *     { field: 'total', function: 'sum', alias: 'revenue' },
 *     { field: 'id', function: 'count', alias: 'orders' },
 *   ],
 *   dimensions: ['status'],
 *   filters: [{ field: 'created_at', operator: 'gte', value: new Date('2026-01-01T00:00:00Z') }],
 *   orderBy: [{ field: 'revenue', direction: 'desc' }],
 *   limit: 10,
 * }
 * const { rows, total } = await aggregate(byStatus) // rows: [{ status: 'paid', revenue: '1250.00', orders: '12' }, …]
 *
 * // Daily revenue for a week — values come back as numbers.
 * const daily = await timeSeries({
 *   table: 'orders',
 *   dateField: 'created_at',
 *   interval: 'day',
 *   measures: [{ field: 'total', function: 'sum', alias: 'revenue' }],
 *   startDate: new Date('2026-09-01T00:00:00Z'),
 *   endDate: new Date('2026-09-08T00:00:00Z'),
 * }) // daily.points: [{ date: '2026-09-01T00:00:00.000Z', values: { revenue: 310 } }, …]
 *
 * const csv = await exportReport(byStatus, 'csv') // Buffer: "status,revenue,orders\npaid,1250.00,12\n…"
 * ```
 *
 * @remarks
 * - **Requires a PostgreSQL-dialect database bond.** Time-series queries use
 *   `date_trunc()` and the internal schedules table uses `JSONB`/`TIMESTAMPTZ`/`NOW()`
 *   — on the sqlite/mysql database bonds `timeSeries()` and `schedule()` fail with SQL
 *   syntax errors ($n placeholders are translated by those bonds; these functions/types
 *   are not). `aggregate()` sticks to portable GROUP BY SQL.
 * - **Scheduling is record-then-run — `schedule()` delivers nothing by itself.**
 *   It only PERSISTS the report definition (query, format, cron string,
 *   recipients) to a `<tablePrefix>schedules` table; it does not run the cron or
 *   email anyone. To make delivery real, drive `runDueReports(deliver)` on a
 *   ~1-minute cadence (an `@molecule/api-cron` `* * * * *` job, an
 *   `@molecule/api-scheduler` task with `intervalMs: 60000`, or an external cron):
 *   it generates each due report and hands the buffer to your `deliver` callback,
 *   which sends it however you like (e.g. `sendMail()` from `@molecule/api-emails`
 *   with `recipients` as `to` and `data` as an attachment). `runDueReports()`
 *   and `listSchedules()` live on THIS bond's provider object
 *   (keep the `createProvider()` return value) — the core only exposes
 *   `scheduleReport`/`cancelSchedule`. `listSchedules()` enumerates what's stored; `cancelSchedule(id)` removes one. A due minute
 *   missed while the process is down is skipped, not caught up — consistent with
 *   the cron/scheduler bonds. The built-in due-ness matcher reads standard 5-field
 *   numeric cron in UTC; inject `runDueReports(deliver, { isDue })` for timezone
 *   or named-field matching.
 * - **`aggregate()` rows are returned exactly as the driver gives them** — on
 *   PostgreSQL `SUM`/`COUNT` are `numeric`/`bigint`, so node-postgres hands back STRINGS
 *   (`'1250.00'`, `'12'`); `Number()` them. `timeSeries()` values ARE converted to numbers.
 * - Identifiers (`table`, `field`, `alias`, dimensions) must be plain `[A-Za-z0-9_]` names:
 *   any other character is SILENTLY replaced with `_` (`public.orders` queries
 *   `"public_orders"`; no expressions). Filter VALUES are always bound parameters. Without a
 *   `limit`, `aggregate()` caps rows at `maxRows` (default 10 000) while `total` still counts
 *   every group.
 * - Export formats: `csv` and `json` are native; `xlsx` is XML Spreadsheet 2003
 *   (opens in Excel/LibreOffice — not a real `.xlsx` ZIP container).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './scheduling.js'
export * from './types.js'
