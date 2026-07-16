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
reports are persisted to a database table for external schedulers to consume.

```typescript
function createProvider(options?: DatabaseReportingOptions): ReportProvider
```

- `options` — Provider configuration options.

**Returns:** A fully configured `ReportProvider` implementation.

### Constants

#### `provider`

Default lazily-initialized database reporting provider.
Uses the bonded database pool for queries.

```typescript
const provider: ReportProvider
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
- **`schedule()` does NOT execute or deliver anything.** It persists the report
  definition (query, format, cron string, recipients) to a
  `<tablePrefix>schedules` table for an EXTERNAL scheduler/worker to consume — no
  bundled process runs the cron or emails recipients. Pair it with
  `@molecule/api-scheduler` + an email bond (or an external cron) that reads this
  table, or don't surface scheduled reports in the app.
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
