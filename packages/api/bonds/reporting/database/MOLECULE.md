# @molecule/api-reporting-database

Database-backed reporting provider for molecule.dev.

Implements the `ReportProvider` interface using the bonded
`@molecule/api-database` pool for SQL-based aggregate and
time-series reporting. No external analytics engine required —
uses the existing database bond.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-reporting'
import { provider } from '@molecule/api-reporting-database'

setProvider(provider)
```

```typescript
// Actually DELIVER scheduled reports: drive runDueReports() once a minute and
// hand each generated report to an email bond. Delivery stays swappable — this
// bond never imports an email transport itself.
import { schedule } from '@molecule/api-cron'
import { sendMail } from '@molecule/api-emails'
import { provider } from '@molecule/api-reporting-database'

await schedule('reporting:deliver-due', '* * * * *', async () => {
  await provider.runDueReports(async ({ schedule: report, data, recipients, format }) => {
    if (recipients.length === 0) return
    await sendMail({
      from: 'reports@example.com',
      to: recipients,
      subject: `Scheduled report: ${report.name}`,
      text: `Your "${report.name}" report is attached.`,
      attachments: [{ filename: `${report.name}.${format}`, content: data }],
    })
  })
})
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-reporting-database @molecule/api-database @molecule/api-reporting
```

## API

### Interfaces

#### `AggregateQuery`

Query definition for aggregate reports.

```typescript
interface AggregateQuery {
    /** Table or view to query. */
    table: string;
    /** Measures (aggregations) to compute. */
    measures: Measure[];
    /** Columns to group by. */
    dimensions?: string[];
    /** WHERE clause filters. */
    filters?: Filter[];
    /** HAVING clause filters (applied after aggregation). */
    having?: Filter[];
    /** Result ordering. */
    orderBy?: OrderBy[];
    /** Maximum number of rows to return. */
    limit?: number;
}
```

#### `AggregateResult`

Result of an aggregate query.

```typescript
interface AggregateResult {
    /** Aggregated rows. */
    rows: Record<string, unknown>[];
    /** Total number of matching rows (before LIMIT). */
    total: number;
}
```

#### `DatabaseReportingOptions`

Configuration options for the database reporting provider.

```typescript
interface DatabaseReportingOptions {
  /**
   * Table prefix for internal reporting tables (schedules, etc.).
   *
   * @default '_reporting_'
   */
  tablePrefix?: string

  /**
   * Maximum rows returned when no limit is specified on aggregate queries.
   *
   * @default 10000
   */
  maxRows?: number
}
```

#### `DatabaseReportProvider`

The database reporting bond's provider — the core {@link ReportProvider} plus
the persistence-backed delivery runner. `schedule()` only records intent; the
two methods below turn that persisted intent into actual delivery, which the
core interface intentionally leaves to the bond (a cloud-analytics reporting
bond would deliver through its own service instead).

```typescript
interface DatabaseReportProvider extends ReportProvider {
  /**
   * Returns every persisted schedule (newest last), with its query, cron
   * expression, recipients, and run timestamps.
   *
   * @returns All stored schedules.
   */
  listSchedules(): Promise<StoredSchedule[]>

