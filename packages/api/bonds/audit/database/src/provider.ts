/**
 * Database-backed implementation of `AuditProvider`.
 *
 * Persists audit entries using the abstract `DataStore` from
 * `@molecule/api-database`. Supports querying with filtering/pagination
 * and exporting records as CSV or JSON.
 *
 * @module
 */

import type {
  AuditEntry,
  AuditExportFormat,
  AuditProvider,
  AuditQuery,
  AuditRecord,
  PaginatedResult,
} from '@molecule/api-audit'
import type { FindManyOptions, WhereCondition } from '@molecule/api-database'
import { count, create, findMany } from '@molecule/api-database'

import type { DatabaseAuditConfig } from './types.js'

/** Default table name for audit records. */
const DEFAULT_TABLE = 'audit_log'

/** Database row shape for audit records. */
interface AuditRow {
  id: string
  actor: string
  action: string
  resource: string
  resource_id: string | null
  details: string | null
  ip: string | null
  user_agent: string | null
  timestamp: string
}

/**
 * Converts a database row into an `AuditRecord`.
 *
 * @param row - The raw database row.
 * @returns A normalized `AuditRecord`.
 */
const rowToRecord = (row: AuditRow): AuditRecord => {
  const record: AuditRecord = {
    id: row.id,
    actor: row.actor,
    action: row.action,
    resource: row.resource,
    timestamp: new Date(row.timestamp),
  }
  if (row.resource_id !== null) record.resourceId = row.resource_id
  if (row.details !== null) {
    record.details = JSON.parse(row.details) as Record<string, unknown>
  }
  if (row.ip !== null) record.ip = row.ip
  if (row.user_agent !== null) record.userAgent = row.user_agent
  return record
}

/**
 * Builds `WhereCondition` array and `FindManyOptions` from an `AuditQuery`.
 *
 * @param query - The audit query to convert.
 * @returns An object with `where` conditions and find options.
 */
const buildQueryOptions = (
  query: AuditQuery,
): { where: WhereCondition[]; options: FindManyOptions } => {
  const where: WhereCondition[] = []

  if (query.actor) where.push({ field: 'actor', operator: '=', value: query.actor })
  if (query.action) where.push({ field: 'action', operator: '=', value: query.action })
  if (query.resource) where.push({ field: 'resource', operator: '=', value: query.resource })
  if (query.resourceId) where.push({ field: 'resource_id', operator: '=', value: query.resourceId })
  if (query.startDate)
    where.push({ field: 'timestamp', operator: '>=', value: query.startDate.toISOString() })
  if (query.endDate)
    where.push({ field: 'timestamp', operator: '<=', value: query.endDate.toISOString() })

  const page = query.page ?? 1
  const perPage = query.perPage ?? 20
  const offset = (page - 1) * perPage

  const options: FindManyOptions = {
    where,
    orderBy: [{ field: 'timestamp', direction: 'desc' }],
    limit: perPage,
    offset,
  }

  return { where, options }
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
 * Creates a database-backed audit provider.
 *
 * @param config - Optional provider configuration.
 * @returns An `AuditProvider` backed by the bonded `DataStore`.
 */
export const createProvider = (config?: DatabaseAuditConfig): AuditProvider => {
  const tableName = config?.tableName ?? DEFAULT_TABLE

  return {
    async log(entry: AuditEntry): Promise<void> {
      const data: Record<string, unknown> = {
        id: crypto.randomUUID(),
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resourceId ?? null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ip: entry.ip ?? null,
        user_agent: entry.userAgent ?? null,
        timestamp: new Date().toISOString(),
      }
      await create(tableName, data)
    },

    async query(queryOptions: AuditQuery): Promise<PaginatedResult<AuditRecord>> {
      const { where, options } = buildQueryOptions(queryOptions)

      const page = queryOptions.page ?? 1
      const perPage = queryOptions.perPage ?? 20

      const [rows, total] = await Promise.all([
        findMany<AuditRow>(tableName, options),
        count(tableName, where),
      ])

      return {
        data: rows.map(rowToRecord),
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    },

    async export(queryOptions: AuditQuery, format: AuditExportFormat): Promise<Buffer> {
      // Fetch all matching records (no pagination limit)
      const where: WhereCondition[] = []
      if (queryOptions.actor)
        where.push({ field: 'actor', operator: '=', value: queryOptions.actor })
      if (queryOptions.action)
        where.push({ field: 'action', operator: '=', value: queryOptions.action })
      if (queryOptions.resource)
        where.push({ field: 'resource', operator: '=', value: queryOptions.resource })
      if (queryOptions.resourceId)
        where.push({ field: 'resource_id', operator: '=', value: queryOptions.resourceId })
      if (queryOptions.startDate)
        where.push({
          field: 'timestamp',
          operator: '>=',
          value: queryOptions.startDate.toISOString(),
        })
      if (queryOptions.endDate)
        where.push({
          field: 'timestamp',
          operator: '<=',
          value: queryOptions.endDate.toISOString(),
        })

      const rows = await findMany<AuditRow>(tableName, {
        where,
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
      })
      const records = rows.map(rowToRecord)

      if (format === 'json') {
        return Buffer.from(JSON.stringify(records, null, 2), 'utf-8')
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

      for (const record of records) {
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
 * Default database audit provider instance. Lazily initializes on first
 * property access with default options.
 */
export const provider: AuditProvider = new Proxy({} as AuditProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
