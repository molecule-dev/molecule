/**
 * CSV implementation of the ImportExportProvider interface.
 *
 * Uses the bonded `@molecule/api-database` DataStore for reading/writing
 * rows and provides CSV/JSON/Excel import and export through pure
 * TypeScript parsing and formatting (no native dependencies).
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import type { FindManyOptions, WhereCondition } from '@molecule/api-database'
import { create, findMany } from '@molecule/api-database'
import type {
  ExportQuery,
  ImportExportProvider,
  ImportJobStatus,
  ImportOptions,
  ImportProgress,
  ImportResult,
} from '@molecule/api-import-export'

import { formatCSV, formatExcel, parseCSV } from './csv.js'
import type { CsvProviderOptions } from './types.js'

/** In-memory job status store. */
const jobs = new Map<string, ImportJobStatus>()

/**
 * Converts an `ExportQuery` filter to a DataStore `WhereCondition`.
 *
 * @param filter - The export query filter to convert.
 * @param filter.field - The field name to filter on.
 * @param filter.operator - The comparison operator string.
 * @param filter.value - The value to compare against.
 * @returns A DataStore WhereCondition.
 */
const toWhereCondition = (filter: {
  field: string
  operator: string
  value: unknown
}): WhereCondition => {
  const operatorMap: Record<string, WhereCondition['operator']> = {
    eq: '=',
    neq: '!=',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    in: 'in',
    notIn: 'not_in',
    like: 'like',
  }
  return {
    field: filter.field,
    operator: operatorMap[filter.operator] ?? '=',
    value: filter.value,
  }
}

/**
 * Builds `FindManyOptions` from an `ExportQuery`.
 *
 * @param query - The export query to convert.
 * @param maxRows - Maximum rows to return.
 * @returns DataStore FindManyOptions.
 */
const buildFindOptions = (query: ExportQuery | undefined, maxRows: number): FindManyOptions => {
  const options: FindManyOptions = {}

  if (query?.filters?.length) {
    options.where = query.filters.map(toWhereCondition)
  }

  if (query?.columns?.length) {
    options.select = query.columns
  }

  if (query?.orderBy?.length) {
    options.orderBy = query.orderBy
  }

  options.limit = query?.limit ?? maxRows

  return options
}

/**
 * Applies column mapping to a row, renaming keys per the provided mapping.
 *
 * @param row - The source row.
 * @param mapping - Source-to-destination column name map.
 * @returns Row with renamed keys.
 */
const applyMapping = (
  row: Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, unknown> => {
  const mapped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const destKey = mapping[key] ?? key
    mapped[destKey] = value
  }
  return mapped
}

/**
 * Processes rows in batches, inserting them into the database via DataStore.
 *
 * @param table - Target table name.
 * @param rows - Rows to import.
 * @param options - Import options.
 * @param jobId - The job identifier.
 * @returns The import result.
 */
const processImport = async (
  table: string,
  rows: Record<string, unknown>[],
  options: ImportOptions | undefined,
  jobId: string,
): Promise<ImportResult> => {
  const batchSize = options?.batchSize ?? 1000
  const mapping = options?.mapping
  const validateRow = options?.validateRow
  const onProgress = options?.onProgress
  const skipDuplicates = options?.skipDuplicates ?? false

  let importedRows = 0
  let skippedRows = 0
  const errors: { row: number; field?: string; message: string }[] = []
  const totalRows = rows.length

  for (let i = 0; i < totalRows; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)

    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j + 1 // 1-based
      let row = batch[j]

      if (mapping) {
        row = applyMapping(row, mapping)
      }

      if (validateRow && !validateRow(row)) {
        skippedRows++
        continue
      }

      try {
        await create(table, row)
        importedRows++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (skipDuplicates && isDuplicateError(message)) {
          skippedRows++
        } else {
          errors.push({ row: rowIndex, message })
          skippedRows++
        }
      }
    }

    if (onProgress) {
      const processed = Math.min(i + batchSize, totalRows)
      const progress: ImportProgress = {
        processed,
        total: totalRows,
        percentage: Math.round((processed / totalRows) * 100),
      }
      onProgress(progress)
    }
  }

  return { jobId, totalRows, importedRows, skippedRows, errors }
}

