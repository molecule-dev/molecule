/**
 * Database implementation of ReportProvider.
 *
 * Uses the bonded `@molecule/api-database` pool for SQL-based aggregate
 * and time-series reporting. Exports are generated natively for CSV and
 * JSON, and as XML Spreadsheet 2003 for XLSX (compatible with Excel
 * and LibreOffice without external dependencies).
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import { query } from '@molecule/api-database'
import type {
  AggregateQuery,
  AggregateResult,
  ExportFormat,
  ScheduledReport,
  TimeSeriesQuery,
  TimeSeriesResult,
} from '@molecule/api-reporting'

import {
  buildAggregateCountSQL,
  buildAggregateSQL,
  buildTimeSeriesSQL,
  sanitizeIdentifier,
} from './query-builder.js'
import { isScheduleDue } from './scheduling.js'
import type {
  DatabaseReportingOptions,
  DatabaseReportProvider,
  DeliverReport,
  RunDueReportsOptions,
  RunDueReportsResult,
  StoredSchedule,
} from './types.js'

/**
 * Raw row shape read back from the schedules table.
 */
interface ScheduleRow {
  id: string
  name: string
  query: unknown
  format: string
  schedule: string
  recipients: unknown
  created_at: unknown
  last_run_at: unknown
}

/**
 * Returns the internal schedules table name.
 *
 * @param prefix - Table prefix.
 * @returns Sanitized table name.
 */
const schedulesTable = (prefix: string): string => `${sanitizeIdentifier(prefix)}schedules`

/**
 * Ensures the internal schedules table exists (creates if missing).
 *
 * @param prefix - Table prefix.
 */