  /**
   * Generates every due report and hands it to `deliver`, then records the run.
   * Intended to be invoked on a ~1-minute cadence (e.g. an `@molecule/api-cron`
   * `* * * * *` job or an `@molecule/api-scheduler` task with `intervalMs:
   * 60000`). A due minute missed while the process is down is skipped, not
   * caught up — consistent with the cron/scheduler bonds.
   *
   * @param deliver - Callback that delivers each generated report.
   * @param options - Due-ness predicate and evaluation instant overrides.
   * @returns The delivered / skipped / failed schedule ids.
   */
  runDueReports(
    deliver: DeliverReport,
    options?: RunDueReportsOptions,
  ): Promise<RunDueReportsResult>
}
```

#### `Filter`

A filter condition for queries.

```typescript
interface Filter {
    /** Column to filter on. */
    field: string;
    /** Comparison operator. */
    operator: FilterOperator;
    /** Value or values to compare against. */
    value: unknown;
}
```

#### `Measure`

A measure to compute during aggregation.

```typescript
interface Measure {
    /** Column or expression to aggregate. */
    field: string;
    /** Aggregate function to apply. */
    function: AggregateFunction;
    /** Optional alias for the result column. */
    alias?: string;
}
```

#### `OrderBy`

An ordering clause for query results.

```typescript
interface OrderBy {
    /** Column to sort by. */
    field: string;
    /** Sort direction. */
    direction: SortDirection;
}
```

#### `ReportDelivery`

A generated report ready for delivery, handed to a {@link DeliverReport}
callback by {@link DatabaseReportProvider.runDueReports}.

```typescript
interface ReportDelivery {
  /** The schedule that produced this report. */
  schedule: StoredSchedule

  /** The generated export payload (e.g. an email attachment body). */
  data: Buffer

  /** Recipients declared on the schedule (may be empty). */
  recipients: string[]

  /** The format `data` was generated in (drives filename/MIME on the caller side). */
  format: ExportFormat
}
```

#### `ReportProvider`

Reporting provider interface.

All reporting providers must implement this interface.

```typescript
interface ReportProvider {
    /**
     * Executes an aggregate query and returns grouped results.
     *
     * @param query - The aggregate query definition.
     * @returns Aggregated rows and total count.
     */
    aggregate(query: AggregateQuery): Promise<AggregateResult>;
    /**
     * Executes a time-series query and returns bucketed data points.
     *
     * @param query - The time-series query definition.
     * @returns Ordered time-series points.
     */
    timeSeries(query: TimeSeriesQuery): Promise<TimeSeriesResult>;
    /**
     * Exports query results in the specified format.
     *
     * @param query - The query to execute and export.
     * @param format - The desired output format.
     * @returns A Buffer containing the exported data.
     */
    export(query: AggregateQuery | TimeSeriesQuery, format: ExportFormat): Promise<Buffer>;
    /**
     * Creates a scheduled report and returns its unique identifier.
     *
     * @param report - The scheduled report configuration.
     * @returns The schedule identifier.
     */
    schedule(report: ScheduledReport): Promise<string>;
    /**
     * Cancels a previously scheduled report.
     *
     * @param scheduleId - The schedule identifier to cancel.
     */
    cancelSchedule(scheduleId: string): Promise<void>;
}
```

#### `RunDueReportsOptions`

Options for {@link DatabaseReportProvider.runDueReports}.

```typescript
interface RunDueReportsOptions {
  /**
   * Predicate deciding whether a stored schedule is due at `now`. Defaults to
   * `isScheduleDue` — the schedule's cron matches the current UTC minute and it
   * has not already run during that minute. Inject a custom predicate for
   * timezone-aware matching, named cron fields, or catch-up semantics.
   */
  isDue?: (schedule: StoredSchedule, now: Date) => boolean

  /** The instant to evaluate due-ness against. Defaults to `new Date()`. */
  now?: Date
}
```

#### `RunDueReportsResult`

Outcome of a {@link DatabaseReportProvider.runDueReports} pass.

```typescript
interface RunDueReportsResult {
  /** Ids of schedules generated and handed to `deliver` successfully. */
  delivered: string[]

  /** Ids of schedules that were not due this pass. */
  skipped: string[]

