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
 * @example
 * ```typescript
 * // Actually DELIVER scheduled reports: drive runDueReports() once a minute and
 * // hand each generated report to an email bond. Delivery stays swappable — this
 * // bond never imports an email transport itself.
 * import { schedule } from '@molecule/api-cron'
 * import { sendMail } from '@molecule/api-emails'
 * import { provider } from '@molecule/api-reporting-database'
 *
 * await schedule('reporting:deliver-due', '* * * * *', async () => {
 *   await provider.runDueReports(async ({ schedule: report, data, recipients, format }) => {
 *     if (recipients.length === 0) return
 *     await sendMail({
 *       from: 'reports@example.com',
 *       to: recipients,
 *       subject: `Scheduled report: ${report.name}`,
 *       text: `Your "${report.name}" report is attached.`,
 *       attachments: [{ filename: `${report.name}.${format}`, content: data }],
 *     })
 *   })
 * })
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
 *   which sends it however you like (see the second example). `listSchedules()`
 *   enumerates what's stored; `cancelSchedule(id)` removes one. A due minute
 *   missed while the process is down is skipped, not caught up — consistent with
 *   the cron/scheduler bonds. The built-in due-ness matcher reads standard 5-field
 *   numeric cron in UTC; inject `runDueReports(deliver, { isDue })` for timezone
 *   or named-field matching.
 * - Export formats: `csv` and `json` are native; `xlsx` is XML Spreadsheet 2003
 *   (opens in Excel/LibreOffice — not a real `.xlsx` ZIP container).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './scheduling.js'
export * from './types.js'
