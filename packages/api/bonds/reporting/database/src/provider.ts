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
  ReportProvider,
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
import type { DatabaseReportingOptions } from './types.js'

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
      "created_at" TIMESTAMPTZ DEFAULT NOW()
    )`,
  )
}

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
 * reports are persisted to a database table for external schedulers to consume.
 *
 * @param options - Provider configuration options.
 * @returns A fully configured `ReportProvider` implementation.
 */
export const createProvider = (options?: DatabaseReportingOptions): ReportProvider => {
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

  return {
    aggregate: executeAggregate,

    timeSeries: executeTimeSeries,

    export: async (q: AggregateQuery | TimeSeriesQuery, format: ExportFormat): Promise<Buffer> => {
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
    },

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
  }
}

let _provider: ReportProvider | undefined

/**
 * Default lazily-initialized database reporting provider.
 * Uses the bonded database pool for queries.
 */
export const provider: ReportProvider = new Proxy({} as ReportProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
