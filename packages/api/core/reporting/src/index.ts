/**
 * Aggregate reporting core interface for molecule.dev.
 *
 * Defines the abstract {@link ReportProvider} contract and convenience
 * functions for executing aggregate queries, time-series analysis,
 * data export, and report scheduling.
 *
 * @example
 * ```typescript
 * import { join } from 'node:path'
 *
 * import { setPool } from '@molecule/api-database'
 * // Postgres-dialect bond for timeSeries()/scheduleReport(); aggregate()/export also run on SQLite.
 * import { createMigrator, pool } from '@molecule/api-database-sqlite'
 * import type { AggregateQuery } from '@molecule/api-reporting'
 * import { aggregate, exportReport, setProvider } from '@molecule/api-reporting'
 * import { createProvider } from '@molecule/api-reporting-database'
 *
 * // Startup: the reporting bond queries through the bonded database POOL (not the store).
 * await createMigrator(join(process.cwd(), 'migrations'))() // creates `orders`
 * setPool(pool)
 * setProvider(createProvider({ maxRows: 1000 }))
 *
 * // Revenue per status for ONE owner — nothing is scoped unless you add the filter.
 * const userId = 'user-123' // from the authenticated session
 * const revenueByStatus: AggregateQuery = {
 *   table: 'orders',
 *   measures: [
 *     { field: 'id', function: 'count', alias: 'orders' },
 *     { field: 'total_cents', function: 'sum', alias: 'revenue_cents' },
 *   ],
 *   dimensions: ['status'],
 *   filters: [{ field: 'user_id', operator: 'eq', value: userId }],
 *   orderBy: [{ field: 'revenue_cents', direction: 'desc' }],
 * }
 *
 * const { rows, total } = await aggregate(revenueByStatus)
 * // rows: [{ status: 'paid', orders: 2, revenue_cents: 5000 }, …]; total = number of groups
 * const csv = await exportReport(revenueByStatus, 'csv') // Buffer — send as text/csv
 * ```
 *
 * @remarks
 * - **Bond BOTH the database pool and this provider.** `@molecule/api-reporting-database`
 *   runs raw SQL through `@molecule/api-database`'s pool — `setPool(pool)` is required
 *   (`setStore` alone is not enough).
 * - **`timeSeries()` and `scheduleReport()` need a PostgreSQL-dialect database**
 *   (`date_trunc`, `JSONB`); on SQLite/MySQL they fail with SQL errors.
 * - **Nothing is scoped automatically.** Every user-facing report MUST carry a `filters`
 *   entry on the owning column (`{ field: 'user_id', operator: 'eq', value: userId }` —
 *   operators are `eq`/`neq`/`gt`/…, not `'='`) or one user sees another's numbers.
 * - **`table`/`field`/`dateField` are PHYSICAL storage names** — the table/column names your
 *   migrations created (typically snake_case, e.g. `created_at`), not model property names.
 *   A camelCase field that "looks right" returns empty or errored results.
 * - Filter VALUES are parameterized and identifiers sanitized by the reference bond, but
 *   never pass user input as a `table`/`field`/`alias` name — only as filter values.
 * - `scheduleReport()` only STORES the definition — nothing is sent until you drive the
 *   bond's `runDueReports(deliver)` on a ~1-minute cron.
 * - Aggregate values come back as the driver returns them (a Postgres `SUM`/`COUNT` can
 *   be a string) — coerce with `Number()` before arithmetic.
 *
 * @module
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Report/dashboard screens render aggregates that MATCH the seeded data —
 *   spot-check at least one total against rows you can count in the UI.
 * - [ ] Changing the date range (and interval, if exposed) visibly updates the
 *   series and totals.
 * - [ ] A dimension breakdown (e.g. by status/category) renders one segment or
 *   series per group present in the data.
 * - [ ] A range with no data shows zeros or an empty state — not NaN, `undefined`,
 *   or a crashed chart.
 * - [ ] If export is surfaced, the downloaded file's rows match what the report
 *   displays.
 * - [ ] Reports are scoped to the signed-in user/tenant — never another user's
 *   numbers.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
