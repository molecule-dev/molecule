/**
 * Type definitions for the database reporting provider.
 *
 * @module
 */

import type {
  AggregateQuery,
  ExportFormat,
  ReportProvider,
  TimeSeriesQuery,
} from '@molecule/api-reporting'

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

/**
 * A scheduled report as persisted by {@link ReportProvider.schedule} and read
 * back by {@link DatabaseReportProvider.listSchedules} /
 * {@link DatabaseReportProvider.runDueReports}. Unlike the write-side
 * `ScheduledReport`, this carries the generated `id`, a normalized (never
 * `undefined`) `recipients` array, and the persistence timestamps.
 */
export interface StoredSchedule {
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

/**
 * A generated report ready for delivery, handed to a {@link DeliverReport}
 * callback by {@link DatabaseReportProvider.runDueReports}.
 */
export interface ReportDelivery {
  /** The schedule that produced this report. */
  schedule: StoredSchedule

  /** The generated export payload (e.g. an email attachment body). */
  data: Buffer

  /** Recipients declared on the schedule (may be empty). */
  recipients: string[]

  /** The format `data` was generated in (drives filename/MIME on the caller side). */
  format: ExportFormat
}

/**
 * Delivery callback invoked once per due report. The caller wires this to its
 * own channel — typically `sendMail()` from `@molecule/api-emails` with `data`
 * as an attachment. This bond never sends anything itself, keeping delivery
 * swappable. Throwing marks the report failed and leaves `lastRunAt` unadvanced
 * so the next run retries it.
 */
export type DeliverReport = (delivery: ReportDelivery) => Promise<void>

/**
 * Options for {@link DatabaseReportProvider.runDueReports}.
 */
export interface RunDueReportsOptions {
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

/**
 * Outcome of a {@link DatabaseReportProvider.runDueReports} pass.
 */
export interface RunDueReportsResult {
  /** Ids of schedules generated and handed to `deliver` successfully. */
  delivered: string[]

  /** Ids of schedules that were not due this pass. */
  skipped: string[]

  /** Schedules whose generation or delivery threw, with the error message. */
  failed: { id: string; error: string }[]
}

/**
 * The database reporting bond's provider — the core {@link ReportProvider} plus
 * the persistence-backed delivery runner. `schedule()` only records intent; the
 * two methods below turn that persisted intent into actual delivery, which the
 * core interface intentionally leaves to the bond (a cloud-analytics reporting
 * bond would deliver through its own service instead).
 */
export interface DatabaseReportProvider extends ReportProvider {
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