/**
 * Checks whether an error message indicates a duplicate key violation.
 *
 * @param message - The error message to check.
 * @returns `true` if the error is a duplicate key violation.
 */
const isDuplicateError = (message: string): boolean => {
  const lower = message.toLowerCase()
  return (
    lower.includes('duplicate key') ||
    lower.includes('unique constraint') ||
    lower.includes('unique_violation') ||
    lower.includes('already exists')
  )
}

/**
 * Reads a ReadableStream into a string.
 *
 * @param stream - The ReadableStream to consume.
 * @returns The full string content.
 */
const streamToString = async (stream: ReadableStream): Promise<string> => {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }

  result += decoder.decode()
  return result
}

/**
 * Creates a CSV import/export provider instance.
 *
 * Uses the bonded `@molecule/api-database` DataStore for all database
 * operations. CSV parsing/formatting is done in pure TypeScript with
 * no native dependencies.
 *
 * @param options - Provider configuration options.
 * @returns A fully configured `ImportExportProvider` implementation.
 */
export const createProvider = (options?: CsvProviderOptions): ImportExportProvider => {
  const delimiter = options?.delimiter ?? ','
  const defaultBatchSize = options?.defaultBatchSize ?? 1000
  const maxExportRows = options?.maxExportRows ?? 50000

  return {
    importCSV: async (
      table: string,
      data: Buffer | ReadableStream,
      importOptions?: ImportOptions,
    ): Promise<ImportResult> => {
      const jobId = randomUUID()
      jobs.set(jobId, { jobId, status: 'processing' })

      try {
        const text =
          data instanceof Buffer
            ? data.toString('utf-8')
            : await streamToString(data as ReadableStream)
        const rows = parseCSV(text, delimiter)
        const mergedOptions = {
          ...importOptions,
          batchSize: importOptions?.batchSize ?? defaultBatchSize,
        }
        const result = await processImport(table, rows, mergedOptions, jobId)

        jobs.set(jobId, { jobId, status: 'completed', result })
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        jobs.set(jobId, { jobId, status: 'failed', error: message })
        throw err
      }
    },

    importJSON: async (
      table: string,
      data: unknown[],
      importOptions?: ImportOptions,
    ): Promise<ImportResult> => {
      const jobId = randomUUID()
      jobs.set(jobId, { jobId, status: 'processing' })

      try {
        const rows = data.map((item) =>
          typeof item === 'object' && item !== null ? item : { value: item },
        ) as Record<string, unknown>[]
        const mergedOptions = {
          ...importOptions,
          batchSize: importOptions?.batchSize ?? defaultBatchSize,
        }
        const result = await processImport(table, rows, mergedOptions, jobId)

        jobs.set(jobId, { jobId, status: 'completed', result })
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        jobs.set(jobId, { jobId, status: 'failed', error: message })
        throw err
      }
    },

    exportCSV: async (table: string, query?: ExportQuery): Promise<Buffer> => {
      const options2 = buildFindOptions(query, maxExportRows)
      const rows = await findMany<Record<string, unknown>>(table, options2)
      return Buffer.from(formatCSV(rows, query?.columns, delimiter))
    },

    exportJSON: async (table: string, query?: ExportQuery): Promise<unknown[]> => {
      const options2 = buildFindOptions(query, maxExportRows)
      return findMany(table, options2)
    },

    exportExcel: async (table: string, query?: ExportQuery): Promise<Buffer> => {
      const options2 = buildFindOptions(query, maxExportRows)
      const rows = await findMany<Record<string, unknown>>(table, options2)
      return Buffer.from(formatExcel(rows, query?.columns))
    },

    getJobStatus: async (jobId: string): Promise<ImportJobStatus> => {
      const status = jobs.get(jobId)
      if (!status) {
        return { jobId, status: 'pending' }
      }
      return status
    },
  }
}

let _provider: ImportExportProvider | undefined

/**
 * Default lazily-initialized CSV import/export provider.
 * Uses the bonded DataStore for database operations.
 */
export const provider: ImportExportProvider = new Proxy({} as ImportExportProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