  /** Schedules whose generation or delivery threw, with the error message. */
  failed: { id: string; error: string }[]
}
```

#### `ScheduledReport`

Configuration for a scheduled report.

```typescript
interface ScheduledReport {
    /** Human-readable report name. */
    name: string;
    /** The query to execute on schedule. */
    query: AggregateQuery | TimeSeriesQuery;
    /** Output format for the scheduled report. */
    format: ExportFormat;
    /** Cron expression defining the schedule. */
    schedule: string;
    /** Email addresses to deliver the report to. */
    recipients?: string[];
}
```

#### `StoredSchedule`

A scheduled report as persisted by {@link ReportProvider.schedule} and read
back by {@link DatabaseReportProvider.listSchedules} /
{@link DatabaseReportProvider.runDueReports}. Unlike the write-side
`ScheduledReport`, this carries the generated `id`, a normalized (never
`undefined`) `recipients` array, and the persistence timestamps.

```typescript
interface StoredSchedule {
  /** Unique schedule identifier (the value `schedule()` returned). */
  id: string

  /** Human-readable report name. */
  name: string

  /** The query to execute when the schedule fires. */
  query: AggregateQuery | TimeSeriesQuery

  /** Output format for the generated report. */
  format: ExportFormat

  /** Cron expression defining the schedule. */
  schedule: string

  /** Delivery recipients (empty when the schedule was created without any). */
  recipients: string[]

  /** ISO 8601 creation timestamp, or `null` if the store did not record one. */
  createdAt: string | null

