/**
 * Type definitions for the database reporting provider.
 *
 * @module
 */

export type {
  AggregateFunction,
  AggregateQuery,
  AggregateResult,
  ExportFormat,
  Filter,
  FilterOperator,
  Measure,
  OrderBy,
  ReportProvider,
  ScheduledReport,
  SortDirection,
  TimeInterval,
  TimeSeriesPoint,
  TimeSeriesQuery,
  TimeSeriesResult,
} from '@molecule/api-reporting'

/**
 * Configuration options for the database reporting provider.
 */
export interface DatabaseReportingOptions {
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
