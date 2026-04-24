# @molecule/api-reporting

Aggregate reporting core interface for molecule.dev.

Defines the abstract {@link ReportProvider} contract and convenience
functions for executing aggregate queries, time-series analysis,
data export, and report scheduling.

## Quick Start

```typescript
import { setProvider, aggregate, timeSeries } from '@molecule/api-reporting'
import { provider } from '@molecule/api-reporting-database'

// Wire the provider at startup
setProvider(provider)

// Run an aggregate query
const result = await aggregate({
  table: 'orders',
  measures: [{ field: 'amount', function: 'sum', alias: 'totalRevenue' }],
  dimensions: ['status'],
})

// Run a time-series query
const series = await timeSeries({
  table: 'orders',
  dateField: 'created_at',
  interval: 'day',
  measures: [{ field: 'id', function: 'count', alias: 'orderCount' }],
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-reporting
```

## API

### Interfaces

#### `AggregateQuery`

Query definition for aggregate reports.

```typescript
interface AggregateQuery {
  /** Table or view to query. */
  table: string

  /** Measures (aggregations) to compute. */
  measures: Measure[]

  /** Columns to group by. */
  dimensions?: string[]

  /** WHERE clause filters. */
  filters?: Filter[]

  /** HAVING clause filters (applied after aggregation). */
  having?: Filter[]

  /** Result ordering. */
  orderBy?: OrderBy[]

  /** Maximum number of rows to return. */
  limit?: number
}
```

#### `AggregateResult`

Result of an aggregate query.

```typescript
interface AggregateResult {
  /** Aggregated rows. */
  rows: Record<string, unknown>[]

  /** Total number of matching rows (before LIMIT). */
  total: number
}
```

#### `Filter`

A filter condition for queries.

```typescript
interface Filter {
  /** Column to filter on. */
  field: string

  /** Comparison operator. */
  operator: FilterOperator

  /** Value or values to compare against. */
  value: unknown
}
```

#### `Measure`

A measure to compute during aggregation.

```typescript
interface Measure {
  /** Column or expression to aggregate. */
  field: string

  /** Aggregate function to apply. */
  function: AggregateFunction

  /** Optional alias for the result column. */
  alias?: string
}
```

#### `OrderBy`

An ordering clause for query results.

```typescript
interface OrderBy {
  /** Column to sort by. */
  field: string

  /** Sort direction. */
  direction: SortDirection
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
  aggregate(query: AggregateQuery): Promise<AggregateResult>

  /**
   * Executes a time-series query and returns bucketed data points.
   *
   * @param query - The time-series query definition.
   * @returns Ordered time-series points.
   */
  timeSeries(query: TimeSeriesQuery): Promise<TimeSeriesResult>

  /**
   * Exports query results in the specified format.
   *
   * @param query - The query to execute and export.
   * @param format - The desired output format.
   * @returns A Buffer containing the exported data.
   */
  export(query: AggregateQuery | TimeSeriesQuery, format: ExportFormat): Promise<Buffer>

  /**
   * Creates a scheduled report and returns its unique identifier.
   *
   * @param report - The scheduled report configuration.
   * @returns The schedule identifier.
   */
  schedule(report: ScheduledReport): Promise<string>

  /**
   * Cancels a previously scheduled report.
   *
   * @param scheduleId - The schedule identifier to cancel.
   */
  cancelSchedule(scheduleId: string): Promise<void>
}
```

#### `ScheduledReport`

Configuration for a scheduled report.

```typescript
interface ScheduledReport {
  /** Human-readable report name. */
  name: string

  /** The query to execute on schedule. */
  query: AggregateQuery | TimeSeriesQuery

  /** Output format for the scheduled report. */
  format: ExportFormat

  /** Cron expression defining the schedule. */
  schedule: string

  /** Email addresses to deliver the report to. */
  recipients?: string[]
}
```

#### `TimeSeriesPoint`

A single data point in a time series.

```typescript
interface TimeSeriesPoint {
  /** ISO 8601 date string for the bucket start. */
  date: string

  /** Aggregated values keyed by measure alias or field. */
  values: Record<string, number>
}
```

#### `TimeSeriesQuery`

Query definition for time-series reports.

```typescript
interface TimeSeriesQuery {
  /** Table or view to query. */
  table: string

  /** Date/timestamp column to bucket by. */
  dateField: string

  /** Time bucket granularity. */
  interval: TimeInterval

  /** Measures (aggregations) to compute per bucket. */
  measures: Measure[]

  /** WHERE clause filters. */
  filters?: Filter[]

  /** Start of the date range (inclusive). */
  startDate?: Date

  /** End of the date range (inclusive). */
  endDate?: Date
}
```

#### `TimeSeriesResult`

Result of a time-series query.

```typescript
interface TimeSeriesResult {
  /** Ordered data points. */
  points: TimeSeriesPoint[]

  /** The interval granularity used. */
  interval: string
}
```

### Types

#### `AggregateFunction`

Aggregate function applied to a measure field.

```typescript
type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countDistinct'
```

#### `ExportFormat`

Supported export formats.

```typescript
type ExportFormat = 'csv' | 'json' | 'xlsx'
```

#### `FilterOperator`

Filter operator for WHERE and HAVING clauses.

```typescript
type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'between'
  | 'like'
```

#### `SortDirection`

Sort direction for ORDER BY clauses.

```typescript
type SortDirection = 'asc' | 'desc'
```

#### `TimeInterval`

Time interval granularity for time-series queries.

```typescript
type TimeInterval = 'hour' | 'day' | 'week' | 'month' | 'year'
```

### Functions

#### `aggregate(query)`

Executes an aggregate query and returns grouped results.

```typescript
function aggregate(query: AggregateQuery): Promise<AggregateResult>
```

- `query` — The aggregate query definition.

**Returns:** Aggregated rows and total count.

#### `cancelSchedule(scheduleId)`

Cancels a previously scheduled report.

```typescript
function cancelSchedule(scheduleId: string): Promise<void>
```

- `scheduleId` — The schedule identifier to cancel.

**Returns:** A promise that resolves when the schedule has been cancelled.

#### `exportReport(query, format)`

Exports query results in the specified format.

```typescript
function exportReport(query: AggregateQuery | TimeSeriesQuery, format: ExportFormat): Promise<Buffer<ArrayBufferLike>>
```

- `query` — The query to execute and export.
- `format` — The desired output format.

**Returns:** A Buffer containing the exported data.

#### `getProvider()`

Retrieves the bonded reporting provider, throwing if none is configured.

```typescript
function getProvider(): ReportProvider
```

**Returns:** The bonded reporting provider.

#### `hasProvider()`

Checks whether a reporting provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a reporting provider is bonded.

#### `scheduleReport(report)`

Creates a scheduled report and returns its unique identifier.

```typescript
function scheduleReport(report: ScheduledReport): Promise<string>
```

- `report` — The scheduled report configuration.

**Returns:** The schedule identifier.

#### `setProvider(provider)`

Registers a reporting provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: ReportProvider): void
```

- `provider` — The reporting provider implementation to bond.

#### `timeSeries(query)`

Executes a time-series query and returns bucketed data points.

```typescript
function timeSeries(query: TimeSeriesQuery): Promise<TimeSeriesResult>
```

- `query` — The time-series query definition.

**Returns:** Ordered time-series points.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
