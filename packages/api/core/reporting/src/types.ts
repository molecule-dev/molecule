/**
 * Type definitions for reporting core interface.
 *
 * @module
 */

/**
 * Aggregate function applied to a measure field.
 */
export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'countDistinct'

/**
 * A measure to compute during aggregation.
 */
export interface Measure {
  /** Column or expression to aggregate. */
  field: string

  /** Aggregate function to apply. */
  function: AggregateFunction

  /** Optional alias for the result column. */
  alias?: string
}

/**
 * Filter operator for WHERE and HAVING clauses.
 */
export type FilterOperator =
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

/**
 * A filter condition for queries.
 */
export interface Filter {
  /** Column to filter on. */
  field: string

  /** Comparison operator. */
  operator: FilterOperator

  /** Value or values to compare against. */
  value: unknown
}

/**
 * Sort direction for ORDER BY clauses.
 */
export type SortDirection = 'asc' | 'desc'

/**
 * An ordering clause for query results.
 */
export interface OrderBy {
  /** Column to sort by. */
  field: string

  /** Sort direction. */
  direction: SortDirection
}

/**
 * Query definition for aggregate reports.
 */
export interface AggregateQuery {
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

/**
 * Result of an aggregate query.
 */
export interface AggregateResult {
  /** Aggregated rows. */
  rows: Record<string, unknown>[]

  /** Total number of matching rows (before LIMIT). */
  total: number
}

/**
 * Time interval granularity for time-series queries.
 */
export type TimeInterval = 'hour' | 'day' | 'week' | 'month' | 'year'

/**
 * Query definition for time-series reports.
 */
export interface TimeSeriesQuery {
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

/**
 * A single data point in a time series.
 */
export interface TimeSeriesPoint {
  /** ISO 8601 date string for the bucket start. */
  date: string

  /** Aggregated values keyed by measure alias or field. */
  values: Record<string, number>
}

/**
 * Result of a time-series query.
 */
export interface TimeSeriesResult {
  /** Ordered data points. */
  points: TimeSeriesPoint[]

  /** The interval granularity used. */
  interval: string
}

/**
 * Supported export formats.
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx'

/**
 * Configuration for a scheduled report.
 */
export interface ScheduledReport {
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

/**
 * Reporting provider interface.
 *
 * All reporting providers must implement this interface.
 */
export interface ReportProvider {
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
