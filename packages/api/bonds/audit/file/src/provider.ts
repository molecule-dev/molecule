/**
 * File-based implementation of `AuditProvider`.
 *
 * Stores audit entries as newline-delimited JSON (NDJSON) files on disk.
 * Supports log file rotation, querying with filtering/pagination, and
 * exporting records as CSV or JSON. Ideal for development, testing, or
 * single-instance deployments without a database dependency.
 *
 * @module
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type {
  AuditEntry,
  AuditExportFormat,
  AuditProvider,
  AuditQuery,
  AuditRecord,
  PaginatedResult,
} from '@molecule/api-audit'

import type { FileAuditConfig } from './types.js'

/** Default directory for audit log files. */
const DEFAULT_DIRECTORY = './audit-logs'

/** Default max file size in bytes (10 MB). */
const DEFAULT_MAX_FILE_SIZE = 10_485_760

/** Default file name prefix. */
const DEFAULT_PREFIX = 'audit'

/**
 * Checks whether an audit record matches the given query filters.
 *
 * @param record - The audit record to test.
 * @param query - The query filters.
 * @returns `true` if the record matches all specified filters.
 */
const matchesQuery = (record: AuditRecord, query: AuditQuery): boolean => {
  if (query.actor && record.actor !== query.actor) return false
  if (query.action && record.action !== query.action) return false
  if (query.resource && record.resource !== query.resource) return false
  if (query.resourceId && record.resourceId !== query.resourceId) return false
  if (query.startDate && record.timestamp < query.startDate) return false
  if (query.endDate && record.timestamp > query.endDate) return false
  return true
}

/**
 * Escapes a string value for safe inclusion in a CSV field.
 *
 * @param value - The value to escape.
 * @returns The escaped CSV field string.
 */
const escapeCsv = (value: string): string => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Serialized JSON shape for an audit record stored on disk.
 */
interface SerializedRecord {
  id: string
  actor: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
  timestamp: string
}

/**
 * Deserializes a JSON object from disk into an `AuditRecord`.
 *
 * @param raw - The serialized record.
 * @returns The deserialized `AuditRecord`.
 */
const deserialize = (raw: SerializedRecord): AuditRecord => {
  return {
    ...raw,
    timestamp: new Date(raw.timestamp),
  }
}

/**
 * Creates a file-based audit provider.
 *
 * @param config - Optional provider configuration.
 * @returns An `AuditProvider` backed by NDJSON files on disk.
 */
export const createProvider = (config?: FileAuditConfig): AuditProvider => {
  const directory = config?.directory ?? DEFAULT_DIRECTORY
  const maxFileSize = config?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
  const filePrefix = config?.filePrefix ?? DEFAULT_PREFIX

  /**
   * Returns the path for the current log file.
   *
   * @returns The path to the current log file.
   */
  const getCurrentFilePath = (): string => {
    const date = new Date().toISOString().slice(0, 10)
    return join(directory, `${filePrefix}-${date}.ndjson`)
  }

  /**
   * Determines the file path to write the next entry to, rotating
   * if the current file exceeds `maxFileSize`.
   *
   * @returns The file path to append to.
   */
  const getWriteFilePath = async (): Promise<string> => {
    const filePath = getCurrentFilePath()
    try {
      const stats = await stat(filePath)
      if (stats.size >= maxFileSize) {
        const timestamp = Date.now()
        return join(
          directory,
          `${filePrefix}-${new Date().toISOString().slice(0, 10)}-${timestamp}.ndjson`,
        )
      }
    } catch {
      // File doesn't exist yet — use the default path
    }
    return filePath
  }

  /**
   * Lists all NDJSON audit log files in the directory, sorted newest first.
   *
   * @returns Array of full file paths.
   */
  const listLogFiles = async (): Promise<string[]> => {
    try {
      const entries = await readdir(directory)
      const logFiles = entries
        .filter((f) => f.startsWith(filePrefix) && f.endsWith('.ndjson'))
        .sort()
        .reverse()
      return logFiles.map((f) => join(directory, f))
    } catch {
      return []
    }
  }

  /**
   * Reads all records from all log files matching the query.
   *
   * @param query - The query filters.
   * @returns Array of matching audit records sorted newest first.
   */
  const readAllRecords = async (query: AuditQuery): Promise<AuditRecord[]> => {
    const files = await listLogFiles()
    const records: AuditRecord[] = []

    for (const filePath of files) {
      try {
        const content = await readFile(filePath, 'utf-8')
        const lines = content.trim().split('\n')
        for (const line of lines) {
          if (!line) continue
          const raw = JSON.parse(line) as SerializedRecord
          const record = deserialize(raw)
          if (matchesQuery(record, query)) {
            records.push(record)
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    // Sort newest first
    records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return records
  }

  return {
    async log(entry: AuditEntry): Promise<void> {
      const filePath = await getWriteFilePath()
      const record: SerializedRecord = {
        id: crypto.randomUUID(),
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        ...(entry.resourceId !== undefined && { resourceId: entry.resourceId }),
        ...(entry.details !== undefined && { details: entry.details }),
        ...(entry.ip !== undefined && { ip: entry.ip }),
        ...(entry.userAgent !== undefined && { userAgent: entry.userAgent }),
        timestamp: new Date().toISOString(),
      }
      const line = JSON.stringify(record) + '\n'

      // Append to the file (create if missing)
      let existing = ''
      try {
        existing = await readFile(filePath, 'utf-8')
      } catch {
        // File doesn't exist yet
      }
      await writeFile(filePath, existing + line, 'utf-8')
    },

    async query(queryOptions: AuditQuery): Promise<PaginatedResult<AuditRecord>> {
      const page = queryOptions.page ?? 1
      const perPage = queryOptions.perPage ?? 20

      const allRecords = await readAllRecords(queryOptions)
      const total = allRecords.length
      const offset = (page - 1) * perPage
      const data = allRecords.slice(offset, offset + perPage)

      return {
        data,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    },

    async export(queryOptions: AuditQuery, format: AuditExportFormat): Promise<Buffer> {
      const allRecords = await readAllRecords(queryOptions)

      if (format === 'json') {
        return Buffer.from(JSON.stringify(allRecords, null, 2), 'utf-8')
      }

      // CSV format
      const headers = [
        'id',
        'actor',
        'action',
        'resource',
        'resourceId',
        'details',
        'ip',
        'userAgent',
        'timestamp',
      ]
      const lines = [headers.join(',')]

      for (const record of allRecords) {
        const row = [
          escapeCsv(record.id),
          escapeCsv(record.actor),
          escapeCsv(record.action),
          escapeCsv(record.resource),
          escapeCsv(record.resourceId ?? ''),
          escapeCsv(record.details ? JSON.stringify(record.details) : ''),
          escapeCsv(record.ip ?? ''),
          escapeCsv(record.userAgent ?? ''),
          escapeCsv(record.timestamp.toISOString()),
        ]
        lines.push(row.join(','))
      }

      return Buffer.from(lines.join('\n'), 'utf-8')
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: AuditProvider | null = null

/**
 * Default file audit provider instance. Lazily initializes on first
 * property access with default options.
 */
export const provider: AuditProvider = new Proxy({} as AuditProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