const ensureSchedulesTable = async (prefix: string): Promise<void> => {
  const table = schedulesTable(prefix)
  await query(
    `CREATE TABLE IF NOT EXISTS "${table}" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "query" JSONB NOT NULL,
      "format" TEXT NOT NULL,
      "schedule" TEXT NOT NULL,
      "recipients" JSONB,
      "created_at" TIMESTAMPTZ DEFAULT NOW(),
      "last_run_at" TIMESTAMPTZ
    )`,
  )
  // Forward-safe: a schedules table created by a pre-runDueReports() build of
  // this bond predates the last_run_at column the runner uses to avoid
  // re-delivering within the same minute. ADD COLUMN IF NOT EXISTS is an
  // idempotent no-op once the column exists.
  await query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "last_run_at" TIMESTAMPTZ`)
}

/**
 * Parses a JSONB column value that the driver may hand back either as a parsed
 * object (node-postgres) or as a raw string, falling back when absent/corrupt.
 *
 * @param value - The raw column value.
 * @param fallback - Value to use when null/undefined or unparseable.
 * @returns The parsed value or `fallback`.
 */
const parseJsonColumn = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch (_error) {
      // A single malformed stored row must not break listing/running the rest;
      // treat it as the empty/default value rather than throwing.
      return fallback
    }
  }
  return value as T
}

/**
 * Normalizes a timestamp column (Date or string) to an ISO 8601 string.
 *
 * @param value - The raw column value.
 * @returns The ISO string, or `null` when absent.
 */
const toIsoOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

/**
 * Maps a raw schedules-table row into a normalized {@link StoredSchedule}.
 *
 * @param row - The raw row.
 * @returns The normalized schedule.
 */
const toStoredSchedule = (row: ScheduleRow): StoredSchedule => ({
  id: String(row.id),
  name: String(row.name),
  query: parseJsonColumn<AggregateQuery | TimeSeriesQuery>(row.query, {
    table: '',
    measures: [],
  }),
  format: row.format as ExportFormat,
  schedule: String(row.schedule),
  recipients: parseJsonColumn<string[]>(row.recipients, []),
  createdAt: toIsoOrNull(row.created_at),
  lastRunAt: toIsoOrNull(row.last_run_at),
})

/**
 * Detects whether a query is a TimeSeriesQuery by checking for `dateField`.
 *
 * @param q - The query to check.
 * @returns `true` if the query has a `dateField` property.
 */
const isTimeSeriesQuery = (q: AggregateQuery | TimeSeriesQuery): q is TimeSeriesQuery => {
  return 'dateField' in q
}

/**
 * Converts rows to CSV format with proper escaping.
 *
 * @param rows - Data rows to convert.
 * @returns Buffer containing the CSV data.
 */
const toCSV = (rows: Record<string, unknown>[]): Buffer => {
  if (rows.length === 0) return Buffer.from('')

  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]

  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    })
    lines.push(values.join(','))
  }

  return Buffer.from(lines.join('\n'))
}

/**
 * Converts rows to a JSON Buffer.
 *
 * @param rows - Data rows to convert.
 * @returns Buffer containing pretty-printed JSON.
 */
const toJSON = (rows: Record<string, unknown>[]): Buffer => {
  return Buffer.from(JSON.stringify(rows, null, 2))
}

/**
 * Escapes a value for safe inclusion in XML.
 *
 * @param val - The value to escape.
 * @returns XML-safe string.
 */
const escapeXml = (val: unknown): string => {
  const str = val === null || val === undefined ? '' : String(val)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Converts rows to XML Spreadsheet 2003 format (opens in Excel/LibreOffice).
 *
 * @param rows - Data rows to convert.
 * @returns Buffer containing the XML spreadsheet.
 */
const toXLSX = (rows: Record<string, unknown>[]): Buffer => {
  if (rows.length === 0) {
    return Buffer.from(
      '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table></Table></Worksheet></Workbook>',
    )
  }

  const headers = Object.keys(rows[0])

  const headerRow = `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`

  const dataRows = rows.map((row) => {
    const cells = headers.map((h) => {
      const val = row[h]
      const type = typeof val === 'number' ? 'Number' : 'String'
      return `<Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`
    })
    return `<Row>${cells.join('')}</Row>`
  })

  const xml = [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="Report">',
    '<Table>',
    headerRow,
    ...dataRows,
    '</Table>',
    '</Worksheet>',
    '</Workbook>',
  ].join('\n')

  return Buffer.from(xml)
}

/**
 * Formats data rows into the requested export format.
 *
 * @param rows - Data rows to format.
 * @param format - Target export format.
 * @returns Buffer containing the formatted data.
 */
const formatExport = (rows: Record<string, unknown>[], format: ExportFormat): Buffer => {
  switch (format) {
    case 'csv':
      return toCSV(rows)
    case 'json':
      return toJSON(rows)
    case 'xlsx':
      return toXLSX(rows)
  }
}

/**
 * Creates a database-backed reporting provider instance.
 *
 * Uses the bonded `@molecule/api-database` pool for all queries. Aggregate
 * and time-series reports are translated to parameterized SQL. Scheduled
 * reports are persisted to a database table; `runDueReports()` generates the
 * due ones and hands each to an injected delivery callback (see the module docs
 * for the email-bond wiring pattern).
 *
 * @param options - Provider configuration options.
 * @returns A fully configured `DatabaseReportProvider` implementation.
 */
export const createProvider = (options?: DatabaseReportingOptions): DatabaseReportProvider => {
  const tablePrefix = options?.tablePrefix ?? '_reporting_'
  const maxRows = options?.maxRows ?? 10000

  const executeAggregate = async (q: AggregateQuery): Promise<AggregateResult> => {
    const dataQuery = buildAggregateSQL(q, maxRows)
    const countQuery = buildAggregateCountSQL(q)

    const [dataResult, countResult] = await Promise.all([
      query<Record<string, unknown>>(dataQuery.sql, dataQuery.params),
      query<{ total: string }>(countQuery.sql, countQuery.params),
    ])

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    }
  }

  const executeTimeSeries = async (q: TimeSeriesQuery): Promise<TimeSeriesResult> => {
    const built = buildTimeSeriesSQL(q)
    const result = await query<Record<string, unknown>>(built.sql, built.params)

    const points = result.rows.map((row) => {
      const { date, ...values } = row
      const dateStr = date instanceof Date ? date.toISOString() : String(date)
      const numericValues: Record<string, number> = {}
      for (const [key, val] of Object.entries(values)) {
        numericValues[key] = typeof val === 'number' ? val : Number(val)
      }
      return { date: dateStr, values: numericValues }
    })

    return { points, interval: q.interval }
  }

  const executeExport = async (
    q: AggregateQuery | TimeSeriesQuery,
    format: ExportFormat,
  ): Promise<Buffer> => {
    if (isTimeSeriesQuery(q)) {
      const result = await executeTimeSeries(q)
      const rows = result.points.map((p) => ({
        date: p.date,
        ...p.values,
      }))
      return formatExport(rows, format)
    }

    const dataQuery = buildAggregateSQL(q, maxRows)
    const result = await query<Record<string, unknown>>(dataQuery.sql, dataQuery.params)
    return formatExport(result.rows, format)
  }

  const loadSchedules = async (): Promise<StoredSchedule[]> => {
    await ensureSchedulesTable(tablePrefix)
    const table = schedulesTable(tablePrefix)
    const result = await query<ScheduleRow>(
      `SELECT "id", "name", "query", "format", "schedule", "recipients", "created_at", "last_run_at"
       FROM "${table}" ORDER BY "created_at" ASC`,
    )
    return result.rows.map(toStoredSchedule)
  }

  return {
    aggregate: executeAggregate,

    timeSeries: executeTimeSeries,

    export: executeExport,

    schedule: async (report: ScheduledReport): Promise<string> => {
      await ensureSchedulesTable(tablePrefix)
      const id = randomUUID()
      const table = schedulesTable(tablePrefix)

      await query(
        `INSERT INTO "${table}" ("id", "name", "query", "format", "schedule", "recipients")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          report.name,
          JSON.stringify(report.query),
          report.format,
          report.schedule,
          report.recipients ? JSON.stringify(report.recipients) : null,
        ],
      )

      return id
    },

    cancelSchedule: async (scheduleId: string): Promise<void> => {
      await ensureSchedulesTable(tablePrefix)
      const table = schedulesTable(tablePrefix)
      await query(`DELETE FROM "${table}" WHERE "id" = $1`, [scheduleId])
    },

    listSchedules: async (): Promise<StoredSchedule[]> => {
      return loadSchedules()
    },

    runDueReports: async (
      deliver: DeliverReport,
      runOptions?: RunDueReportsOptions,
    ): Promise<RunDueReportsResult> => {
      const now = runOptions?.now ?? new Date()
      const isDue = runOptions?.isDue ?? isScheduleDue
      const table = schedulesTable(tablePrefix)
      const schedules = await loadSchedules()

      const result: RunDueReportsResult = { delivered: [], skipped: [], failed: [] }

      for (const schedule of schedules) {
        if (!isDue(schedule, now)) {
          result.skipped.push(schedule.id)
          continue
        }

        try {
          const data = await executeExport(schedule.query, schedule.format)
          await deliver({
            schedule,
            data,
            recipients: schedule.recipients,
            format: schedule.format,
          })
          await query(`UPDATE "${table}" SET "last_run_at" = $1 WHERE "id" = $2`, [
            now.toISOString(),
            schedule.id,
          ])
          result.delivered.push(schedule.id)
        } catch (error) {
          // One report's generation/delivery failing must not abort the rest of
          // the pass. Surface it in `failed` (returned to the caller) instead of
          // throwing, and leave last_run_at unadvanced so the next run retries.
          result.failed.push({
            id: schedule.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      return result
    },
  }
}

let _provider: DatabaseReportProvider | undefined

/**
 * Default lazily-initialized database reporting provider.
 * Uses the bonded database pool for queries.
 */
export const provider: DatabaseReportProvider = new Proxy({} as DatabaseReportProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