  /** ISO 8601 timestamp of the last successful delivery, or `null` if never run. */
  lastRunAt: string | null
}
```

#### `TimeSeriesPoint`

A single data point in a time series.

```typescript
interface TimeSeriesPoint {
    /** ISO 8601 date string for the bucket start. */
    date: string;
    /** Aggregated values keyed by measure alias or field. */
    values: Record<string, number>;
}
```

#### `TimeSeriesQuery`

Query definition for time-series reports.

```typescript
interface TimeSeriesQuery {
    /** Table or view to query. */
    table: string;
    /** Date/timestamp column to bucket by. */
    dateField: string;
    /** Time bucket granularity. */
    interval: TimeInterval;
    /** Measures (aggregations) to compute per bucket. */
    measures: Measure[];
    /** WHERE clause filters. */
    filters?: Filter[];
    /** Start of the date range (inclusive). */
    startDate?: Date;
    /** End of the date range (inclusive). */
    endDate?: Date;
}
```

#### `TimeSeriesResult`

Result of a time-series query.

```typescript
interface TimeSeriesResult {
    /** Ordered data points. */
    points: TimeSeriesPoint[];
    /** The interval granularity used. */
    interval: string;
}
```

### Types

#### `AggregateFunction`

Aggregate function applied to a measure field.

```typescript
type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countDistinct';
```

#### `DeliverReport`

Delivery callback invoked once per due report. The caller wires this to its
own channel — typically `sendMail()` from `@molecule/api-emails` with `data`
as an attachment. This bond never sends anything itself, keeping delivery
swappable. Throwing marks the report failed and leaves `lastRunAt` unadvanced
so the next run retries it.

```typescript
type DeliverReport = (delivery: ReportDelivery) => Promise<void>
```

#### `ExportFormat`

Supported export formats.

```typescript
type ExportFormat = 'csv' | 'json' | 'xlsx';
```

#### `FilterOperator`

Filter operator for WHERE and HAVING clauses.

```typescript
type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'between' | 'like';
```

#### `SortDirection`

Sort direction for ORDER BY clauses.

```typescript
type SortDirection = 'asc' | 'desc';
```

#### `TimeInterval`

Time interval granularity for time-series queries.

```typescript
type TimeInterval = 'hour' | 'day' | 'week' | 'month' | 'year';
```

### Functions

#### `createProvider(options)`

Creates a database-backed reporting provider instance.

Uses the bonded `@molecule/api-database` pool for all queries. Aggregate
and time-series reports are translated to parameterized SQL. Scheduled
reports are persisted to a database table; `runDueReports()` generates the
due ones and hands each to an injected delivery callback (see the module docs
for the email-bond wiring pattern).

```typescript
function createProvider(options?: DatabaseReportingOptions): DatabaseReportProvider
```

- `options` — Provider configuration options.

**Returns:** A fully configured `DatabaseReportProvider` implementation.

#### `cronMatches(expr, date)`

Tests whether a cron expression matches the given instant (evaluated in UTC).

Follows the standard Vixie-cron day rule: when BOTH day-of-month and
day-of-week are restricted (neither is `*`), a match on EITHER is sufficient;
otherwise the restricted field(s) must match.

```typescript
function cronMatches(expr: string, date: Date): boolean
```

- `expr` — A 5-field cron expression.
- `date` — The instant to test.

**Returns:** `true` if `expr` fires at `date`.

#### `isScheduleDue(schedule, now)`

Default due-ness predicate for {@link DatabaseReportProvider.runDueReports}: a
schedule is due when its cron matches `now`'s UTC minute AND it has not
already run during that same minute (guards against a runner invoked more
than once per minute double-delivering).

```typescript
function isScheduleDue(schedule: StoredSchedule, now: Date): boolean
```

- `schedule` — The stored schedule.
- `now` — The instant to evaluate against.

**Returns:** `true` if the schedule should run now.

#### `parseCronField(field, lo, hi)`

Parses a single cron field into the concrete set of values it matches within
`[lo, hi]`. Supports `*`, `a`, `a-b`, and any of those with a `/step` suffix,
plus comma-separated lists of them.

```typescript
function parseCronField(field: string, lo: number, hi: number): Set<number>
```

- `field` — The raw cron field text (e.g. `'1-5'`, `'0,30'`, `'0-20/5'`).
- `lo` — Lowest legal value for this field.
- `hi` — Highest legal value for this field.

**Returns:** The set of matching integer values.

### Constants

#### `provider`

Default lazily-initialized database reporting provider.
Uses the bonded database pool for queries.

```typescript
const provider: DatabaseReportProvider
```

## Core Interface
Implements `@molecule/api-reporting` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-reporting'
import { provider } from '@molecule/api-reporting-database'

export function setupReportingDatabase(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-reporting` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-reporting`

- **Requires a PostgreSQL-dialect database bond.** Time-series queries use
  `date_trunc()` and the internal schedules table uses `JSONB`/`TIMESTAMPTZ`/`NOW()`
  — on the sqlite/mysql database bonds `timeSeries()` and `schedule()` fail with SQL
  syntax errors ($n placeholders are translated by those bonds; these functions/types
  are not). `aggregate()` sticks to portable GROUP BY SQL.
- **Scheduling is record-then-run — `schedule()` delivers nothing by itself.**
  It only PERSISTS the report definition (query, format, cron string,
  recipients) to a `<tablePrefix>schedules` table; it does not run the cron or
  email anyone. To make delivery real, drive `runDueReports(deliver)` on a
  ~1-minute cadence (an `@molecule/api-cron` `* * * * *` job, an
  `@molecule/api-scheduler` task with `intervalMs: 60000`, or an external cron):
  it generates each due report and hands the buffer to your `deliver` callback,
  which sends it however you like (see the second example). `listSchedules()`
  enumerates what's stored; `cancelSchedule(id)` removes one. A due minute
  missed while the process is down is skipped, not caught up — consistent with
  the cron/scheduler bonds. The built-in due-ness matcher reads standard 5-field
  numeric cron in UTC; inject `runDueReports(deliver, { isDue })` for timezone
  or named-field matching.
- Export formats: `csv` and `json` are native; `xlsx` is XML Spreadsheet 2003
  (opens in Excel/LibreOffice — not a real `.xlsx` ZIP container).

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Report/dashboard screens render aggregates that MATCH the seeded data —
  spot-check at least one total against rows you can count in the UI.
- [ ] Changing the date range (and interval, if exposed) visibly updates the
  series and totals.
- [ ] A dimension breakdown (e.g. by status/category) renders one segment or
  series per group present in the data.
- [ ] A range with no data shows zeros or an empty state — not NaN, `undefined`,
  or a crashed chart.
- [ ] If export is surfaced, the downloaded file's rows match what the report
  displays.
- [ ] Reports are scoped to the signed-in user/tenant — never another user's
  numbers.
